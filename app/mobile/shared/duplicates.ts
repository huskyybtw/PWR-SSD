import { Transaction } from "@/shared/types/finance";

/** Lowercase, strip Polish diacritics, punctuation and extra spaces. */
export function normalizeDescription(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ł/g, "l")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function sameMoneyDateType(a: Transaction, b: Transaction): boolean {
  return (
    Math.abs(a.amount - b.amount) < 0.005 &&
    a.date === b.date &&
    a.type === b.type
  );
}

/** Same amount, date, type and (normalized) description. */
export function isDuplicateTransaction(
  existing: Transaction,
  candidate: Transaction,
): boolean {
  return (
    sameMoneyDateType(existing, candidate) &&
    normalizeDescription(existing.description) ===
      normalizeDescription(candidate.description)
  );
}

/**
 * Splits freshly extracted rows into new ones and duplicates.
 *
 * - Against EARLIER IMPORTS, amount + date + type is enough: the AI can word
 *   the same row differently each time a document is re-imported.
 * - Against manual transactions the description must match too, so a manual
 *   entry only blocks the identical imported row.
 */
export function partitionNewTransactions<T extends Transaction>(
  existing: Transaction[],
  candidates: T[],
): { fresh: T[]; duplicates: T[] } {
  const fresh: T[] = [];
  const duplicates: T[] = [];
  // Each earlier imported row can only "absorb" one candidate, so a statement
  // with two identical rows re-imported still yields exactly two rows.
  const usedImports = new Set<string>();

  for (const candidate of candidates) {
    const importMatch = existing.find(
      (t) =>
        t.source === "import" &&
        !usedImports.has(t.id) &&
        sameMoneyDateType(t, candidate),
    );
    if (importMatch) {
      usedImports.add(importMatch.id);
      duplicates.push(candidate);
      continue;
    }

    // Rows of the same document are never compared with each other: a
    // statement can legitimately contain two identical card payments.
    const isDup = existing.some(
      (t) => t.source !== "import" && isDuplicateTransaction(t, candidate),
    );

    (isDup ? duplicates : fresh).push(candidate);
  }

  return { fresh, duplicates };
}
