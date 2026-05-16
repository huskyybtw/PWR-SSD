import AsyncStorage from "@react-native-async-storage/async-storage";

const KEYS = {
  TRANSACTIONS: "fintrack_transactions",
  BUDGETS: "fintrack_budgets",
  GOALS: "fintrack_goals",
  ALERTS: "fintrack_alerts",
  CATEGORIES: "fintrack_categories",
} as const;

export async function getItem<T>(key: string): Promise<T | null> {
  try {
    const value = await AsyncStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch (error) {
    console.error(`Storage get error for ${key}:`, error);
    return null;
  }
}

export async function setItem<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Storage set error for ${key}:`, error);
  }
}

export async function removeItem(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error(`Storage remove error for ${key}:`, error);
  }
}

export const Storage = {
  getTransactions: () => getItem<unknown[]>(KEYS.TRANSACTIONS),
  setTransactions: (value: unknown[]) => setItem(KEYS.TRANSACTIONS, value),
  getBudgets: () => getItem<unknown[]>(KEYS.BUDGETS),
  setBudgets: (value: unknown[]) => setItem(KEYS.BUDGETS, value),
  getGoals: () => getItem<unknown[]>(KEYS.GOALS),
  setGoals: (value: unknown[]) => setItem(KEYS.GOALS, value),
  getAlerts: () => getItem<unknown[]>(KEYS.ALERTS),
  setAlerts: (value: unknown[]) => setItem(KEYS.ALERTS, value),
  getCategories: () => getItem<string[]>(KEYS.CATEGORIES),
  setCategories: (value: string[]) => setItem(KEYS.CATEGORIES, value),
};
