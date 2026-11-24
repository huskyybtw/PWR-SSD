import { GoogleGenAI, type Schema } from "@google/genai";

/**
 * Single entry point for every Gemini call in the app (receipts + statements).
 *
 * The free Gemini tier frequently answers 503 "model overloaded" / 429, so every
 * request is retried with exponential backoff. The user is only told about an
 * error once all attempts have failed.
 */

export const GEMINI_MODEL = "gemini-3.8-flash";
/** Number of retries after the first attempt (so 1 + MAX_RETRIES requests in total). */
export const MAX_RETRIES = 5;
export const BASE_DELAY_MS = 2000;
export const MAX_DELAY_MS = 30000;
export const REQUEST_TIMEOUT_MS = 60000;

export type GeminiProgress =
  | { stage: "request"; attempt: number; maxAttempts: number }
  | {
      stage: "retry";
      attempt: number;
      maxAttempts: number;
      delayMs: number;
      reason: string;
    };

export class GeminiUnavailableError extends Error {
  constructor(
    message: string,
    public readonly attempts: number,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "GeminiUnavailableError";
  }
}

export class GeminiConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeminiConfigError";
  }
}

/** The response could not be turned into the expected JSON. Retryable. */
class GeminiInvalidResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeminiInvalidResponseError";
  }
}

class GeminiTimeoutError extends Error {
  constructor() {
    super(`No answer within ${REQUEST_TIMEOUT_MS / 1000}s.`);
    this.name = "GeminiTimeoutError";
  }
}

let client: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (client) return client;
  const apiKey = (process.env.EXPO_PUBLIC_GEMINI_API_KEY || "").trim();
  if (!apiKey) {
    throw new GeminiConfigError(
      "Document analysis is not configured (missing EXPO_PUBLIC_GEMINI_API_KEY in app/mobile/.env).",
    );
  }
  client = new GoogleGenAI({ apiKey });
  return client;
}

/** For tests. */
export function __setGeminiClientForTests(value: GoogleGenAI | null) {
  client = value;
}

function getStatus(error: any): number | undefined {
  if (typeof error?.status === "number") return error.status;
  if (typeof error?.code === "number") return error.code;
  const match = /\b(4\d\d|5\d\d)\b/.exec(String(error?.message ?? ""));
  return match ? Number(match[1]) : undefined;
}

export function isRetryableError(error: unknown): boolean {
  if (error instanceof GeminiInvalidResponseError) return true;
  if (error instanceof GeminiTimeoutError) return true;
  if (error instanceof GeminiConfigError) return false;

  const status = getStatus(error);
  if (status !== undefined) {
    return status === 408 || status === 429 || status >= 500;
  }

  const message = String((error as any)?.message ?? error).toLowerCase();
  return [
    "unavailable",
    "overloaded",
    "resource_exhausted",
    "deadline",
    "network",
    "fetch",
    "timeout",
    "timed out",
    "socket",
    "econnreset",
  ].some((needle) => message.includes(needle));
}

/** Reads `retryDelay: "12s"` from a 429 response body when Google provides it. */
function getServerRetryDelayMs(error: unknown): number | undefined {
  const match = /retryDelay"?\s*[:=]\s*"?(\d+(?:\.\d+)?)s/i.exec(
    String((error as any)?.message ?? ""),
  );
  return match ? Math.ceil(Number(match[1]) * 1000) : undefined;
}

export function computeBackoffMs(retryNumber: number, error?: unknown): number {
  const serverDelay = error ? getServerRetryDelayMs(error) : undefined;
  if (serverDelay !== undefined) return Math.min(serverDelay, MAX_DELAY_MS);
  const exponential = BASE_DELAY_MS * 2 ** (retryNumber - 1);
  const jitter = Math.random() * 500;
  return Math.min(exponential + jitter, MAX_DELAY_MS);
}

function describeError(error: unknown): string {
  const status = getStatus(error);
  if (status === 503) return "Service is busy (503)";
  if (status === 429) return "Too many requests (429)";
  if (status !== undefined) return `Server error ${status}`;
  if (error instanceof GeminiTimeoutError) return "Request timed out";
  if (error instanceof GeminiInvalidResponseError) return "Unreadable response";
  return (error as any)?.message ?? "Unknown error";
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function withTimeout<T>(
  run: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new GeminiTimeoutError());
    }, timeoutMs);
  });
  try {
    return await Promise.race([run(controller.signal), timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Generic retry helper. Retries `fn` up to MAX_RETRIES times on retryable errors.
 */
export async function withGeminiRetry<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  options: {
    onProgress?: (progress: GeminiProgress) => void;
    maxRetries?: number;
    timeoutMs?: number;
  } = {},
): Promise<T> {
  const maxRetries = options.maxRetries ?? MAX_RETRIES;
  const maxAttempts = maxRetries + 1;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    options.onProgress?.({ stage: "request", attempt, maxAttempts });
    try {
      return await withTimeout(fn, options.timeoutMs ?? REQUEST_TIMEOUT_MS);
    } catch (error) {
      lastError = error;
      if (!isRetryableError(error)) {
        throw error;
      }
      if (attempt === maxAttempts) break;

      const delayMs = computeBackoffMs(attempt, error);
      console.warn(
        `[gemini] attempt ${attempt}/${maxAttempts} failed: ${describeError(error)}. Retrying in ${Math.round(delayMs)}ms`,
      );
      options.onProgress?.({
        stage: "retry",
        attempt,
        maxAttempts,
        delayMs,
        reason: describeError(error),
      });
      await sleep(delayMs);
    }
  }

  throw new GeminiUnavailableError(
    `${describeError(lastError)}. Tried ${maxAttempts} times — please try again in a minute.`,
    maxAttempts,
    lastError,
  );
}

export type GeminiContents = Parameters<
  GoogleGenAI["models"]["generateContent"]
>[0]["contents"];

/**
 * Calls Gemini with a JSON response schema and returns the parsed object.
 * Empty / unparsable responses are treated as retryable failures.
 */
export async function generateJsonWithRetry<T>({
  contents,
  schema,
  onProgress,
  model = GEMINI_MODEL,
}: {
  contents: GeminiContents;
  schema: Schema;
  onProgress?: (progress: GeminiProgress) => void;
  model?: string;
}): Promise<T> {
  const ai = getGeminiClient();

  return withGeminiRetry(async (abortSignal) => {
    const response = await ai.models.generateContent({
      model,
      contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        abortSignal,
      },
    });

    const text = response.text?.trim();
    if (!text) {
      throw new GeminiInvalidResponseError("Empty response.");
    }
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new GeminiInvalidResponseError("Invalid response.");
    }
  }, { onProgress });
}

export function formatGeminiProgress(progress: GeminiProgress): string {
  if (progress.stage === "request") {
    return progress.attempt === 1
      ? "Analyzing…"
      : `Retrying (${progress.attempt - 1}/${progress.maxAttempts - 1})…`;
  }
  return `${progress.reason}. Retrying in ${Math.ceil(progress.delayMs / 1000)}s (${progress.attempt}/${progress.maxAttempts - 1})…`;
}
