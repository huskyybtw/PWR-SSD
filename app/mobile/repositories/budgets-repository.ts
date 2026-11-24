import { eq } from "drizzle-orm";

import { db } from "@/shared/client";
import { budgets } from "@/shared/schema";
import { Budget } from "@/shared/types/finance";

export async function listBudgets(): Promise<Budget[]> {
  return db.select().from(budgets).all() as Budget[];
}

export async function createBudget(value: Budget): Promise<void> {
  await db.insert(budgets).values(value).run();
}

export async function deleteBudget(budgetId: string): Promise<void> {
  const existingBudget = await db
    .select()
    .from(budgets)
    .where(eq(budgets.id, budgetId))
    .get();

  if (!existingBudget) {
    throw new Error("Budget does not exist.");
  }

  await db.delete(budgets).where(eq(budgets.id, budgetId)).run();
}

export async function replaceBudgets(value: Budget[]): Promise<void> {
  await db.delete(budgets).run();

  if (value.length > 0) {
    await db.insert(budgets).values(value).run();
  }
}