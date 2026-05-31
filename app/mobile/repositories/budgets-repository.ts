import { Budget } from "@/shared/types/finance";

let budgetsStore: Budget[] = [];

export async function listBudgets(): Promise<Budget[]> {
  return [...budgetsStore];
}

export async function createBudget(value: Budget): Promise<void> {
  budgetsStore = [...budgetsStore, value];
}

export async function deleteBudget(budgetId: string): Promise<void> {
  budgetsStore = budgetsStore.filter((budget) => budget.id !== budgetId);
}

export async function replaceBudgets(value: Budget[]): Promise<void> {
  budgetsStore = [...value];
}
