// --- 1. BLOKUJEMY PLIK BAZY DANYCH ZANIM COKOLWIEK INNEGO SIĘ ZAŁADUJE ---
jest.mock("@/shared/client", () => ({
  db: {}, // Pusta atrapa
}));
// ------------------------------------------------------------------------

import { processTransactionForGoals } from "./goal-transactions-service";
import * as goalsRepo from "../repositories/goals-repository";
import * as alertsRepo from "../repositories/alerts-repository";
import { FinancialGoal, Transaction } from "@/shared/types/finance";

// Blokujemy uderzenia do repozytoriów
jest.mock("../repositories/goals-repository");
jest.mock("../repositories/alerts-repository");

describe("Integration Test: Transaction -> Goal -> Alert", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("powinno zaktualizować cel i wygenerować alert, jeśli transakcja pasuje do kategorii i mieści się w czasie", async () => {
    const mockGoal: FinancialGoal = {
      id: "goal-1",
      userId: 1,
      goalType: "saving",
      categoryId: 99,
      name: "Rower",
      targetAmount: 1000,
      currentAmount: 500,
      startDate: "2026-01-01T00:00:00.000Z",
      endDate: "2026-12-31T23:59:59.000Z",
    };

    (goalsRepo.listGoals as jest.Mock).mockResolvedValue([mockGoal]);

    const importedTransaction = {
      id: 1,
      amount: 500,
      categoryId: 99,
      date: "2026-06-15T12:00:00.000Z",
      description: "Wpłata na rower",
    } as Transaction;

    await processTransactionForGoals(importedTransaction);

    expect(goalsRepo.updateGoalAmount).toHaveBeenCalledWith("goal-1", 1000);
    expect(alertsRepo.createAlert).toHaveBeenCalledWith(
      expect.objectContaining({ type: "goal_achieved" }),
    );
  });

  it("NIE powinno robić nic, jeśli transakcja należy do innej kategorii", async () => {
    const mockGoal: FinancialGoal = {
      id: "goal-1",
      userId: 1,
      goalType: "saving",
      categoryId: 99,
      name: "Rower",
      targetAmount: 1000,
      currentAmount: 500,
      startDate: "2026-01-01T00:00:00.000Z",
      endDate: "2026-12-31T23:59:59.000Z",
    };

    (goalsRepo.listGoals as jest.Mock).mockResolvedValue([mockGoal]);

    const regularTransaction = {
      id: 2,
      amount: 50,
      categoryId: 42,
      date: "2026-06-15T12:00:00.000Z",
    } as Transaction;

    await processTransactionForGoals(regularTransaction);

    expect(goalsRepo.updateGoalAmount).not.toHaveBeenCalled();
    expect(alertsRepo.createAlert).not.toHaveBeenCalled();
  });
});
