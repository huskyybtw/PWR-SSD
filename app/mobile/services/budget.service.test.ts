import {
  createBudget,
  deleteBudget,
  listBudgets,
} from "../repositories/budgets-repository";

jest.mock("expo-sqlite", () => ({ openDatabaseSync: jest.fn(() => ({})) }));
jest.mock("drizzle-orm", () => ({ eq: jest.fn() }));
jest.mock("@/shared/schema", () => ({
  goals: { id: "mock-goal-id" },
  budgets: { id: "mock-budget-id" },
}));

const mockDbStore: any[] = [];

jest.mock("@/shared/client", () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    get: jest.fn(() => (mockDbStore.length > 0 ? mockDbStore[0] : undefined)),
    all: jest.fn(() => [...mockDbStore]),

    insert: jest.fn().mockReturnThis(),
    values: jest.fn((val) => {
      if (Array.isArray(val)) {
        mockDbStore.push(...val);
      } else {
        mockDbStore.push(val);
      }

      return { run: jest.fn() };
    }),

    delete: jest.fn().mockReturnThis(),
    run: jest.fn(() => {
      mockDbStore.length = 0;
    }),
  },
}));

describe("Integration Test: Budgets Database Layer", () => {
  beforeEach(() => {
    mockDbStore.length = 0;
    jest.clearAllMocks();
  });

  it("should successfully create a new budget in database (Happy Path)", async () => {
    const newBudget = {
      id: "test-budget-001",
      name: "Monthly Food Budget",
      amount: 600,
      category: "Food",
      period: "monthly" as const,
      startDate: "2026-06-01",
      endDate: "2026-06-30",
      createdAt: new Date().toISOString(),
    };

    await createBudget(newBudget);

    const budgets = await listBudgets();

    expect(budgets).toHaveLength(1);
    expect(budgets[0].id).toBe("test-budget-001");
    expect(budgets[0].name).toBe("Monthly Food Budget");
  });

  it("should return current budgets from database", async () => {
    const budget = {
      id: "test-budget-002",
      name: "Transport Budget",
      amount: 300,
      category: "Transport",
      period: "monthly" as const,
      startDate: "2026-06-01",
      endDate: "2026-06-30",
      createdAt: new Date().toISOString(),
    };

    await createBudget(budget);

    const budgets = await listBudgets();

    expect(budgets).toHaveLength(1);
    expect(budgets[0].category).toBe("Transport");
  });

  it("should throw an error when providing invalid user input", async () => {
    const invalidBudget = {
      id: "test-budget-invalid",
      amount: 0,
      category: "Food",
      period: "monthly",
      startDate: "2026-06-01",
      endDate: "2026-06-30",
      createdAt: new Date().toISOString(),
    } as any;

    await expect(createBudget(invalidBudget)).rejects.toThrow();
  });

  it("should throw an error when trying to create duplicate budget", async () => {
    const duplicateBudget = {
      id: "test-budget-duplicate",
      name: "Entertainment Budget",
      amount: 100,
      category: "Entertainment",
      period: "monthly" as const,
      startDate: "2026-06-01",
      endDate: "2026-06-30",
      createdAt: new Date().toISOString(),
    };

    await createBudget(duplicateBudget);

    await expect(createBudget(duplicateBudget)).rejects.toThrow();
  });

  it("should successfully delete an existing budget", async () => {
    const budget = {
      id: "test-budget-delete",
      name: "Delete Test Budget",
      amount: 250,
      category: "Shopping",
      period: "monthly" as const,
      startDate: "2026-06-01",
      endDate: "2026-06-30",
      createdAt: new Date().toISOString(),
    };

    await createBudget(budget);
    await deleteBudget(budget.id);

    const budgets = await listBudgets();

    expect(budgets).toHaveLength(0);
  });

  it("should throw an error when deleting non-existing budget", async () => {
    await expect(deleteBudget("missing-budget-id")).rejects.toThrow(
      "Budget does not exist.",
    );
  });
});
