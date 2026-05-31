import { desc, eq } from "drizzle-orm";

import { db } from "@/shared/client";
import { NewTodo, Todo, todos } from "@/shared/schema";

export function listTodos(): Todo[] {
  return db.select().from(todos).orderBy(desc(todos.createdAt)).all();
}

export function createTodo(values: NewTodo): Todo[] {
  db.insert(todos).values(values).run();
  return listTodos();
}

export function updateTodoCompleted(id: number, completed: boolean): Todo[] {
  db.update(todos).set({ completed }).where(eq(todos.id, id)).run();
  return listTodos();
}

export function deleteTodo(id: number): Todo[] {
  db.delete(todos).where(eq(todos.id, id)).run();
  return listTodos();
}
