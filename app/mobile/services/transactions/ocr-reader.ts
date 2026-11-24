import { Type, type Schema } from "@google/genai";

import {
  generateJsonWithRetry,
  type GeminiProgress,
} from "@/services/ai/gemini";
import {
  categoryHint,
  VERBATIM_HINT,
  ImportTransactionsFn,
  normalizeAmount,
  normalizeDate,
  pickCategory,
  RawImportedTransaction,
  todayIso,
} from "./ai-shared";

interface ReceiptJson {
  amount?: number | string;
  date?: string;
  description?: string;
  category?: string;
}

export interface AiImportOptions {
  categories?: string[];
  onProgress?: (progress: GeminiProgress) => void;
}

export async function processReceiptWithAI(
  base64Data: string,
  mimeType: string,
  importTransactionsFn: ImportTransactionsFn,
  options: AiImportOptions = {},
) {
  const { categories, onProgress } = options;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      amount: {
        type: Type.NUMBER,
        description: "Total amount paid (SUMA / DO ZAPŁATY), positive number in PLN",
      },
      date: { type: Type.STRING, description: "Purchase date, YYYY-MM-DD" },
      description: {
        type: Type.STRING,
        description: "Store / merchant name exactly as printed, e.g. BIEDRONKA",
      },
      ...(categories?.length
        ? { category: { type: Type.STRING, enum: categories } }
        : {}),
    },
    required: ["amount", "date", "description"],
  };

  const parsed = await generateJsonWithRetry<ReceiptJson>({
    contents: [
      { inlineData: { data: base64Data, mimeType } },
      "Carefully read this shopping receipt (usually Polish, amounts in PLN). " +
        "Extract the TOTAL amount paid (SUMA / SUMA PLN / DO ZAPŁATY, not a single line item), " +
        "the purchase date and the store/merchant name." +
        VERBATIM_HINT +
        categoryHint(categories),
    ],
    schema,
    onProgress,
  });

  const amount = normalizeAmount(parsed.amount);
  if (amount === null) {
    throw new Error(
      "Could not find the total amount on this receipt. Try a sharper photo.",
    );
  }

  const rawTxData: RawImportedTransaction = {
    amount,
    description: parsed.description?.trim() || "Scanned Receipt",
    date: normalizeDate(parsed.date) ?? todayIso(),
    type: "expense",
  };
  const category = pickCategory(parsed.category, categories);
  if (category) rawTxData.category = category;

  const result = await importTransactionsFn([rawTxData]);

  if (result.skipped.length > 0) {
    throw new Error("This receipt transaction has already been imported.");
  }

  return result.imported[0];
}
