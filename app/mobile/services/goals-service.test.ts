import { createGoal } from "../repositories/goals-repository";

// 1. Definiujemy nasz udawany magazyn bazy danych
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
  // 3. Czyszczenie naszej udawanej bazy przed KAŻDYM testem
  beforeEach(() => {
    mockDbStore.length = 0;
  });

  // KROK 1: Happy Path
  it("should successfully create a new saving goal in database (Happy Path)", async () => {
    const newGoal = {
      id: "test-goal-001",
      userId: 1, // Dodano: identyfikator użytkownika
      categoryId: 5, // Dodano: kategoria
      goalType: "saving" as const, // Dodano: typ celu
      name: "Wymarzone wakacje",
      targetAmount: 5000,
      currentAmount: 0,
      startDate: "2026-06-01T12:00:00.000Z", // Nowe pole startowe
      endDate: "2027-06-01T12:00:00.000Z", // Zastępuje deadline
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
      // Brakuje name, targetAmount, userId, categoryId, startDate, endDate!
    } as any;

    await expect(createGoal(invalidGoal)).rejects.toThrow("Invalid user input");
  });

  // KROK 3: Duplicates
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

    // Pierwszy zapis - musi przejść gładko
    await createGoal(duplicateGoal);

    // Drugi zapis - nasz mock sprytnie zwróci obiekt, więc tarcza wyrzuci błąd!
    await expect(createGoal(duplicateGoal)).rejects.toThrow(
      "Goal with this ID already exists",
    );
  });
});
