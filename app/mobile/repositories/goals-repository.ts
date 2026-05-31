import { SavingsGoal } from "@/shared/types/finance";

let goalsStore: SavingsGoal[] = [];

export async function listGoals(): Promise<SavingsGoal[]> {
  return [...goalsStore];
}

export async function createGoal(value: SavingsGoal): Promise<void> {
  goalsStore = [...goalsStore, value];
}

export async function updateGoalAmount(
  goalId: string,
  amount: number,
): Promise<void> {
  goalsStore = goalsStore.map((goal) =>
    goal.id === goalId ? { ...goal, currentAmount: amount } : goal,
  );
}

export async function deleteGoal(goalId: string): Promise<void> {
  goalsStore = goalsStore.filter((goal) => goal.id !== goalId);
}

export async function replaceGoals(value: SavingsGoal[]): Promise<void> {
  goalsStore = [...value];
}
