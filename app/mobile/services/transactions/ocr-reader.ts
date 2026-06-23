import { GoogleGenAI, Type } from "@google/genai";
import { TransactionType } from "@/shared/types/finance";

export async function processReceiptWithAI(
  ai: GoogleGenAI,
  base64Data: string,
  mimeType: string,
  importTransactionsFn: (
    data: any[],
  ) => Promise<{ imported: any[]; skipped: any[] }>,
) {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        inlineData: { data: base64Data, mimeType },
      },
      "Carefully process this receipt image. Extract the total transaction price value, date, and vendor marketplace description name.",
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          amount: { type: Type.NUMBER },
          date: { type: Type.STRING, description: "YYYY-MM-DD format" },
          description: { type: Type.STRING },
        },
        required: ["amount", "date", "description"],
      },
    },
  });

  const parsedJSON = JSON.parse(response.text || "{}");

  const rawTxData = {
    amount: parsedJSON.amount,
    description: parsedJSON.description || "Scanned Receipt",
    date: parsedJSON.date || new Date().toISOString().split("T")[0],
    type: "expense" as TransactionType,
  };

  const result = await importTransactionsFn([rawTxData]);

  if (result.skipped.length > 0) {
    throw new Error("This receipt transaction has already been imported.");
  }

  return result.imported[0];
}
