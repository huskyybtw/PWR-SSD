import { eq } from "drizzle-orm";
import { db } from "@/shared/client";
import { goals } from "@/shared/schema";
import { SavingsGoal } from "@/shared/types/finance";

export async function listGoals(): Promise<SavingsGoal[]> {
  // Pobieramy dane prosto z bazy danych (zamiast z ulotnej tablicy)
  return db.select().from(goals).all() as unknown as SavingsGoal[];
}

export async function createGoal(value: SavingsGoal): Promise<void> {
  // 1. Tarcza na puste dane (zabezpieczenie z naszego testu)
  if (!value.name || value.targetAmount === undefined || !value.deadline) {
    throw new Error("Invalid user input");
  }

  // 2. Tarcza na duplikaty
  // Zamiast .find() na tablicy, uderzamy do bazy (używając metody .get())
  const existingGoal = db
    .select()
    .from(goals)
    .where(eq(goals.id, value.id))
    .get();
  if (existingGoal) {
    throw new Error("Goal with this ID already exists");
  }

  // 3. Prawdziwy, twardy zapis do SQLite!
  db.insert(goals)
    .values({
      id: value.id,
      name: value.name,
      targetAmount: value.targetAmount,
      currentAmount:
        value.currentAmount !== undefined ? value.currentAmount : 0,
      deadline: value.deadline,
      createdAt: value.createdAt || new Date().toISOString(),
    })
    .run();
}

export async function updateGoalAmount(
  goalId: string,
  amount: number,
): Promise<void> {
  // Aktualizacja konkretnego wiersza prosto w bazie
  db.update(goals)
    .set({ currentAmount: amount })
    .where(eq(goals.id, goalId))
    .run();
}

export async function deleteGoal(goalId: string): Promise<void> {
  // Usunięcie rekordu o podanym ID z twardego dysku
  db.delete(goals).where(eq(goals.id, goalId)).run();
}

export async function replaceGoals(values: SavingsGoal[]): Promise<void> {
  // Czyścimy tabelę celów i wstawiamy całą nową paczkę
  db.delete(goals).run();
  if (values.length > 0) {
    db.insert(goals)
      .values(values as any)
      .run();
  }
}
