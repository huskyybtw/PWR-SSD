import { SavingsGoal } from "@/shared/types/finance";

let goalsStore: SavingsGoal[] = [];

export async function listGoals(): Promise<SavingsGoal[]> {
  return [...goalsStore];
}

export async function createGoal(value: SavingsGoal): Promise<void> {
  // 1. Tarcza na puste dane
  if (!value.name || value.targetAmount === undefined || !value.deadline) {
    throw new Error("Invalid user input");
  }

  // 2. Tarcza na duplikaty
  const existingGoal = goalsStore.find((goal) => goal.id === value.id);
  if (existingGoal) {
    throw new Error("Goal with this ID already exists");
  }

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
