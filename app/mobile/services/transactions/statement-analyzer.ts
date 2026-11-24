import { Type, type Schema } from "@google/genai";

import { generateJsonWithRetry } from "@/services/ai/gemini";
import { TransactionType } from "@/shared/types/finance";
import {
  categoryHint,
  VERBATIM_HINT,
  ImportTransactionsFn,
  normalizeAmount,
  normalizeDate,
  pickCategory,
  RawImportedTransaction,
} from "./ai-shared";
import type { AiImportOptions } from "./ocr-reader";

export interface ExtractedStatementTransaction {
  amount: number;
  description: string;
  date: string;
  type: TransactionType;
  category?: string;
}

/**
 * Sends a base64 bank statement document to Gemini and imports the extracted transactions.
 * Rows without a valid amount or date are dropped instead of being saved as 0 / today.
 */
export async function processStatementWithAI(
  base64Data: string,
  mimeType: string,
  importTransactionsFn: ImportTransactionsFn,
  options: AiImportOptions = {},
) {
  const { categories, onProgress } = options;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      transactions: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            amount: {
              type: Type.NUMBER,
              description: "The positive absolute amount of the transaction",
            },
            date: {
              type: Type.STRING,
              description: "Transaction (booking) date, YYYY-MM-DD",
            },
            description: {
              type: Type.STRING,
              description: "Counterparty / title exactly as printed, original language, not translated",
            },
            type: { type: Type.STRING, enum: ["expense", "income"] },
            ...(categories?.length
              ? { category: { type: Type.STRING, enum: categories } }
              : {}),
          },
          required: ["amount", "date", "description", "type"],
        },
      },
    },
    required: ["transactions"],
  };

  const parsed = await generateJsonWithRetry<{
    transactions?: Partial<ExtractedStatementTransaction>[];
  }>({
    contents: [
      { inlineData: { data: base64Data, mimeType } },
      "Extract every individual transaction row from this bank statement (usually a Polish bank such as PKO BP, amounts in PLN). " +
        "Skip opening/closing balances and summary rows. For each row decide if it is an expense (outgoing, negative, 'obciążenie') " +
        "or income (incoming, positive, 'uznanie'), and capture the absolute amount, the date and the counterparty/description." +
        VERBATIM_HINT +
        categoryHint(categories),
    ],
    schema,
    onProgress,
  });

  const rows: RawImportedTransaction[] = [];
  for (const tx of parsed.transactions ?? []) {
    const amount = normalizeAmount(tx.amount);
    const date = normalizeDate(tx.date);
    if (amount === null || date === null) continue;

    const row: RawImportedTransaction = {
      amount,
      description: tx.description?.trim() || "Bank Transaction",
      date,
      type: tx.type === "income" ? "income" : "expense",
    };
    const category = pickCategory(tx.category, categories);
    if (category) row.category = category;
    rows.push(row);
  }

  if (rows.length === 0) {
    throw new Error("No transactions found in this document.");
  }

  return await importTransactionsFn(rows);
}
