import { openDatabaseSync } from "expo-sqlite";

import { Transaction } from "@/shared/types/finance";

const sqlite = openDatabaseSync("finance.db");

type TransactionRow = {
  id: string;
  amount: number;
  description: string;
  date: string;
  category: string;
  type: Transaction["type"];
  createdAt: string;
  source: Transaction["source"] | null;
};

let didInitializeTransactionsTable = false;

function ensureTransactionsTable(): void {
  if (didInitializeTransactionsTable) {
    return;
  }

  sqlite.runSync(`
    CREATE TABLE IF NOT EXISTS transactions_store (
      id TEXT PRIMARY KEY NOT NULL,
      amount REAL NOT NULL,
      description TEXT NOT NULL,
      date TEXT NOT NULL,
      category TEXT NOT NULL,
      type TEXT NOT NULL,
      created_at TEXT NOT NULL,
      source TEXT
    )
  `);

  didInitializeTransactionsTable = true;
}

function toTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    amount: row.amount,
    description: row.description,
    date: row.date,
    category: row.category,
    type: row.type,
    createdAt: row.createdAt,
    source: row.source ?? undefined,
  };
}

ensureTransactionsTable();

export async function listTransactions(): Promise<Transaction[]> {
  try {
    const rows = sqlite.getAllSync<TransactionRow>(
      `
        SELECT
          id,
          amount,
          description,
          date,
          category,
          type,
          created_at AS createdAt,
          source
        FROM transactions_store
        ORDER BY created_at DESC
      `,
    );

    return rows.map(toTransaction);
  } catch (error) {
    console.error("Failed to list transactions", error);
    throw error;
  }
}

export async function createTransaction(value: Transaction): Promise<void> {
  try {
    sqlite.runSync(
      `
        INSERT INTO transactions_store (
          id, amount, description, date, category, type, created_at, source
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      value.id,
      value.amount,
      value.description,
      value.date,
      value.category,
      value.type,
      value.createdAt,
      value.source ?? null,
    );
  } catch (error) {
    console.error("Failed to create transaction", error);
    throw error;
  }
}

export async function updateTransactionCategory(
  txId: string,
  category: string,
): Promise<void> {
  try {
    sqlite.runSync(
      `
        UPDATE transactions_store
        SET category = ?
        WHERE id = ?
      `,
      category,
      txId,
    );
  } catch (error) {
    console.error("Failed to update transaction category", error);
    throw error;
  }
}

export async function deleteTransaction(txId: string): Promise<void> {
  try {
    sqlite.runSync("DELETE FROM transactions_store WHERE id = ?", txId);
  } catch (error) {
    console.error("Failed to delete transaction", error);
    throw error;
  }
}

export async function replaceTransactions(value: Transaction[]): Promise<void> {
  try {
    sqlite.runSync("BEGIN TRANSACTION");
    sqlite.runSync("DELETE FROM transactions_store");

    for (const transaction of value) {
      sqlite.runSync(
        `
          INSERT INTO transactions_store (
            id, amount, description, date, category, type, created_at, source
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        transaction.id,
        transaction.amount,
        transaction.description,
        transaction.date,
        transaction.category,
        transaction.type,
        transaction.createdAt,
        transaction.source ?? null,
      );
    }

    sqlite.runSync("COMMIT");
  } catch (error) {
    try {
      sqlite.runSync("ROLLBACK");
    } catch {
      // Ignore rollback failures and surface the original error.
    }

    console.error("Failed to replace transactions", error);
    throw error;
  }
}
