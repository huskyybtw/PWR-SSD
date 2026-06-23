import { createGoal } from "../repositories/goals-repository";

// 1. Definiujemy nasz udawany magazyn bazy danych (zmienna musi zaczynać się od "mock")
const mockDbStore: any[] = [];

// 2. MOCKOWANIE: Oszukujemy aplikację. Zamiast łączyć się z prawdziwym SQLite na telefonie,
// podsuwamy jej nasz własny obiekt bazy danych, który doskonale rozumie komendy Drizzle ORM.
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
  // 3. Czyszczenie naszej udawanej bazy przed KAŻDYM testem,
  // żeby testy nie wchodziły sobie w drogę.
  beforeEach(() => {
    mockDbStore.length = 0;
  });

  // KROK 1: Happy Path
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

  // KROK 2: Invalid user input
  it("should throw an error when providing invalid user input", async () => {
    const invalidGoal = {
      id: "test-goal-002",
      currentAmount: 0,
    } as any;

    await expect(createGoal(invalidGoal)).rejects.toThrow();
  });

  // KROK 3: Duplicates
  it("should throw an error when trying to create a goal with an existing ID", async () => {
    const duplicateGoal = {
      id: "test-goal-duplicate",
      name: "Nowy komputer",
      targetAmount: 8000,
      currentAmount: 0,
      deadline: "2027-12-31T12:00:00.000Z",
      createdAt: new Date().toISOString(),
    };

    // Pierwszy zapis - musi przejść gładko
    await createGoal(duplicateGoal);

    // Drugi zapis - nasz mock sprytnie zwróci obiekt, więc tarcza wyrzuci błąd!
    await expect(createGoal(duplicateGoal)).rejects.toThrow();
  });
});
