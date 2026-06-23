import { eq } from "drizzle-orm";

import { db } from "@/shared/client";
import { goals } from "@/shared/schema";
import { FinancialGoal } from "@/shared/types/finance";

export async function listGoals(): Promise<FinancialGoal[]> {
  // Pobieramy dane z bazy (Drizzle zmapuje nazwy kolumn z _ na camelCase dzięki definicji w schema.ts)
  return db.select().from(goals).all() as unknown as FinancialGoal[];
}

export async function createGoal(value: FinancialGoal): Promise<void> {
  // 1. Tarcza na puste dane (rozbudowana o nowe wymagane pola)
  if (
    !value.name ||
    value.targetAmount === undefined ||
    !value.startDate ||
    !value.endDate ||
    !value.categoryId ||
    !value.userId
  ) {
    throw new Error("Invalid user input");
  }

  // 2. Tarcza na duplikaty
  const existingGoal = db
    .select()
    .from(goals)
    .where(eq(goals.id, value.id))
    .get();

  if (existingGoal) {
    throw new Error("Goal with this ID already exists");
  }

  // 3. Prawdziwy, twardy zapis do SQLite! (Z uwzględnieniem nowej architektury)
  db.insert(goals)
    .values({
      id: value.id,
      userId: Number(value.userId), // Upewniamy się, że to liczba, tak jak oczekuje baza
      goalType: value.goalType || "saving",
      categoryId: value.categoryId,
      name: value.name,
      targetAmount: value.targetAmount,
      currentAmount:
        value.currentAmount !== undefined ? value.currentAmount : 0,
      startDate: value.startDate,
      endDate: value.endDate, // Zastępuje stare 'deadline'
      alertMessage: value.alertMessage,
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

export async function replaceGoals(values: FinancialGoal[]): Promise<void> {
  // Czyścimy tabelę celów i wstawiamy całą nową paczkę
  db.delete(goals).run();

  if (values.length > 0) {
    // Odpowiednio mapujemy obiekty, aby upewnić się, że typy idące do bazy są poprawne
    const mappedValues = values.map((v) => ({
      id: v.id,
      userId: Number(v.userId),
      goalType: v.goalType || "saving",
      categoryId: v.categoryId,
      name: v.name,
      targetAmount: v.targetAmount,
      currentAmount: v.currentAmount !== undefined ? v.currentAmount : 0,
      startDate: v.startDate,
      endDate: v.endDate,
      alertMessage: v.alertMessage,
      createdAt: v.createdAt || new Date().toISOString(),
    }));

    db.insert(goals).values(mappedValues).run();
  }
}