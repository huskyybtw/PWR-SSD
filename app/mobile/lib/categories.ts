import { CategoryKeywordMap } from "@/types/finance";

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
