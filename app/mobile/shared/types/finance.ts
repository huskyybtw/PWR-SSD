export type TransactionType = "expense" | "income";

export interface Transaction {
  id: string;
  amount: number;
  description: string;
  date: string;
  category: string;
  type: TransactionType;
  createdAt: string;
  source?: "manual" | "import";
}

export interface Budget {
  id: string;
  name: string;
  amount: number;
  category: string;
  period: "daily" | "weekly" | "monthly" | "yearly";
  startDate: string;
  endDate: string;
  createdAt: string;
}

export interface BudgetStatus {
  budget: Budget;
  spent: number;
  remaining: number;
  percentage: number;
  isExceeded: boolean;
  isNearLimit: boolean;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  createdAt: string;
}

export interface GoalProgress {
  goal: SavingsGoal;
  percentage: number;
  isAchieved: boolean;
  daysRemaining: number;
}

export interface AlertMessage {
  id: string;
  type: "budget_exceeded" | "budget_near_limit" | "goal_achieved";
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  relatedId?: string;
}

export type DateRange = "daily" | "weekly" | "monthly" | "yearly" | "custom";

export interface ReportData {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  categoryBreakdown: Record<string, number>;
  dailyTrend: { date: string; income: number; expense: number }[];
}

export interface CategoryKeywordMap {
  [category: string]: string[];
}
