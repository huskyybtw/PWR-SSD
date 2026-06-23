import { Transaction, FinancialGoal } from "@/shared/types/finance";
import { listGoals, updateGoalAmount } from "../repositories/goals-repository";
import { createAlert } from "../repositories/alerts-repository";
import { parseISO } from "date-fns";

export async function processTransactionForGoals(
  transaction: Transaction,
): Promise<void> {
  // 1. Pobieramy wszystkie cele z bazy
  const goals = await listGoals();

  // Bezpieczne parsowanie daty transakcji
  const transactionDate = parseISO(transaction.date).getTime();

  // 2. Filtrujemy cele - szukamy tych z tą samą kategorią, w których ramach czasowych mieści się transakcja
  const affectedGoals = goals.filter((goal) => {
    const start = parseISO(goal.startDate).getTime();
    const end = parseISO(goal.endDate).getTime();

    return (
      goal.categoryId === transaction.categoryId &&
      transactionDate >= start &&
      transactionDate <= end
    );
  });

  // 3. System updates saving goal progress (Zadanie od PM-a)
  for (const goal of affectedGoals) {
    const newAmount = goal.currentAmount + transaction.amount;
    await updateGoalAmount(goal.id, newAmount);

    // 4. Alert is generated in case of reaching a goal (Zadanie od PM-a)
    if (newAmount >= goal.targetAmount) {
      await createAlert({
        id: `alert-goal-${Date.now()}-${goal.id}`,
        type: "goal_achieved",
        title: "Cel Osiągnięty!",
        message: `Gratulacje! Udało Ci się osiągnąć cel: ${goal.name}.`,
        read: false,
        createdAt: new Date().toISOString(),
        relatedId: goal.id,
      });
    }
  }
}
