import { Transaction } from "@/shared/types/finance";

let transactionsStore: Transaction[] = [];

export async function listTransactions(): Promise<Transaction[]> {
  return [...transactionsStore];
}

export async function createTransaction(value: Transaction): Promise<void> {
  transactionsStore = [value, ...transactionsStore];
}

export async function updateTransactionCategory(
  txId: string,
  category: string,
): Promise<void> {
  transactionsStore = transactionsStore.map((transaction) =>
    transaction.id === txId ? { ...transaction, category } : transaction,
  );
}

export async function deleteTransaction(txId: string): Promise<void> {
  transactionsStore = transactionsStore.filter(
    (transaction) => transaction.id !== txId,
  );
}

export async function replaceTransactions(value: Transaction[]): Promise<void> {
  transactionsStore = [...value];
}
