import { eq } from "drizzle-orm";

import { db } from "@/shared/client";
import { categories } from "@/shared/schema";
import { CategoryKeywordMap } from "@/shared/types/finance";

export const DEFAULT_CATEGORIES = [
  "Food",
  "Transport",
  "Shopping",
  "Entertainment",
  "Bills",
  "Health",
  "Education",
  "Travel",
  "Uncategorized",
];

export const CATEGORY_KEYWORDS: CategoryKeywordMap = {
  Food: [
    "restaurant",
    "grocery",
    "food",
    "cafe",
    "coffee",
    "dining",
    "meal",
    "pizza",
    "burger",
    "supermarket",
    "bakery",
  ],
  Transport: [
    "uber",
    "lyft",
    "taxi",
    "gas",
    "fuel",
    "bus",
    "train",
    "metro",
    "parking",
    "toll",
    "car",
    "transport",
  ],
  Shopping: [
    "amazon",
    "shop",
    "store",
    "mall",
    "retail",
    "clothing",
    "fashion",
    "electronics",
    "purchase",
  ],
  Entertainment: [
    "netflix",
    "spotify",
    "movie",
    "cinema",
    "game",
    "streaming",
    "music",
    "concert",
    "ticket",
    "subscription",
  ],
  Bills: [
    "electric",
    "water",
    "internet",
    "phone",
    "rent",
    "mortgage",
    "insurance",
    "utility",
    "bill",
    "payment",
  ],
  Health: [
    "pharmacy",
    "doctor",
    "hospital",
    "medical",
    "dental",
    "health",
    "gym",
    "fitness",
    "wellness",
  ],
  Education: [
    "tuition",
    "book",
    "course",
    "school",
    "university",
    "college",
    "education",
    "learning",
    "training",
  ],
  Travel: [
    "hotel",
    "flight",
    "airline",
    "vacation",
    "booking",
    "trip",
    "tour",
    "resort",
    "travel",
  ],
};

export function autoCategorize(description: string): string {
  const lowerDesc = description.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerDesc.includes(keyword)) {
        return category;
      }
    }
  }

  return "Uncategorized";
}

export async function listCategories(): Promise<string[]> {
  const rows = await db.select().from(categories).all();

  if (rows.length === 0) {
    await replaceCategories(DEFAULT_CATEGORIES);
    return [...DEFAULT_CATEGORIES];
  }

  return rows.map((category) => category.name);
}

export async function addCategory(value: string): Promise<void> {
  const name = value.trim();

  if (!name) {
    throw new Error("Category name cannot be empty.");
  }

  const existingCategory = await db
    .select()
    .from(categories)
    .where(eq(categories.name, name))
    .get();

  if (existingCategory) {
    return;
  }

  await db.insert(categories).values({ name }).run();
}

export async function replaceCategories(value: string[]): Promise<void> {
  await db.delete(categories).run();

  const uniqueCategories = Array.from(
    new Set(value.map((category) => category.trim()).filter(Boolean)),
  );

  if (uniqueCategories.length > 0) {
    await db
      .insert(categories)
      .values(uniqueCategories.map((name) => ({ name })))
      .run();
  }
}

export async function categoryExists(value: string): Promise<boolean> {
  const existingCategory = await db
    .select()
    .from(categories)
    .where(eq(categories.name, value))
    .get();

  return Boolean(existingCategory);
}