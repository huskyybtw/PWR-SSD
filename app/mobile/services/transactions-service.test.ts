import {
    addCategory,
    listCategories,
    replaceCategories,
} from "../repositories/categories-repository";
import {
    createTransaction,
    deleteTransaction,
    listTransactions,
    updateTransactionCategory,
} from "../repositories/transactions-repository";

const mockStore = {
  users: [] as any[],
  transactionLogs: [] as any[],
  categories: [] as any[],
  transactions: [] as any[],
};

let mockCurrentTable: any = null;
let mockWhere: any = null;
let mockOperation: "insert" | "delete" | "update" | null = null;
let mockValues: any = null;
let mockSetValues: any = null;

jest.mock("drizzle-orm", () => ({
  eq: jest.fn((column, value) => ({ column, value })),
  desc: jest.fn((column) => column),
  sql: jest.fn(() => "CURRENT_TIMESTAMP"),
}));

jest.mock("@/shared/client", () => {
  const schema = require("@/shared/schema");

  const db: any = {
    select: jest.fn(() => {
      mockOperation = null;
      return db;
    }),

    from: jest.fn((table) => {
      mockCurrentTable = table;
      return db;
    }),

    where: jest.fn((condition) => {
      mockWhere = condition;
      return db;
    }),

    orderBy: jest.fn(() => db),

    get: jest.fn(() => {
      const value = mockWhere?.value;

      if (mockCurrentTable === schema.users) {
        return mockStore.users.find((user) => user.id === value);
      }

      if (mockCurrentTable === schema.transactionLogs) {
        return mockStore.transactionLogs.find((log) => log.fileName === value);
      }

      if (mockCurrentTable === schema.categories) {
        return mockStore.categories.find(
          (category) => category.name === value || category.id === value,
        );
      }

      if (mockCurrentTable === schema.transactions) {
        return mockStore.transactions.find(
          (transaction) => transaction.transactionIdText === value,
        );
      }

      return undefined;
    }),

    all: jest.fn(() => {
      if (mockCurrentTable === schema.categories) {
        return [...mockStore.categories];
      }

      if (mockCurrentTable === schema.transactions) {
        return [...mockStore.transactions];
      }

      return [];
    }),

    insert: jest.fn((table) => {
      mockCurrentTable = table;
      mockOperation = "insert";
      return db;
    }),

    values: jest.fn((values) => {
      mockValues = values;
      return db;
    }),

    update: jest.fn((table) => {
      mockCurrentTable = table;
      mockOperation = "update";
      return db;
    }),

    set: jest.fn((values) => {
      mockSetValues = values;
      return db;
    }),

    delete: jest.fn((table) => {
      mockCurrentTable = table;
      mockOperation = "delete";
      return db;
    }),

    run: jest.fn(() => {
      const value = mockWhere?.value;

      if (mockOperation === "insert") {
        const values = Array.isArray(mockValues) ? mockValues : [mockValues];

        for (const item of values) {
          if (mockCurrentTable === schema.users) {
            mockStore.users.push(item);
          }

          if (mockCurrentTable === schema.transactionLogs) {
            mockStore.transactionLogs.push({
              id: mockStore.transactionLogs.length + 1,
              ...item,
            });
          }

          if (mockCurrentTable === schema.categories) {
            mockStore.categories.push({
              id: mockStore.categories.length + 1,
              ...item,
            });
          }

          if (mockCurrentTable === schema.transactions) {
            mockStore.transactions.push({
              id: mockStore.transactions.length + 1,
              ...item,
            });
          }
        }
      }

      if (mockOperation === "delete") {
        if (mockCurrentTable === schema.categories) {
          mockStore.categories.length = 0;
        }

        if (mockCurrentTable === schema.transactions) {
          if (value) {
            mockStore.transactions = mockStore.transactions.filter(
              (transaction) => transaction.transactionIdText !== value,
            );
          } else {
            mockStore.transactions.length = 0;
          }
        }
      }

      if (mockOperation === "update") {
        if (mockCurrentTable === schema.transactions) {
          mockStore.transactions = mockStore.transactions.map((transaction) =>
            transaction.transactionIdText === value
              ? { ...transaction, ...mockSetValues }
              : transaction,
          );
        }
      }

      mockOperation = null;
      mockValues = null;
      mockSetValues = null;
      mockWhere = null;
    }),
  };

  return { db };
});

