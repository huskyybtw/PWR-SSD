// Wyobrażamy sobie, że te funkcje zaraz napiszemy/podepniemy
import { processTransactionForGoal } from "./goal-transactions-service";
import * as goalsRepo from "../repositories/goals-repository";
import * as alertsRepo from "../repositories/alerts-repository";

// --- DODAJEMY TO: Blokujemy natywne Expo SQLite ---
jest.mock("expo-sqlite", () => ({
  openDatabaseSync: jest.fn(() => ({})),
}));
// --------------------------------------------------

// Blokujemy prawdziwe uderzenia do bazy
jest.mock("../repositories/goals-repository");
jest.mock("../repositories/alerts-repository");

describe("Integration Test: Transaction -> Goal -> Alert", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test 1: Happy path (Zadanie od PM-a)
  it("should update goal amount and generate alert when goal is reached", async () => {
    // Symulujemy cel, któremu brakuje 500 zł do osiągnięcia sukcesu
    const mockGoal = {
      id: "goal-1",
      name: "Rower",
      targetAmount: 1000,
      currentAmount: 500,
    };
    (goalsRepo.listGoals as jest.Mock).mockResolvedValue([mockGoal]);

    // Nowa transakcja wpada do systemu
    const importedTransaction = {
      id: "txn-1",
      amount: 500, // Akurat tyle, żeby dobić do celu!
      description: "Wpłata na rower",
      date: new Date().toISOString(),
      category: "savings",
      type: "expense",
      createdAt: new Date().toISOString(),
      source: "import",
      goalId: "goal-1", // Most zadziałał!
    } as any;

    await processTransactionForGoal(importedTransaction);

    // Sprawdzamy: Czy system zaktualizował kwotę do 1000?
    expect(goalsRepo.updateGoalAmount).toHaveBeenCalledWith("goal-1", 1000);
    // Sprawdzamy: Czy system wygenerował alert o sukcesie?
    expect(alertsRepo.createAlert).toHaveBeenCalledWith(
      expect.objectContaining({ type: "goal_achieved" }),
    );
  });

  // Test 2: Any other (Transakcja bez przypisanego celu)
  it("should do nothing if transaction is not linked to any goal", async () => {
    const regularTransaction = {
      id: "txn-2",
      amount: 50,
      type: "expense",
      goalId: undefined, // Zwykłe zakupy w biedronce, bez celu
    } as any;

    await processTransactionForGoal(regularTransaction);

    // Sprawdzamy: System nie powinien ruszać celów ani alertów
    expect(goalsRepo.updateGoalAmount).not.toHaveBeenCalled();
    expect(alertsRepo.createAlert).not.toHaveBeenCalled();
  });
});
