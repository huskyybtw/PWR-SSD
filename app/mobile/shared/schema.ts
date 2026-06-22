import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, real } from "drizzle-orm/sqlite-core";

// --- TABELA ZADAŃ (TODO) - zostawiamy bez zmian ---
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

// --- NOWA TABELA: CELE OSZCZĘDNOŚCIOWE (GOALS) ---
export const goals = sqliteTable("goals", {
  // Używamy text() dla ID, ponieważ w testach mieliśmy stringi np. "test-goal-001"
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  targetAmount: real("target_amount").notNull(),
  currentAmount: real("current_amount").notNull().default(0),
  deadline: text("deadline").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// Tworzymy typy, żeby TypeScript nam pomagał w innych plikach
export type Goal = typeof goals.$inferSelect;
export type NewGoal = typeof goals.$inferInsert;

// --- NOWA TABELA: ALERTY (ALERTS) ---
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
