import {
  isDuplicateTransaction,
  normalizeDescription,
  partitionNewTransactions,
} from "./duplicates";
import { Transaction } from "./types/finance";

let n = 0;
const tx = (over: Partial<Transaction>): Transaction => ({
  id: `id-${++n}`,
  amount: 10,
  description: "Test",
  date: "2021-10-06",
  category: "Bills",
  type: "expense",
  createdAt: "2021-10-06",
  source: "import",
  ...over,
});

describe("duplicate detection", () => {
  // The exact situation from the PKO statement: first import in Polish...
  const firstImport = [
    tx({ description: "OPŁATA ZA POLISĘ MARIUSZ WOJ", amount: 77 }),
    tx({ description: "WPŁATA DO ZUS MARIUSZ WOJ", amount: 1457.49 }),
    tx({ description: "WPŁATA DO ZUS MARIUSZ WOJ", amount: 1457.49, type: "income" }),
  ];

  it("skips a re-imported statement even when the AI words rows differently", () => {
    // ...second import came back translated.
    const secondImport = [
      tx({ description: "Payment for insurance (WARTA)", amount: 77 }),
      tx({ description: "Payment to ZUS (Social Security)", amount: 1457.49 }),
      tx({ description: "VAT-related income from ZUS", amount: 1457.49, type: "income" }),
    ];

    const { fresh, duplicates } = partitionNewTransactions(firstImport, secondImport);
    expect(fresh).toHaveLength(0);
    expect(duplicates).toHaveLength(3);
  });

  it("keeps genuinely new rows from an overlapping statement", () => {
    const next = [
      tx({ description: "Payment to ZUS", amount: 1457.49 }), // already imported
      tx({ description: "Biedronka", amount: 37.02, date: "2021-10-07" }), // new
    ];
    const { fresh } = partitionNewTransactions(firstImport, next);
    expect(fresh.map((t) => t.description)).toEqual(["Biedronka"]);
  });

  it("keeps two identical rows from the same document", () => {
    const rows = [
      tx({ description: "Żabka", amount: 12.5 }),
      tx({ description: "Żabka", amount: 12.5 }),
    ];
    expect(partitionNewTransactions([], rows).fresh).toHaveLength(2);
  });

  it("re-importing a document with two identical rows does not add them again", () => {
    const rows = [
      tx({ description: "Żabka", amount: 12.5 }),
      tx({ description: "Żabka", amount: 12.5 }),
    ];
    const again = [
      tx({ description: "ZABKA", amount: 12.5 }),
      tx({ description: "ZABKA", amount: 12.5 }),
      tx({ description: "ZABKA", amount: 12.5 }), // a third one is new
    ];
    const { fresh, duplicates } = partitionNewTransactions(rows, again);
    expect(duplicates).toHaveLength(2);
    expect(fresh).toHaveLength(1);
  });

  it("only blocks an import against a manual entry when the description matches", () => {
    const manual = [tx({ source: "manual", description: "Biedronka", amount: 37.02 })];
    expect(
      partitionNewTransactions(manual, [tx({ description: "BIEDRONKA", amount: 37.02 })]).fresh,
    ).toHaveLength(0);
    expect(
      partitionNewTransactions(manual, [tx({ description: "Lidl", amount: 37.02 })]).fresh,
    ).toHaveLength(1);
  });

  it("treats income and expense of the same amount as different rows", () => {
    const { fresh } = partitionNewTransactions(
      [tx({ amount: 100, type: "expense" })],
      [tx({ amount: 100, type: "income" })],
    );
    expect(fresh).toHaveLength(1);
  });

  it("normalizes Polish characters, case and punctuation", () => {
    expect(normalizeDescription("WPŁATA  do ZUS!")).toBe("wplata do zus");
    expect(
      isDuplicateTransaction(
        tx({ description: "Opłata za kartę" }),
        tx({ description: "OPLATA ZA KARTE" }),
      ),
    ).toBe(true);
  });
});
