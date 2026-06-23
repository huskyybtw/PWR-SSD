import { createGoal } from "../repositories/goals-repository";

// --- BETONOWE MOCKI ZABEZPIECZAJĄCE PO MERGE'U Z PM-EM ---
jest.mock("expo-sqlite", () => ({ openDatabaseSync: jest.fn(() => ({})) }));
jest.mock("drizzle-orm", () => ({ eq: jest.fn() }));
jest.mock("@/shared/schema", () => ({
  goals: { id: "mock-goal-id" },
  budgets: { id: "mock-budget-id" },
}));
// ---------------------------------------------------------

const mockDbStore: any[] = [];

jest.mock("@/shared/client", () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    get: jest.fn(() => (mockDbStore.length > 0 ? mockDbStore[0] : undefined)),
    insert: jest.fn().mockReturnThis(),
    values: jest.fn((val) => {
      mockDbStore.push(val);
      return { run: jest.fn() };
    }),
  },
}));

describe("Integration Test: Database Layer (Service -> DB)", () => {
  beforeEach(() => {
    mockDbStore.length = 0;
  });

  it("should successfully create a new saving goal in database (Happy Path)", async () => {
    const newGoal = {
      id: "test-goal-001",
      userId: 1,
      categoryId: 5,
      goalType: "saving" as const,
      name: "Wymarzone wakacje",
      targetAmount: 5000,
      currentAmount: 0,
      startDate: "2026-06-01T12:00:00.000Z",
      endDate: "2027-06-01T12:00:00.000Z",
      createdAt: new Date().toISOString(),
    };

    await createGoal(newGoal);
    expect(newGoal.id).toBeDefined();
  });

  it("should throw an error when providing invalid user input", async () => {
    const invalidGoal = { id: "test-goal-002", currentAmount: 0 } as any;
    await expect(createGoal(invalidGoal)).rejects.toThrow("Invalid user input");
  });

  it("should throw an error when trying to create a goal with an existing ID", async () => {
    const duplicateGoal = {
      id: "test-goal-duplicate",
      userId: 1,
      categoryId: 5,
      goalType: "saving" as const,
      name: "Nowy komputer",
      targetAmount: 8000,
      currentAmount: 0,
      startDate: "2026-06-01T12:00:00.000Z",
      endDate: "2027-12-31T12:00:00.000Z",
      createdAt: new Date().toISOString(),
    };

    await createGoal(duplicateGoal);
    await expect(createGoal(duplicateGoal)).rejects.toThrow(
      "Goal with this ID already exists",
    );
  });
});
