import { and, desc, eq, gt, ne, or, isNull } from "drizzle-orm";

import { ensureDefaultUser, DEFAULT_USER_ID } from "@/repositories/users-repository";
import { db } from "@/shared/client";
import { categories, transactionLogs, transactions } from "@/shared/schema";
import { Transaction } from "@/shared/types/finance";

const FALLBACK_CATEGORY = "Uncategorized";

export const MANUAL_LOG_FILE_NAME = "manual-transactions";
export const IMPORT_LOG_FILE_NAME = "imported-transactions";

async function ensureLog(fileName: string): Promise<number> {
  await ensureDefaultUser();

  const existingLog = await db
    .select()
    .from(transactionLogs)
    .where(eq(transactionLogs.fileName, fileName))
    .get();

  if (existingLog) {
    return existingLog.id;
  }

  await db
    .insert(transactionLogs)
    .values({ userId: DEFAULT_USER_ID, fileName })
    .run();

  const createdLog = await db
    .select()
    .from(transactionLogs)
    .where(eq(transactionLogs.fileName, fileName))
    .get();

  if (!createdLog) {
    throw new Error("Transaction log could not be created.");
  }

  return createdLog.id;
}

/**
 * Resolves a category name to its id. Unknown names fall back to
 * "Uncategorized" (created on demand) instead of failing the whole operation.
 */
async function resolveCategoryId(categoryName: string): Promise<number> {
  const name = categoryName?.trim() || FALLBACK_CATEGORY;

  const category = await db
    .select()
    .from(categories)
    .where(eq(categories.name, name))
    .get();
  if (category) return category.id;

  const fallback = await db
    .select()
    .from(categories)
    .where(eq(categories.name, FALLBACK_CATEGORY))
    .get();
  if (fallback) return fallback.id;

  await db.insert(categories).values({ name: FALLBACK_CATEGORY }).run();
  const created = await db
    .select()
    .from(categories)
    .where(eq(categories.name, FALLBACK_CATEGORY))
    .get();
  if (!created) throw new Error("Could not create fallback category.");
  return created.id;
}

function validateTransaction(value: Transaction): void {
  if (
    !value.description ||
    value.amount === undefined ||
    !Number.isFinite(value.amount) ||
    value.amount <= 0 ||
    !value.date ||
    !value.type
  ) {
    throw new Error("Invalid transaction input.");
  }
}

export async function listTransactions(): Promise<Transaction[]> {
  const rows = await db
    .select({
      id: transactions.id,
      idText: transactions.transactionIdText,
      amount: transactions.amount,
      date: transactions.date,
      description: transactions.description,
      category: categories.name,
      logName: transactionLogs.fileName,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .leftJoin(transactionLogs, eq(transactions.logId, transactionLogs.id))
    .orderBy(desc(transactions.date), desc(transactions.id))
    .all();

  return rows.map((row) => ({
    id: row.idText || String(row.id),
    amount: Math.abs(row.amount),
    description: row.description || "",
    date: row.date,
    category: row.category ?? FALLBACK_CATEGORY,
    type: row.amount >= 0 ? "income" : "expense",
    createdAt: row.date,
    source: row.logName === IMPORT_LOG_FILE_NAME ? "import" : "manual",
  }));
}

async function insertOne(value: Transaction, logId: number): Promise<void> {
  validateTransaction(value);

  const existingTransaction = await db
    .select()
    .from(transactions)
    .where(eq(transactions.transactionIdText, value.id))
    .get();

  if (existingTransaction) {
    throw new Error("Duplicate transaction detected.");
  }

  const categoryId = await resolveCategoryId(value.category);

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

export async function createTransaction(value: Transaction): Promise<void> {
  const logId = await ensureLog(
    value.source === "import" ? IMPORT_LOG_FILE_NAME : MANUAL_LOG_FILE_NAME,
  );
  await insertOne(value, logId);
}

/**
 * Inserts several transactions. Every row is validated before anything is
 * written, so one bad row can't leave a half-finished import behind.
 */
export async function insertTransactions(values: Transaction[]): Promise<void> {
  if (values.length === 0) return;
  values.forEach(validateTransaction);

  const manualLogId = await ensureLog(MANUAL_LOG_FILE_NAME);
  const importLogId = await ensureLog(IMPORT_LOG_FILE_NAME);

  for (const value of values) {
    await insertOne(
      value,
      value.source === "import" ? importLogId : manualLogId,
    );
  }
}

export async function updateTransactionCategory(
  txId: string,
  category: string,
): Promise<void> {
  const categoryId = await resolveCategoryId(category);

  await db
    .update(transactions)
    .set({ categoryId })
    .where(eq(transactions.transactionIdText, txId))
    .run();
}

/** Income rows (positive amounts) always belong to the "Income" category. */
export async function normalizeIncomeCategory(): Promise<void> {
  const incomeId = await resolveCategoryId("Income");
  await db
    .update(transactions)
    .set({ categoryId: incomeId })
    .where(
      and(
        gt(transactions.amount, 0),
        or(isNull(transactions.categoryId), ne(transactions.categoryId, incomeId)),
      ),
    )
    .run();
}

export async function deleteTransaction(txId: string): Promise<void> {
  await db
    .delete(transactions)
    .where(eq(transactions.transactionIdText, txId))
    .run();
}

export async function replaceTransactions(value: Transaction[]): Promise<void> {
  value.forEach(validateTransaction);
  await db.delete(transactions).run();
  await insertTransactions(value);
}
