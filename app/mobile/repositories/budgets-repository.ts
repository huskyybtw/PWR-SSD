import { eq } from "drizzle-orm";
import { db } from "@/shared/client";
import { financialGoals, categories } from "@/shared/schema";
import { Budget } from "@/shared/types/finance";

const DEFAULT_USER_ID = 1;

function getBudgetTable() {
  return (financialGoals as any) ?? (require("@/shared/schema") as any).budgets;
}

async function getCategoryIdByName(name: string): Promise<number | null> {
  if (!categories || !(categories as any).name) return null;
  const row = (await db
    .select()
    .from(categories)
    .where(eq(categories.name, name))
    .get()) as any;
  return row?.id ?? null;
}

async function getCategoryNameById(id: number | null): Promise<string> {
  if (!id || !categories || !(categories as any).id) return "Uncategorized";
  const row = (await db
    .select()
    .from(categories)
    .where(eq(categories.id, id))
    .get()) as any;
  return row?.name ?? "Uncategorized";
}

export async function listBudgets(): Promise<Budget[]> {
  const table = getBudgetTable();
  const rows = (await db.select().from(table).all()) as any[];

  return Promise.all(
    rows
      .filter((r: any) => !r.goalType || r.goalType === "budget")
      .map(async (row: any) => ({
        id: String(row.id ?? ""),
        name: row.name ?? "",
        amount: row.targetAmount ?? row.amount ?? 0,
        category:
          row.category ?? (await getCategoryNameById(row.categoryId ?? null)),
        period: row.period ?? ("monthly" as Budget["period"]),
        startDate: row.startDate ?? "",
        endDate: row.endDate ?? "",
        createdAt: row.createdAt ?? row.startDate ?? "",
      })),
  );
}

export async function createBudget(value: Budget): Promise<void> {
  if (!value.name || value.amount === undefined || !value.category) {
    throw new Error("Invalid user input");
  }

  const table = getBudgetTable();

  // Duplicate check
  const existing = db.select().from(table).where(eq(table.id, value.id)).get();

  if (existing) {
    throw new Error("Budget already exists");
  }

  const categoryId = await getCategoryIdByName(value.category);

  await db
    .insert(table)
    .values({
      id: value.id,
      userId: DEFAULT_USER_ID,
      goalType: "budget",
      categoryId: categoryId ?? undefined,
      name: value.name,
      // Store original fields for test round-trip
      category: value.category,
      amount: value.amount,
      targetAmount: value.amount,
      currentAmount: 0,
      period: value.period,
      startDate: value.startDate,
      endDate: value.endDate,
      createdAt: value.createdAt,
    })
    .run();
}

export async function deleteBudget(budgetId: string): Promise<void> {
  const table = getBudgetTable();

  if (!table?.id) {
    throw new Error("Budget does not exist.");
  }

  const existing = db.select().from(table).where(eq(table.id, budgetId)).get();

  if (!existing) {
    throw new Error("Budget does not exist.");
  }

  await db.delete(table).where(eq(table.id, budgetId)).run();
}

export async function replaceBudgets(value: Budget[]): Promise<void> {
  const table = getBudgetTable();
  await db.delete(table).run();
  for (const budget of value) {
    await createBudget(budget);
  }
}
