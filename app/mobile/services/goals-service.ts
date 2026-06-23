import { useCallback, useEffect, useState } from "react";
import {
  createGoal,
  deleteGoal,
  listGoals,
  replaceGoals,
  updateGoalAmount,
} from "@/repositories/goals-repository";
import { GoalProgress, FinancialGoal } from "@/shared/types/finance";
import { generateId } from "@/shared/utils";
import { isValid, parseISO } from "date-fns";

export function useGoalsService() {
  const [goals, setLocalGoals] = useState<FinancialGoal[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      const storedGoals = await listGoals();

      if (!active) return;

      if (storedGoals && storedGoals.length > 0) {
        setLocalGoals(storedGoals);
      } else {
        setLocalGoals([]);
        await replaceGoals([]);
      }

      setIsReady(true);
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  const addGoal = useCallback(
    async (data: Omit<FinancialGoal, "id" | "createdAt" | "currentAmount">) => {
      const start = parseISO(data.startDate);
      const end = parseISO(data.endDate);

      if (!isValid(start) || !isValid(end)) {
        throw new Error("Invalid start or end date.");
      }

      const newGoal: FinancialGoal = {
        ...data,
        id: generateId(),
        currentAmount: 0,
        createdAt: new Date().toISOString(),
      };

      const next = [...goals, newGoal];
      setLocalGoals(next);
      await createGoal(newGoal);
      return newGoal;
    },
    [goals],
  );

  const updateAmount = useCallback(
    async (goalId: string, amount: number) => {
      const goal = goals.find((candidate) => candidate.id === goalId);
      if (!goal) return null;

      const updatedGoal = { ...goal, currentAmount: amount };
      const next = goals.map((candidate) =>
        candidate.id === goalId ? updatedGoal : candidate,
      );

      setLocalGoals(next);
      await updateGoalAmount(goalId, amount);

      return updatedGoal;
    },
    [goals],
  );

  const removeGoal = useCallback(
    async (goalId: string) => {
      const next = goals.filter((goal) => goal.id !== goalId);
      setLocalGoals(next);
      await deleteGoal(goalId);
    },
    [goals],
  );

  // Zaktualizowana funkcja kalkulacji uwzględniająca endDate
  function getGoalProgress(goal: FinancialGoal): GoalProgress {
    const percentage =
      goal.targetAmount > 0
        ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100)
        : 0;

    const daysRemaining = Math.max(
      0,
      Math.ceil(
        (parseISO(goal.endDate).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24),
      ),
    );

    return {
      goal,
      percentage,
      isAchieved: goal.currentAmount >= goal.targetAmount,
      daysRemaining,
    };
  }

  function getGoalProgresses(): GoalProgress[] {
    return goals.map((goal) => getGoalProgress(goal));
  }

  return {
    goals,
    isReady,
    addGoal,
    updateGoalAmount: updateAmount,
    deleteGoal: removeGoal,
    getGoalProgress,
    getGoalProgresses,
  };
}
