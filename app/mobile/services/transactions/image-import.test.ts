import { processReceiptWithAI } from "./ocr-reader";

describe("Service Layer: processReceiptWithAI", () => {
  let mockAI: any;
  let mockImportTransactionsFn: jest.Mock;

  beforeEach(() => {
    mockAI = {
      models: {
        generateContent: jest.fn().mockResolvedValue({
          text: JSON.stringify({
            amount: 37.02,
            date: "2015-03-27",
            description: "Biedronka",
          }),
        }),
      },
    };

    mockImportTransactionsFn = jest.fn().mockResolvedValue({
      imported: [
        {
          amount: 37.02,
          date: "2015-03-27",
          description: "Biedronka",
          type: "expense",
        },
      ],
      skipped: [],
    });
  });

  it("should successfully pass receipt data from Gemini down to the import handler", async () => {
    const result = await processReceiptWithAI(
      mockAI,
      "fake-base64-string",
      "image/jpeg",
      mockImportTransactionsFn,
    );

    expect(mockAI.models.generateContent).toHaveBeenCalledTimes(1);

    expect(mockImportTransactionsFn).toHaveBeenCalledWith([
      {
        amount: 37.02,
        date: "2015-03-27",
        description: "Biedronka",
        type: "expense",
      },
    ]);

    expect(result.amount).toBe(37.02);
    expect(result.description).toBe("Biedronka");
  });

  it("should reject and throw if downward pipeline flags a duplicate status", async () => {
    mockImportTransactionsFn.mockResolvedValue({
      imported: [],
      skipped: [{ amount: 37.02, description: "Biedronka" }],
    });

    await expect(
      processReceiptWithAI(
        mockAI,
        "fake-base64-string",
        "image/jpeg",
        mockImportTransactionsFn,
      ),
    ).rejects.toThrow("This receipt transaction has already been imported.");
  });
});
