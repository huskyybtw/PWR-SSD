import { processStatementWithAI } from "./statement-analyzer";

describe("Service Layer: processStatementWithAI against PKO Statement", () => {
  let mockAI: any;
  let mockImportTransactionsFn: jest.Mock;

  beforeEach(() => {
    mockAI = {
      models: {
        generateContent: jest.fn().mockResolvedValue({
          text: JSON.stringify({
            transactions: [
              {
                amount: 30.0,
                date: "2021-10-01",
                description: "OPŁ. ZA KARTĘ ZGODNIE Z TPIO",
                type: "expense",
              },
              {
                amount: 107.95,
                date: "2021-10-03",
                description: "www.allegro.pl Allegro",
                type: "expense",
              },
              {
                amount: 1457.49,
                date: "2021-10-06",
                description:
                  "WPLATA DO ZUS MARIUSZ WOJCIECHOWSKI RAD/RACH. VAT",
                type: "income",
              },
            ],
          }),
        }),
      },
    };

    mockImportTransactionsFn = jest.fn().mockResolvedValue({
      imported: [
        {
          id: "1",
          amount: 30.0,
          date: "2021-10-01",
          description: "OPŁ. ZA KARTĘ",
        },
        {
          id: "2",
          amount: 107.95,
          date: "2021-10-03",
          description: "www.allegro.pl",
        },
        {
          id: "3",
          amount: 1457.49,
          date: "2021-10-06",
          description: "WPLATA DO ZUS",
        },
      ],
      skipped: [],
    });
  });

  it("should parse multiple rows from PKO statement output payload and pass it down to import engine", async () => {
    const result = await processStatementWithAI(
      mockAI,
      "fake-statement-base64",
      "application/pdf",
      mockImportTransactionsFn,
    );

    // Verify AI contract parameters were run correctly
    expect(mockAI.models.generateContent).toHaveBeenCalledTimes(1);

    // Verify correct parsing array mapping passed downstream
    expect(mockImportTransactionsFn).toHaveBeenCalledWith([
      {
        amount: 30.0,
        date: "2021-10-01",
        description: "OPŁ. ZA KARTĘ ZGODNIE Z TPIO",
        type: "expense",
      },
      {
        amount: 107.95,
        date: "2021-10-03",
        description: "www.allegro.pl Allegro",
        type: "expense",
      },
      {
        amount: 1457.49,
        date: "2021-10-06",
        description: "WPLATA DO ZUS MARIUSZ WOJCIECHOWSKI RAD/RACH. VAT",
        type: "income",
      },
    ]);

    // Verify pipeline summary payload delivery report metrics match
    expect(result.imported.length).toBe(3);
    expect(result.skipped.length).toBe(0);
  });
});
