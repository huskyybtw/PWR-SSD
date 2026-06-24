import { eq } from "drizzle-orm";
import { db } from "@/shared/client";
import { financialGoals } from "@/shared/schema";
import { SavingsGoal } from "@/shared/types/finance";

const DEFAULT_USER_ID = 1;

// Accepts both SavingsGoal (deadline) and test shape (endDate)
type GoalInput =
  | SavingsGoal
  | {
      id?: string;
      name: string;
      targetAmount: number;
      currentAmount?: number;
      deadline?: string;
      endDate?: string;
      startDate?: string;
      createdAt?: string;
      userId?: number;
      categoryId?: number;
      goalType?: string;
    };

export async function listGoals(): Promise<SavingsGoal[]> {
  const table =
    (financialGoals as any) ?? (require("@/shared/schema") as any).goals;
  const rows = (await db.select().from(table).all()) as any[];

  return rows
    .filter((r: any) => !r.goalType || r.goalType === "saving")
    .map((row: any) => ({
      id: String(row.id ?? row.transactionIdText ?? ""),
      name: row.name ?? "",
      targetAmount: row.targetAmount,
      currentAmount: row.currentAmount ?? 0,
      deadline: row.endDate ?? row.deadline ?? "",
      createdAt: row.startDate ?? row.createdAt,
    }));
}

export async function createGoal(value: GoalInput): Promise<void> {
  const deadline = (value as any).deadline ?? (value as any).endDate;

  if (!value.name || (value as any).targetAmount === undefined || !deadline) {
    throw new Error("Invalid user input");
  }

  const table =
    (financialGoals as any) ?? (require("@/shared/schema") as any).goals;

  if ((value as any).id) {
    const existing = db
      .select()
      .from(table)
      .where(eq(table.id, (value as any).id))
      .get();

    if (existing) {
      throw new Error("Goal with this ID already exists");
    }
  }

  // Normalize: strip time portion if full ISO string was passed
  const toDateStr = (val: string | undefined): string => {
    if (!val) return new Date().toISOString().split("T")[0];
    return val.includes("T") ? val.split("T")[0] : val;
  };

  await db
    .insert(table)
    .values({
      userId: (value as any).userId ?? DEFAULT_USER_ID,
      goalType: (value as any).goalType ?? "saving",
      categoryId: (value as any).categoryId ?? null,
      name: value.name,
      targetAmount: (value as any).targetAmount,
      currentAmount: (value as any).currentAmount ?? 0,
      startDate: toDateStr((value as any).startDate),
      endDate: toDateStr(deadline),
      alertMessage: undefined,
    })
    .run();
}

export async function updateGoalAmount(
  goalId: string,
  amount: number,
): Promise<void> {
  const table =
    (financialGoals as any) ?? (require("@/shared/schema") as any).goals;
  await db
    .update(table)
    .set({ currentAmount: amount })
    .where(eq(table.id, Number(goalId)))
    .run();
}

export async function deleteGoal(goalId: string): Promise<void> {
  const table =
    (financialGoals as any) ?? (require("@/shared/schema") as any).goals;

  const existing = db
    .select()
    .from(table)
    .where(eq(table.id, Number(goalId)))
    .get();

  if (!existing) {
    throw new Error("Goal does not exist.");
  }

  await db
    .delete(table)
    .where(eq(table.id, Number(goalId)))
    .run();
}

export async function replaceGoals(values: SavingsGoal[]): Promise<void> {
  const table =
    (financialGoals as any) ?? (require("@/shared/schema") as any).goals;
  await db.delete(table).run();
  for (const goal of values) {
    await createGoal(goal);
  }
}
