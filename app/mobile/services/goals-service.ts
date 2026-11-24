import { useCallback, useEffect, useRef, useState } from "react";

import {
  createGoal,
  deleteGoal,
  listGoals,
  updateGoalAmount,
} from "@/repositories/goals-repository";
import { GoalProgress, SavingsGoal } from "@/shared/types/finance";
import { generateId } from "@/shared/utils";
import { isValid, parseISO } from "date-fns";

export function useGoalsService() {
  const [goals, setLocalGoals] = useState<SavingsGoal[]>([]);
  const [isReady, setIsReady] = useState(false);
  // Always-current snapshot so async callbacks never work on stale state.
  const goalsRef = useRef<SavingsGoal[]>([]);
  goalsRef.current = goals;

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const storedGoals = await listGoals();
        if (active) setLocalGoals(storedGoals ?? []);
      } catch (error) {
        console.error("Failed to load goals", error);
      } finally {
        if (active) setIsReady(true);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  const addGoal = useCallback(
    async (data: Omit<SavingsGoal, "id" | "createdAt" | "currentAmount">) => {
      const deadline = parseISO(data.deadline);
      if (!isValid(deadline)) {
        throw new Error("Invalid deadline date.");
      }

      const newGoal: SavingsGoal = {
        ...data,
        id: generateId(),
        currentAmount: 0,
        createdAt: new Date().toISOString(),
      };
      await createGoal(newGoal);
      setLocalGoals((current) => [...current, newGoal]);
      return newGoal;
    },
    [],
  );

  /** Sets several goal amounts at once (DB first, then one state update). */
  const updateGoalAmounts = useCallback(
    async (updates: { goalId: string; amount: number }[]) => {
      for (const { goalId, amount } of updates) {
        await updateGoalAmount(goalId, amount);
      }
      const byId = new Map(updates.map((u) => [u.goalId, u.amount]));
      setLocalGoals((current) =>
        current.map((goal) =>
          byId.has(goal.id)
            ? { ...goal, currentAmount: byId.get(goal.id)! }
            : goal,
        ),
      );
    },
    [],
  );

  const updateAmount = useCallback(
    async (goalId: string, amount: number) => {
      const goal = goalsRef.current.find((candidate) => candidate.id === goalId);
      if (!goal) return null;

      await updateGoalAmounts([{ goalId, amount }]);
      return { ...goal, currentAmount: amount };
    },
    [updateGoalAmounts],
  );

  const removeGoal = useCallback(async (goalId: string) => {
    await deleteGoal(goalId);
    setLocalGoals((current) => current.filter((goal) => goal.id !== goalId));
  }, []);

  function getGoalProgress(goal: SavingsGoal): GoalProgress {
    const percentage =
      goal.targetAmount > 0
        ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100)
        : 0;
    const daysRemaining = Math.max(
      0,
      Math.ceil(
        (parseISO(goal.deadline).getTime() - new Date().getTime()) /
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
    goalsRef,
    isReady,
    addGoal,
    updateGoalAmount: updateAmount,
    updateGoalAmounts,
    deleteGoal: removeGoal,
    getGoalProgress,
    getGoalProgresses,
  };
}
