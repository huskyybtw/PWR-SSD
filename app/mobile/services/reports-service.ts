import {
  addDays,
  eachDayOfInterval,
  format,
  isAfter,
  isBefore,
  parseISO,
} from "date-fns";

import { ReportData, Transaction } from "@/shared/types/finance";

export function getReportData(
  transactions: Transaction[],
  startDate: string,
  endDate: string,
): ReportData {
  const start = parseISO(startDate);
  const end = parseISO(endDate);

  const filtered = transactions.filter(
    (transaction) =>
      isAfter(parseISO(transaction.date), addDays(start, -1)) &&
      isBefore(parseISO(transaction.date), addDays(end, 1)),
  );

  const totalIncome = filtered
    .filter((transaction) => transaction.type === "income" || !transaction.type) // Zabezpieczenie na brakujący typ
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const totalExpenses = filtered
    .filter((transaction) => transaction.type === "expense")
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  // Zmiana: Klucze obiektu to teraz ID Kategorii (number)
  const categoryBreakdown: Record<number, number> = {};
  for (const transaction of filtered.filter(
    (candidate) => candidate.type === "expense",
  )) {
    categoryBreakdown[transaction.categoryId] =
      (categoryBreakdown[transaction.categoryId] || 0) + transaction.amount;
  }

  const days = eachDayOfInterval({ start, end });
  const dailyTrend = days.map((day) => {
    const dayStr = format(day, "yyyy-MM-dd");
    const dayTxs = filtered.filter(
      (transaction) => transaction.date === dayStr,
    );
    return {
      date: dayStr,
      income: dayTxs
        .filter(
          (transaction) => transaction.type === "income" || !transaction.type,
        )
        .reduce((sum, transaction) => sum + transaction.amount, 0),
      expense: dayTxs
        .filter((transaction) => transaction.type === "expense")
        .reduce((sum, transaction) => sum + transaction.amount, 0),
    };
  });

  // Ze względu na uwarunkowania TypeScript, zmieniamy typ klucza z powrotem na string przy zwracaniu do ReportData
  const stringifiedCategoryBreakdown: Record<string, number> = {};
  for (const [key, value] of Object.entries(categoryBreakdown)) {
    stringifiedCategoryBreakdown[key] = value;
  }

  return {
    totalIncome,
    totalExpenses,
    netBalance: totalIncome - totalExpenses,
    categoryBreakdown: stringifiedCategoryBreakdown,
    dailyTrend,
  };
}