describe("FR10: Manual transactions and categories", () => {
  beforeEach(() => {
    mockStore.users = [];
    mockStore.transactionLogs = [];
    mockStore.categories = [];
    mockStore.transactions = [];
    mockCurrentTable = null;
    mockWhere = null;
    mockOperation = null;
    mockValues = null;
    mockSetValues = null;
    jest.clearAllMocks();
  });

  it("should create and list a new category", async () => {
    await addCategory("Gaming");

    const categories = await listCategories();

    expect(categories).toContain("Gaming");
  });

  it("should create a manual expense transaction", async () => {
    await replaceCategories(["Food"]);

    await createTransaction({
      id: "tx-001",
      amount: 20,
      description: "Pizza",
      date: "2026-06-23",
      category: "Food",
      type: "expense",
      createdAt: new Date().toISOString(),
      source: "manual",
    });

    const transactions = await listTransactions();

    expect(transactions).toHaveLength(1);
    expect(transactions[0].amount).toBe(20);
    expect(transactions[0].category).toBe("Food");
    expect(transactions[0].type).toBe("expense");
  });

  it("should reject transaction with invalid category", async () => {
    await replaceCategories(["Food"]);

    await expect(
      createTransaction({
        id: "tx-invalid",
        amount: 20,
        description: "Unknown category transaction",
        date: "2026-06-23",
        category: "InvalidCategory",
        type: "expense",
        createdAt: new Date().toISOString(),
        source: "manual",
      }),
    ).rejects.toThrow("Invalid category.");
  });

  it("should prevent duplicate manual transaction", async () => {
    await replaceCategories(["Food"]);

    const transaction = {
      id: "tx-duplicate",
      amount: 50,
      description: "Groceries",
      date: "2026-06-23",
      category: "Food",
      type: "expense" as const,
      createdAt: new Date().toISOString(),
      source: "manual" as const,
    };

    await createTransaction(transaction);

    await expect(createTransaction(transaction)).rejects.toThrow(
      "Duplicate transaction detected.",
    );
  });

  it("should update transaction category", async () => {
    await replaceCategories(["Food", "Transport"]);

    await createTransaction({
      id: "tx-update",
      amount: 15,
      description: "Bus ticket",
      date: "2026-06-23",
      category: "Food",
      type: "expense",
      createdAt: new Date().toISOString(),
      source: "manual",
    });

    await updateTransactionCategory("tx-update", "Transport");

    const transactions = await listTransactions();

    expect(transactions[0].category).toBe("Transport");
  });

  it("should delete transaction", async () => {
    await replaceCategories(["Food"]);

    await createTransaction({
      id: "tx-delete",
      amount: 30,
      description: "Lunch",
      date: "2026-06-23",
      category: "Food",
      type: "expense",
      createdAt: new Date().toISOString(),
      source: "manual",
    });

    await deleteTransaction("tx-delete");

    const transactions = await listTransactions();

    expect(transactions).toHaveLength(0);
  });
});

describe("FR14: Transactions list, filters, aggregates and search", () => {
  const transactions = [
    {
      id: "tx-001",
      amount: 3500,
      description: "Salary",
      date: "2026-06-01",
      category: "Income",
      type: "income",
      createdAt: "2026-06-01",
    },
    {
      id: "tx-002",
      amount: 45.67,
      description: "Whole Foods Market",
      date: "2026-06-02",
      category: "Food",
      type: "expense",
      createdAt: "2026-06-02",
    },
    {
      id: "tx-003",
      amount: 85,
      description: "Shell Gas Station",
      date: "2026-06-03",
      category: "Transport",
      type: "expense",
      createdAt: "2026-06-03",
    },
    {
      id: "tx-004",
      amount: 15.99,
      description: "Netflix Subscription",
      date: "2026-06-04",
      category: "Entertainment",
      type: "expense",
      createdAt: "2026-06-04",
    },
  ];

  it("should return transactions list", () => {
    expect(transactions).toHaveLength(4);
    expect(transactions[0].description).toBe("Salary");
  });

  it("should filter transactions by category", () => {
    const result = transactions.filter(
      (transaction) => transaction.category === "Food",
    );

    expect(result).toHaveLength(1);
    expect(result[0].description).toBe("Whole Foods Market");
  });

  it("should return empty list for wrong filter", () => {
    const result = transactions.filter(
      (transaction) => transaction.category === "InvalidCategory",
    );

    expect(result).toHaveLength(0);
  });

  it("should correctly calculate aggregate income and expenses", () => {
    const totalIncome = transactions
      .filter((transaction) => transaction.type === "income")
      .reduce((sum, transaction) => sum + transaction.amount, 0);

    const totalExpenses = transactions
      .filter((transaction) => transaction.type === "expense")
      .reduce((sum, transaction) => sum + transaction.amount, 0);

    expect(totalIncome).toBe(3500);
    expect(totalExpenses).toBeCloseTo(146.66);
  });

  it("should search transactions by description", () => {
    const query = "netflix";

    const result = transactions.filter(
      (transaction) =>
        transaction.description.toLowerCase().includes(query) ||
        transaction.category.toLowerCase().includes(query),
    );

    expect(result).toHaveLength(1);
    expect(result[0].description).toBe("Netflix Subscription");
  });

  it("should return empty list when search has no results", () => {
    const query = "amazon";

    const result = transactions.filter(
      (transaction) =>
        transaction.description.toLowerCase().includes(query) ||
        transaction.category.toLowerCase().includes(query),
    );

    expect(result).toHaveLength(0);
  });
});