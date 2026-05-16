import { desc, eq } from "drizzle-orm";

import { db } from "../lib/client";
import { todos, type NewTodo, type Todo } from "../lib/schema";

export function getAllTodos() {
  return db.select().from(todos).orderBy(desc(todos.createdAt)).all();
}

export function createTodo(values: NewTodo) {
  db.insert(todos).values(values).run();
  return getAllTodos();
}

export function toggleTodo(id: number, completed: boolean) {
  db.update(todos).set({ completed }).where(eq(todos.id, id)).run();
  return getAllTodos();
}

export function deleteTodo(id: number) {
  db.delete(todos).where(eq(todos.id, id)).run();
  return getAllTodos();
}

export type { Todo };
