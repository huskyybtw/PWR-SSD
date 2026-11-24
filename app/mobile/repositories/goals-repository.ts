import { eq } from "drizzle-orm";

import { DEFAULT_USER_ID, ensureDefaultUser } from "@/repositories/users-repository";
import { db } from "@/shared/client";
import { goals } from "@/shared/schema";
import { SavingsGoal } from "@/shared/types/finance";

export async function listGoals(): Promise<SavingsGoal[]> {
  const rows = await db.select().from(goals).all();
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    targetAmount: row.targetAmount,
    currentAmount: row.currentAmount,
    deadline: row.deadline,
    createdAt: row.createdAt,
  })) as SavingsGoal[];
}

export async function createGoal(value: SavingsGoal): Promise<void> {
  if (!value.name || value.targetAmount === undefined || !value.deadline) {
    throw new Error("Invalid user input");
  }

  const existingGoal = await db
    .select()
    .from(goals)
    .where(eq(goals.id, value.id))
    .get();

  if (existingGoal) {
    throw new Error("Goal with this ID already exists");
  }

  await ensureDefaultUser();
  const now = new Date().toISOString();

  await db
    .insert(goals)
    .values({
      id: value.id,
      name: value.name,
      targetAmount: value.targetAmount,
      currentAmount: value.currentAmount ?? 0,
      deadline: value.deadline,
      createdAt: value.createdAt || now,
      userId: DEFAULT_USER_ID,
      goalType: "savings",
      startDate: now,
    })
    .run();
}

export async function updateGoalAmount(
  goalId: string,
  amount: number,
): Promise<void> {
  await db
    .update(goals)
    .set({ currentAmount: amount })
    .where(eq(goals.id, goalId))
    .run();
}

export async function deleteGoal(goalId: string): Promise<void> {
  await db.delete(goals).where(eq(goals.id, goalId)).run();
}

export async function replaceGoals(values: SavingsGoal[]): Promise<void> {
  await db.delete(goals).run();
  for (const goal of values) {
    await createGoal(goal);
  }
}
