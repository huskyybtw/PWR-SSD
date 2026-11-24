import { Type } from "@google/genai";

import {
  __setGeminiClientForTests,
  generateJsonWithRetry,
  GeminiUnavailableError,
  isRetryableError,
  MAX_RETRIES,
  withGeminiRetry,
} from "./gemini";

const apiError = (status: number, message = `status ${status}`) =>
  Object.assign(new Error(message), { status });

const schema = { type: Type.OBJECT, properties: {} };

describe("Gemini retry", () => {
  let generateContent: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(console, "warn").mockImplementation(() => {});
    generateContent = jest.fn();
    __setGeminiClientForTests({ models: { generateContent } } as any);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    __setGeminiClientForTests(null);
  });

  /** Runs the promise while flushing all backoff timers. */
  async function run<T>(promise: Promise<T>): Promise<T> {
    let settled = false;
    promise.then(
      () => (settled = true),
      () => (settled = true),
    );
    while (!settled) {
      await jest.runOnlyPendingTimersAsync();
    }
    return promise;
  }

  it("retries 503 and succeeds", async () => {
    generateContent
      .mockRejectedValueOnce(apiError(503))
      .mockRejectedValueOnce(apiError(503))
      .mockResolvedValueOnce({ text: '{"ok":true}' });

    const progress = jest.fn();
    const result = await run(
      generateJsonWithRetry<{ ok: boolean }>({
        contents: "x",
        schema,
        onProgress: progress,
      }),
    );

    expect(result).toEqual({ ok: true });
    expect(generateContent).toHaveBeenCalledTimes(3);
    expect(progress).toHaveBeenCalledWith(
      expect.objectContaining({ stage: "retry", attempt: 1 }),
    );
  });

  it(`gives up after ${MAX_RETRIES} retries and throws a friendly error`, async () => {
    generateContent.mockRejectedValue(apiError(503));

    const promise = generateJsonWithRetry({ contents: "x", schema });
    await expect(run(promise)).rejects.toBeInstanceOf(GeminiUnavailableError);
    expect(generateContent).toHaveBeenCalledTimes(MAX_RETRIES + 1);
    await expect(promise).rejects.toThrow(/busy/i);
  });

  it("does not retry a 400 bad request", async () => {
    generateContent.mockRejectedValue(apiError(400, "invalid argument"));

    await expect(
      run(generateJsonWithRetry({ contents: "x", schema })),
    ).rejects.toThrow("invalid argument");
    expect(generateContent).toHaveBeenCalledTimes(1);
  });

  it("retries an invalid JSON response", async () => {
    generateContent
      .mockResolvedValueOnce({ text: "not json" })
      .mockResolvedValueOnce({ text: '{"a":1}' });

    await expect(
      run(generateJsonWithRetry({ contents: "x", schema })),
    ).resolves.toEqual({ a: 1 });
    expect(generateContent).toHaveBeenCalledTimes(2);
  });

  it("times out a hanging request and retries it", async () => {
    let calls = 0;
    const fn = jest.fn(() => {
      calls++;
      return calls === 1
        ? new Promise<string>(() => {})
        : Promise.resolve("done");
    });

    await expect(run(withGeminiRetry(fn, { timeoutMs: 1000 }))).resolves.toBe(
      "done",
    );
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("classifies errors", () => {
    expect(isRetryableError(apiError(503))).toBe(true);
    expect(isRetryableError(apiError(429))).toBe(true);
    expect(isRetryableError(apiError(500))).toBe(true);
    expect(isRetryableError(apiError(401))).toBe(false);
    expect(isRetryableError(new Error("Network request failed"))).toBe(true);
    expect(isRetryableError(new Error("something else"))).toBe(false);
  });
});
