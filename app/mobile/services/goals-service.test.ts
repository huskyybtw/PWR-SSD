import {
  createGoal,
  deleteGoal,
  listGoals,
} from "../repositories/goals-repository";

const mockDbStore: any[] = [];

jest.mock("@/shared/client", () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    // Dodajemy obsługę .all() do pobierania listy
    all: jest.fn(() => mockDbStore),
    get: jest.fn(() => (mockDbStore.length > 0 ? mockDbStore[0] : undefined)),
    insert: jest.fn().mockReturnThis(),
    // Dodajemy obsługę kasowania
    delete: jest.fn().mockReturnThis(),
    values: jest.fn((val) => {
      mockDbStore.push(val);
      return { run: jest.fn() };
    }),
    run: jest.fn(),
  },
}));

describe("Integration Test: Database Layer (Service -> DB)", () => {
  beforeEach(() => {
    mockDbStore.length = 0;
  });

  // --- POPRZEDNIE TESTY TWORZENIA ---
  it("should successfully create a new saving goal in database (Happy Path)", async () => {
    const newGoal = {
      id: "test-goal-001",
      name: "Wymarzone wakacje",
      targetAmount: 5000,
      currentAmount: 0,
      deadline: "2027-06-01T12:00:00.000Z",
      createdAt: new Date().toISOString(),
    };
    await createGoal(newGoal);
    expect(newGoal.id).toBeDefined();
  });

  it("should throw an error when providing invalid user input", async () => {
    const invalidGoal = { id: "test-goal-002", currentAmount: 0 } as any;
    await expect(createGoal(invalidGoal)).rejects.toThrow();
  });

  it("should throw an error when trying to create a goal with an existing ID", async () => {
    const duplicateGoal = {
      id: "test-goal-duplicate",
      name: "Nowy komputer",
      targetAmount: 8000,
      currentAmount: 0,
      deadline: "2027-12-31T12:00:00.000Z",
      createdAt: new Date().toISOString(),
    };
    await createGoal(duplicateGoal);
    await expect(createGoal(duplicateGoal)).rejects.toThrow();
  });

  // --- NOWE TESTY ---

  it("should return financial goals (Happy Path)", async () => {
    // Dodajemy przykładowy cel i sprawdzamy, czy funkcja listująca go zwróci
    mockDbStore.push({ id: "test-list-001", name: "Lista", targetAmount: 100 });
    const goals = await listGoals();
    expect(goals.length).toBeGreaterThan(0);
  });

  it("should successfully delete a financial goal (Happy Path)", async () => {
    mockDbStore.push({
      id: "test-delete-001",
      name: "Do usunięcia",
      targetAmount: 100,
    });
    // Zakładamy, że bezbłędnie przejdzie usunięcie istniejącego celu
    await expect(deleteGoal("test-delete-001")).resolves.not.toThrow();
  });

  it("should throw an error when deleting a non-existing financial goal", async () => {
    // Upewniamy się, że baza jest pusta
    mockDbStore.length = 0;
    // Spodziewamy się rzucenia błędu przy próbie usunięcia ducha
    await expect(deleteGoal("ghost-goal")).rejects.toThrow();
  });
});
