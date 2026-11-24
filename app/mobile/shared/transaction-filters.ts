import { Transaction, TransactionType } from "@/shared/types/finance";
import { toIsoDate } from "@/shared/utils";

export type DatePreset =
  | "all"
  | "thisMonth"
  | "lastMonth"
  | "last3Months"
  | "thisYear"
  | "custom";

export type SortOption = "newest" | "oldest" | "highest" | "lowest";

export interface TransactionFilters {
  search: string;
  type: "all" | TransactionType;
  categories: string[];
  datePreset: DatePreset;
  /** YYYY-MM-DD, used when datePreset === "custom" */
  dateFrom: string;
  dateTo: string;
  minAmount: string;
  maxAmount: string;
  sort: SortOption;
}

export const DEFAULT_FILTERS: TransactionFilters = {
  search: "",
  type: "all",
  categories: [],
  datePreset: "all",
  dateFrom: "",
  dateTo: "",
  minAmount: "",
  maxAmount: "",
  sort: "newest",
};

export const DATE_PRESET_LABELS: Record<DatePreset, string> = {
  all: "All time",
  thisMonth: "This month",
  lastMonth: "Last month",
  last3Months: "Last 3 months",
  thisYear: "This year",
  custom: "Custom",
};

export const SORT_LABELS: Record<SortOption, string> = {
  newest: "Newest",
  oldest: "Oldest",
  highest: "Highest amount",
  lowest: "Lowest amount",
};

const ISO = /^\d{4}-\d{2}-\d{2}$/;

function parseAmount(value: string): number | null {
  if (!value.trim()) return null;
  const n = Number(value.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/** Returns an inclusive [from, to] range of YYYY-MM-DD strings, or null for "no limit". */
export function getDateRange(
  filters: Pick<TransactionFilters, "datePreset" | "dateFrom" | "dateTo">,
  now: Date = new Date(),
): { from: string | null; to: string | null } {
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (filters.datePreset) {
    case "thisMonth":
      return {
        from: toIsoDate(new Date(y, m, 1)),
        to: toIsoDate(new Date(y, m + 1, 0)),
      };
    case "lastMonth":
      return {
        from: toIsoDate(new Date(y, m - 1, 1)),
        to: toIsoDate(new Date(y, m, 0)),
      };
    case "last3Months":
      return {
        from: toIsoDate(new Date(y, m - 2, 1)),
        to: toIsoDate(new Date(y, m + 1, 0)),
      };
    case "thisYear":
      return { from: `${y}-01-01`, to: `${y}-12-31` };
    case "custom":
      return {
        from: ISO.test(filters.dateFrom) ? filters.dateFrom : null,
        to: ISO.test(filters.dateTo) ? filters.dateTo : null,
      };
    default:
      return { from: null, to: null };
  }
}

export function filterTransactions(
  transactions: Transaction[],
  filters: TransactionFilters,
  now: Date = new Date(),
): Transaction[] {
  const q = filters.search.trim().toLowerCase();
  const { from, to } = getDateRange(filters, now);
  const min = parseAmount(filters.minAmount);
  const max = parseAmount(filters.maxAmount);
  const categories = new Set(filters.categories);

  const result = transactions.filter((t) => {
    if (
      q &&
      !t.description.toLowerCase().includes(q) &&
      !t.category.toLowerCase().includes(q)
    ) {
      return false;
    }
    if (filters.type !== "all" && t.type !== filters.type) return false;
    if (categories.size > 0 && !categories.has(t.category)) return false;
    const day = t.date.slice(0, 10);
    if (from && day < from) return false;
    if (to && day > to) return false;
    if (min !== null && t.amount < min) return false;
    if (max !== null && t.amount > max) return false;
    return true;
  });

  return result.sort((a, b) => {
    switch (filters.sort) {
      case "oldest":
        return a.date.localeCompare(b.date);
      case "highest":
        return b.amount - a.amount;
      case "lowest":
        return a.amount - b.amount;
      default:
        return b.date.localeCompare(a.date);
    }
  });
}

/** Number of active filters, excluding search text and sort. */
export function countActiveFilters(filters: TransactionFilters): number {
  let count = 0;
  if (filters.type !== "all") count++;
  if (filters.categories.length > 0) count++;
  if (filters.datePreset !== "all") count++;
  if (filters.minAmount.trim() || filters.maxAmount.trim()) count++;
  return count;
}
