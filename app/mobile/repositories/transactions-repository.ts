import { desc, eq } from "drizzle-orm";

import { db } from "@/shared/client";
import {
  categories,
  transactionLogs,
  transactions,
  users,
} from "@/shared/schema";
import { Transaction } from "@/shared/types/finance";

const DEFAULT_USER_ID = 1;
const MANUAL_LOG_FILE_NAME = "manual-transactions";

async function ensureDefaultUser(): Promise<void> {
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.id, DEFAULT_USER_ID))
    .get();

  if (!existingUser) {
    await db
      .insert(users)
      .values({
        id: DEFAULT_USER_ID,
        name: "Default User",
        baseCurrency: "USD",
      })
      .run();
  }
}

async function ensureManualLog(): Promise<number> {
  await ensureDefaultUser();

  const existingLog = await db
    .select()
    .from(transactionLogs)
    .where(eq(transactionLogs.fileName, MANUAL_LOG_FILE_NAME))
    .get();

  if (existingLog) {
    return existingLog.id;
  }

  await db
    .insert(transactionLogs)
    .values({
      userId: DEFAULT_USER_ID,
      fileName: MANUAL_LOG_FILE_NAME,
    })
    .run();

  const createdLog = await db
    .select()
    .from(transactionLogs)
    .where(eq(transactionLogs.fileName, MANUAL_LOG_FILE_NAME))
    .get();

  if (!createdLog) {
    throw new Error("Manual transaction log could not be created.");
  }

  return createdLog.id;
}

async function getCategoryIdByName(categoryName: string): Promise<number> {
  const category = await db
    .select()
    .from(categories)
    .where(eq(categories.name, categoryName))
    .get();

  if (!category) {
    throw new Error("Invalid category.");
  }

  return category.id;
}

async function getCategoryNameById(categoryId: number | null): Promise<string> {
  if (!categoryId) {
    return "Uncategorized";
  }

  const category = await db
    .select()
    .from(categories)
    .where(eq(categories.id, categoryId))
    .get();

  return category?.name ?? "Uncategorized";
}

export async function listTransactions(): Promise<Transaction[]> {
  const rows = await db
    .select()
    .from(transactions)
    .orderBy(desc(transactions.date))
    .all();

  const result: Transaction[] = [];

  for (const row of rows) {
    const category = await getCategoryNameById(row.categoryId);

    result.push({
      id: row.transactionIdText || String(row.id),
      amount: Math.abs(row.amount),
      description: row.description || "",
      date: row.date,
      category,
      type: row.amount >= 0 ? "income" : "expense",
      createdAt: row.date,
      source: "manual",
    });
  }

  return result;
}

export async function createTransaction(value: Transaction): Promise<void> {
  if (
    !value.description ||
    value.amount === undefined ||
    value.amount <= 0 ||
    !value.date ||
    !value.category ||
    !value.type
  ) {
    throw new Error("Invalid transaction input.");
  }

  const existingTransaction = await db
    .select()
    .from(transactions)
    .where(eq(transactions.transactionIdText, value.id))
    .get();

  if (existingTransaction) {
    throw new Error("Duplicate transaction detected.");
  }

  const logId = await ensureManualLog();
  const categoryId = await getCategoryIdByName(value.category);

  await db
    .insert(transactions)
    .values({
      logId,
      categoryId,
      amount: value.type === "expense" ? -value.amount : value.amount,
      date: value.date,
      description: value.description,
      transactionIdText: value.id,
    })
    .run();
}

export async function updateTransactionCategory(
  txId: string,
  category: string,
): Promise<void> {
  const categoryId = await getCategoryIdByName(category);

  await db
    .update(transactions)
    .set({ categoryId })
    .where(eq(transactions.transactionIdText, txId))
    .run();
}

export async function deleteTransaction(txId: string): Promise<void> {
  await db
    .delete(transactions)
    .where(eq(transactions.transactionIdText, txId))
    .run();
}

export async function replaceTransactions(value: Transaction[]): Promise<void> {
  await db.delete(transactions).run();

  for (const transaction of value) {
    await createTransaction(transaction);
  }
}