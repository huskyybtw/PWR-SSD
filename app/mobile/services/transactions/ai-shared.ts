import { TransactionType } from "@/shared/types/finance";

export interface RawImportedTransaction {
  amount: number;
  description: string;
  date: string;
  type: TransactionType;
  /** Category suggested by Gemini (only one of the app's known categories). */
  category?: string;
}

export type ImportTransactionsFn = (
  data: RawImportedTransaction[],
) => Promise<{ imported: any[]; skipped: any[] }>;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function todayIso(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Accepts YYYY-MM-DD and also DD.MM.YYYY / DD-MM-YYYY (common on Polish documents). */
export function normalizeDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (ISO_DATE.test(trimmed)) return trimmed;
  const pl = /^(\d{2})[.\-/](\d{2})[.\-/](\d{4})$/.exec(trimmed);
  if (pl) return `${pl[3]}-${pl[2]}-${pl[1]}`;
  return null;
}

export function normalizeAmount(value: unknown): number | null {
  const num =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value.replace(/\s/g, "").replace(",", "."))
        : NaN;
  if (!Number.isFinite(num)) return null;
  const abs = Math.round(Math.abs(num) * 100) / 100;
  return abs > 0 ? abs : null;
}

export function pickCategory(
  value: unknown,
  categories: string[] | undefined,
): string | undefined {
  if (!categories?.length || typeof value !== "string") return undefined;
  const match = categories.find(
    (c) => c.toLowerCase() === value.trim().toLowerCase(),
  );
  return match && match !== "Uncategorized" ? match : undefined;
}

/**
 * Descriptions must be copied exactly as printed. If Gemini translates or
 * paraphrases them, re-importing the same document creates duplicates because
 * duplicate detection compares descriptions.
 */
export const VERBATIM_HINT =
  " Copy every description/merchant name EXACTLY as printed on the document, in its original language (usually Polish). Do NOT translate, summarize or rephrase it.";

export function categoryHint(categories: string[] | undefined): string {
  return categories?.length
    ? ` Also assign each transaction the best matching category from this exact list: ${categories.join(", ")}.`
    : "";
}
