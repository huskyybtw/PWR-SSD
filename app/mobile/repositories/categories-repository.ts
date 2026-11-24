import { eq } from "drizzle-orm";

import { db } from "@/shared/client";
import { categories } from "@/shared/schema";
import { CategoryKeywordMap } from "@/shared/types/finance";

/** Income transactions always use this category and nothing else. */
export const INCOME_CATEGORY = "Income";

/** Categories that can be chosen for an expense. */
export function expenseCategories(all: string[]): string[] {
  return all.filter((c) => c !== INCOME_CATEGORY);
}

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
  INCOME_CATEGORY,
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
    "biedronka",
    "lidl",
    "zabka",
    "żabka",
    "carrefour",
    "auchan",
    "kaufland",
    "netto",
    "dino",
    "stokrotka",
    "lewiatan",
    "spożyw",
    "piekarnia",
    "restauracja",
    "kawiarnia",
    "mcdonald",
    "kfc",
    "glovo",
    "pyszne",
    "wolt",
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
    "orlen",
    "circle k",
    "lotos",
    "paliwo",
    "bolt",
    "jakdojade",
    "mpk",
    "pkp",
    "intercity",
    "parking",
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
    "allegro",
    "rossmann",
    "hebe",
    "zalando",
    "media markt",
    "mediamarkt",
    "rtv euro",
    "ikea",
    "pepco",
    "sklep",
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
    "czynsz",
    "prąd",
    "tauron",
    "pge",
    "enea",
    "orange",
    "t-mobile",
    "upc",
    "ubezpieczenie",
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
    "apteka",
    "lekarz",
    "medicover",
    "luxmed",
    "dentysta",
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
  return rows.map((category) => category.name);
}

/** Inserts any default categories that are missing. Safe to call on every start. */
export async function ensureDefaultCategories(): Promise<void> {
  const rows = await db.select().from(categories).all();
  const existing = new Set(rows.map((row) => row.name));
  const missing = DEFAULT_CATEGORIES.filter((name) => !existing.has(name));

  if (missing.length > 0) {
    await db
      .insert(categories)
      .values(missing.map((name) => ({ name })))
      .run();
  }
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