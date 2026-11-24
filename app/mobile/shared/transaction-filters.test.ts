import {
  countActiveFilters,
  DEFAULT_FILTERS,
  filterTransactions,
  getDateRange,
} from "./transaction-filters";
import { Transaction } from "./types/finance";

const tx = (over: Partial<Transaction>): Transaction => ({
  id: Math.random().toString(),
  amount: 10,
  description: "Test",
  date: "2026-11-10",
  category: "Food",
  type: "expense",
  createdAt: "2026-11-10T00:00:00Z",
  ...over,
});

const NOW = new Date(2026, 10, 24); // 24 Nov 2026

const data: Transaction[] = [
  tx({ id: "a", description: "Biedronka", amount: 37.02, date: "2026-11-20" }),
  tx({ id: "b", description: "Salary", amount: 5000, type: "income", category: "Uncategorized", date: "2026-11-01" }),
  tx({ id: "c", description: "Orlen", amount: 200, category: "Transport", date: "2026-10-15" }),
  tx({ id: "d", description: "Netflix", amount: 43, category: "Entertainment", date: "2021-03-27" }),
];

describe("filterTransactions", () => {
  it("returns everything sorted newest first by default", () => {
    expect(filterTransactions(data, DEFAULT_FILTERS, NOW).map((t) => t.id)).toEqual(["a", "b", "c", "d"]);
  });

  it("searches description and category case-insensitively", () => {
    const res = filterTransactions(data, { ...DEFAULT_FILTERS, search: "transp" }, NOW);
    expect(res.map((t) => t.id)).toEqual(["c"]);
  });

  it("filters by type and categories", () => {
    expect(filterTransactions(data, { ...DEFAULT_FILTERS, type: "income" }, NOW).map((t) => t.id)).toEqual(["b"]);
    expect(
      filterTransactions(data, { ...DEFAULT_FILTERS, categories: ["Food", "Transport"] }, NOW).map((t) => t.id),
    ).toEqual(["a", "c"]);
  });

  it("filters by date presets and custom range", () => {
    expect(filterTransactions(data, { ...DEFAULT_FILTERS, datePreset: "thisMonth" }, NOW).map((t) => t.id)).toEqual(["a", "b"]);
    expect(filterTransactions(data, { ...DEFAULT_FILTERS, datePreset: "lastMonth" }, NOW).map((t) => t.id)).toEqual(["c"]);
    expect(
      filterTransactions(data, { ...DEFAULT_FILTERS, datePreset: "custom", dateFrom: "2021-01-01", dateTo: "2021-12-31" }, NOW).map((t) => t.id),
    ).toEqual(["d"]);
  });

  it("filters by amount range (accepts comma decimals) and sorts", () => {
    const res = filterTransactions(data, { ...DEFAULT_FILTERS, minAmount: "40", maxAmount: "300,5", sort: "highest" }, NOW);
    expect(res.map((t) => t.id)).toEqual(["c", "d"]);
  });

  it("counts active filters", () => {
    expect(countActiveFilters(DEFAULT_FILTERS)).toBe(0);
    expect(countActiveFilters({ ...DEFAULT_FILTERS, type: "expense", categories: ["Food"], minAmount: "1" })).toBe(3);
  });

  it("computes last month range across year boundary", () => {
    expect(getDateRange({ datePreset: "lastMonth", dateFrom: "", dateTo: "" }, new Date(2026, 0, 5))).toEqual({
      from: "2025-12-01",
      to: "2025-12-31",
    });
  });
});
