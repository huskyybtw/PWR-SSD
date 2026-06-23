export type TransactionType = "expense" | "income";

export interface Transaction {
  id: number;
  log_id?: number;
  categoryId: number; // Prawdziwy łącznik
  amount: number;
  date: string;
  description?: string;
}

// Zunifikowany i jedyny potrzebny interfejs celu finansowego (zgodny z DB)
export interface FinancialGoal {
  id: string; // Zakładam string dla frontendu (generateId), podczas zapisu do DB backend rzutuje lub mapuje na INTEGER
  userId: number | string;
  goalType: "saving" | "budget"; // Doprecyzowanie typu celu
  categoryId: number; // Łącznik z transakcją
  name: string;
  targetAmount: number;
  currentAmount: number;
  startDate: string;
  endDate: string; // Zastępuje stare 'deadline'
  alertMessage?: string;
  createdAt?: string;
}

export interface GoalProgress {
  goal: FinancialGoal; // Zmiana z SavingsGoal na FinancialGoal
  percentage: number;
  isAchieved: boolean;
  daysRemaining: number;
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
