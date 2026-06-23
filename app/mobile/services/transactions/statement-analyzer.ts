import { GoogleGenAI, Type } from "@google/genai";
import { TransactionType } from "@/shared/types/finance";

export interface ExtractedStatementTransaction {
  amount: number;
  description: string;
  date: string;
  type: TransactionType;
}

/**
 * Sends a base64 bank statement document to Gemini AI and extracts an array of structured transactions.
 */
export async function processStatementWithAI(
  ai: GoogleGenAI,
  base64Data: string,
  mimeType: string,
  importTransactionsFn: (
    data: ExtractedStatementTransaction[],
  ) => Promise<{ imported: any[]; skipped: any[] }>,
) {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        inlineData: { data: base64Data, mimeType },
      },
      "Extract all individual list transactions from this bank statement document. For each transaction row, determine if it is an expense (negative amount/outgoing) or income (positive amount/incoming), and capture the absolute value price, transaction date, and description counterparty name.",
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          transactions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                amount: {
                  type: Type.NUMBER,
                  description:
                    "The positive absolute number of the transaction",
                },
                date: { type: Type.STRING, description: "YYYY-MM-DD format" },
                description: {
                  type: Type.STRING,
                  description:
                    "Vendor, counterparty or transaction description details",
                },
                type: { type: Type.STRING, enum: ["expense", "income"] },
              },
              required: ["amount", "date", "description", "type"],
            },
          },
        },
        required: ["transactions"],
      },
    },
  });

  const parsedJSON = JSON.parse(response.text || "{}");
  const extractedList: ExtractedStatementTransaction[] =
    parsedJSON.transactions || [];

  // Normalize data data fallback safety mappings
  const normalizedTransactions = extractedList.map((tx) => ({
    amount: tx.amount || 0,
    description: tx.description || "Bank Transaction",
    date: tx.date || new Date().toISOString().split("T")[0],
    type: tx.type || "expense",
  }));

  // Send the array down to the transaction-service pipeline repository mapping
  return await importTransactionsFn(normalizedTransactions);
}
