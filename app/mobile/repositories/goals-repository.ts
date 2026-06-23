import { eq } from "drizzle-orm";

import { db } from "@/shared/client";
import { goals, users } from "@/shared/schema";
import { SavingsGoal } from "@/shared/types/finance";

const DEFAULT_USER_ID = 1;

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

export async function listGoals(): Promise<SavingsGoal[]> {
  return db.select().from(goals).all() as unknown as SavingsGoal[];
}

export async function createGoal(value: SavingsGoal): Promise<void> {
  if (!value.name || value.targetAmount === undefined || !value.deadline) {
    throw new Error("Invalid user input");
  }

 const existingGoal = db
  .select()
  .from(goals)
  .where(eq(goals.id, value.id))
  .get() as SavingsGoal | undefined;

if (existingGoal?.id === value.id) {
  throw new Error("Goal with this ID already exists");
}

  db.insert(goals)
    .values({
      id: value.id,
      name: value.name,
      targetAmount: value.targetAmount,
      currentAmount:
        value.currentAmount !== undefined ? value.currentAmount : 0,
      deadline: value.deadline,
      createdAt: value.createdAt || new Date().toISOString(),
      userId: DEFAULT_USER_ID,
      goalType: "savings",
    })
    .run();
}

export async function updateGoalAmount(
  goalId: string,
  amount: number,
): Promise<void> {
  db.update(goals)
    .set({ currentAmount: amount })
    .where(eq(goals.id, goalId))
    .run();
}

export async function deleteGoal(goalId: string): Promise<void> {
  db.delete(goals).where(eq(goals.id, goalId)).run();
}

export async function replaceGoals(values: SavingsGoal[]): Promise<void> {
  db.delete(goals).run();

  if (values.length > 0) {
    for (const goal of values) {
      await createGoal(goal);
    }
  }
}