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
    .filter((transaction) => transaction.type === "income")
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const totalExpenses = filtered
    .filter((transaction) => transaction.type === "expense")
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const categoryBreakdown: Record<string, number> = {};
  for (const transaction of filtered.filter(
    (candidate) => candidate.type === "expense",
  )) {
    categoryBreakdown[transaction.category] =
      (categoryBreakdown[transaction.category] || 0) + transaction.amount;
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
        .filter((transaction) => transaction.type === "income")
        .reduce((sum, transaction) => sum + transaction.amount, 0),
      expense: dayTxs
        .filter((transaction) => transaction.type === "expense")
        .reduce((sum, transaction) => sum + transaction.amount, 0),
    };
  });

  return {
    totalIncome,
    totalExpenses,
    netBalance: totalIncome - totalExpenses,
    categoryBreakdown,
    dailyTrend,
  };
}