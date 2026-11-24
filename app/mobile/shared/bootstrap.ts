import { ensureDefaultCategories } from "@/repositories/categories-repository";
import { normalizeIncomeCategory } from "@/repositories/transactions-repository";
import { ensureDefaultUser } from "@/repositories/users-repository";
import { initDatabase } from "@/shared/client";

/**
 * Runs migrations and seeds the data every other part of the app relies on
 * (default user + default categories). Must finish before any service loads.
 */
export async function bootstrapApp(): Promise<void> {
  await initDatabase();
  await ensureDefaultUser();
  await ensureDefaultCategories();
  await normalizeIncomeCategory();
}
