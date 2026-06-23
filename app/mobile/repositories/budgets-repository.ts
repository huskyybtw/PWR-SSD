import { eq } from "drizzle-orm";

import { db } from "@/shared/client";
import { budgets } from "@/shared/schema";
import { Budget } from "@/shared/types/finance";

export async function listBudgets(): Promise<Budget[]> {
  return db.select().from(budgets).all() as Budget[];
}
// Zaktualizuj istniejącą funkcję createBudget:
export async function createBudget(value: Budget): Promise<void> {
  // 1. Tarcza na puste dane (aby test 'invalid user input' przeszedł)
  if (!value.name || value.amount === undefined || !value.category) {
    throw new Error("Invalid user input");
  }

  // 2. Tarcza na duplikaty (aby test 'duplicate budget' przeszedł)
  const existingBudget = db
    .select()
    .from(budgets)
    .where(eq(budgets.id, value.id))
    .get();

  if (existingBudget) {
    throw new Error("Budget already exists"); // Zablokuj powtórkę
  }

  // 3. Właściwy zapis
  db.insert(budgets).values(value).run();
}

// Zaktualizuj istniejącą funkcję deleteBudget:
export async function deleteBudget(budgetId: string): Promise<void> {
  // 1. Tarcza na brakujące budżety (aby test 'deleting non-existing budget' przeszedł)
  const existingBudget = db
    .select()
    .from(budgets)
    .where(eq(budgets.id, budgetId))
    .get();

  if (!existingBudget) {
    throw new Error("Budget does not exist."); // Komunikat, którego żąda test PM-a
  }

  // 2. Właściwe usunięcie
  db.delete(budgets).where(eq(budgets.id, budgetId)).run();
}
export async function replaceBudgets(value: Budget[]): Promise<void> {
  await db.delete(budgets).run();

  if (value.length > 0) {
    await db.insert(budgets).values(value).run();
  }
}
