import { eq } from "drizzle-orm";
import { db } from "@/shared/client";
import { alerts } from "@/shared/schema";
import { AlertMessage } from "@/shared/types/finance";

export async function listAlerts(): Promise<AlertMessage[]> {
  return db.select().from(alerts).all() as unknown as AlertMessage[];
}

export async function createAlert(value: AlertMessage): Promise<void> {
  // Nasza nowa tarcza ochronna na błędne dane (dzięki niej test zaświeci na zielono!)
  if (!value.type || !value.title || !value.message) {
    throw new Error("Invalid alert input");
  }

  // Twardy zapis do SQLite
  db.insert(alerts)
    .values({
      id: value.id,
      type: value.type,
      title: value.title,
      message: value.message,
      read: value.read !== undefined ? value.read : false,
      createdAt: value.createdAt || new Date().toISOString(),
    })
    .run();
}

export async function markAlertRead(alertId: string): Promise<void> {
  db.update(alerts).set({ read: true }).where(eq(alerts.id, alertId)).run();
}

export async function replaceAlerts(values: AlertMessage[]): Promise<void> {
  db.delete(alerts).run();
  if (values.length > 0) {
    db.insert(alerts)
      .values(values as any)
      .run();
  }
}
