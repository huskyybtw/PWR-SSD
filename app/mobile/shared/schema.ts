import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

// --- TABELA ZADAŃ (TODO) ---
export const todos = sqliteTable("todos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  completed: integer("completed", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export type Todo = typeof todos.$inferSelect;
export type NewTodo = typeof todos.$inferInsert;

// --- TABELA: BUDŻETY (BUDGETS) ---
export const budgets = sqliteTable("budgets", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  amount: real("amount").notNull(),
  category: text("category").notNull(),
  period: text("period").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export type Budget = typeof budgets.$inferSelect;
export type NewBudget = typeof budgets.$inferInsert;

// --- TABELA: ALERTS ---
export const alerts = sqliteTable("alerts", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  read: integer("read", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export type AlertMessage = typeof alerts.$inferSelect;
export type NewAlertMessage = typeof alerts.$inferInsert;

// --- TABELA: CELE OSZCZĘDNOŚCIOWE (GOALS) ---
export const goals = sqliteTable("goals", {
  // Kept your existing configuration (String IDs)
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  targetAmount: real("target_amount").notNull(),
  currentAmount: real("current_amount").notNull().default(0),
  deadline: text("deadline").notNull(), // maps to end_date in the ER diagram
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),

  // New Columns added to support relationships from the image:
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  goalType: text("goal_type").notNull().default("savings"),
  categoryId: integer("category_id").references(() => categories.id),
  startDate: text("start_date")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  alertMessage: text("alert_message"),
});

export type Goal = typeof goals.$inferSelect;
export type NewGoal = typeof goals.$inferInsert;

// --- NEW TABELA: USERS ---
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  pinHash: text("pin_hash"),
  baseCurrency: text("base_currency").notNull(),
  createdDate: text("created_date")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// --- NEW TABELA: TRANSACTION LOGS ---
export const transactionLogs = sqliteTable("transaction_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  fileName: text("file_name").notNull(),
  importDate: text("import_date")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export type TransactionLog = typeof transactionLogs.$inferSelect;
export type NewTransactionLog = typeof transactionLogs.$inferInsert;

// --- NEW TABELA: CATEGORIES ---
export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
});

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;

// --- NEW TABELA: TRANSACTIONS ---
export const transactions = sqliteTable("transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  logId: integer("log_id")
    .notNull()
    .references(() => transactionLogs.id),
  categoryId: integer("category_id").references(() => categories.id),
  amount: real("amount").notNull(),
  date: text("date").notNull(),
  description: text("description"),
  transactionIdText: text("transaction_id_text"),
});

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;

// --- NEW TABELA: REPORTS ---
export const reports = sqliteTable("reports", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  generationDate: text("generation_date")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  periodStart: text("period_start").notNull(),
  periodEnd: text("period_end").notNull(),
  totalIncome: real("total_income").notNull().default(0),
  totalExpenses: real("total_expenses").notNull().default(0),
  netBalance: real("net_balance").notNull().default(0),
});

export type Report = typeof reports.$inferSelect;
export type NewReport = typeof reports.$inferInsert;

// --- NEW TABELA: REPORT TRANSACTIONS (Many-to-Many Join Table) ---
export const reportTransactions = sqliteTable("report_transactions", {
  reportId: integer("report_id")
    .notNull()
    .references(() => reports.id),
  transactionId: integer("transaction_id")
    .notNull()
    .references(() => transactions.id),
});

export type ReportTransaction = typeof reportTransactions.$inferSelect;
export type NewReportTransaction = typeof reportTransactions.$inferInsert;
