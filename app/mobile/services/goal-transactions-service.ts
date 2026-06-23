import { Transaction } from "@/shared/types/finance";
import { listGoals, updateGoalAmount } from "../repositories/goals-repository";
import { createAlert } from "../repositories/alerts-repository";

export async function processTransactionForGoal(
  transaction: Transaction,
): Promise<void> {
  // 1. Tarcza: Jeśli transakcja nie ma dopisanego celu (np. zwykłe zakupy), przerywamy i nic nie robimy
  if (!transaction.goalId) {
    return;
  }

  // 2. Pobieramy cele z bazy i szukamy tego, którego dotyczy wpłata
  const goals = await listGoals();
  const targetGoal = goals.find((g) => g.id === transaction.goalId);

  if (!targetGoal) {
    return; // Cel nie istnieje w bazie, przerywamy
  }

  // 3. System updates saving goal progress (Wymaganie nr 1 od PM-a)
  const newAmount = targetGoal.currentAmount + transaction.amount;
  await updateGoalAmount(targetGoal.id, newAmount);

  // 4. Alert is generated in case of reaching a goal (Wymaganie nr 2 od PM-a)
  // Sprawdzamy, czy nowa kwota przekroczyła lub zrównała się z celem
  if (newAmount >= targetGoal.targetAmount) {
    await createAlert({
      id: `alert-goal-${Date.now()}`,
      type: "goal_achieved",
      title: "Cel Osiągnięty!",
      message: `Gratulacje! Udało Ci się osiągnąć cel: ${targetGoal.name}.`,
      read: false,
      createdAt: new Date().toISOString(),
      relatedId: targetGoal.id,
    });
  }
}
