import { eq } from "drizzle-orm";
import { db } from "@/shared/client";
import { alerts } from "@/shared/schema";
import { AlertMessage } from "@/shared/types/finance";
import { generateId } from "@/shared/utils";

const DEFAULT_USER_ID = 1;

export async function createAlert(
  value: Pick<AlertMessage, "type" | "title" | "message"> & {
    relatedId?: string;
  },
): Promise<AlertMessage> {
  if (!value.type || !value.title || !value.message) {
    throw new Error("Invalid alert input");
  }

  const newAlert: AlertMessage = {
    id: generateId(),
    type: value.type,
    title: value.title,
    message: value.message,
    createdAt: new Date().toISOString(),
    read: false,
    relatedId: value.relatedId,
  };

  await db
    .insert(alerts)
    .values({
      userId: DEFAULT_USER_ID,
      type: newAlert.type,
      title: newAlert.title,
      message: newAlert.message,
      read: false,
      relatedId: newAlert.relatedId,
      createdAt: newAlert.createdAt,
    })
    .run();

  return newAlert;
}

export async function listAlerts(): Promise<AlertMessage[]> {
  const rows = await db.select().from(alerts).all();

  return rows.map((row) => ({
    id: String(row.id),
    type: row.type as AlertMessage["type"],
    title: row.title,
    message: row.message,
    createdAt: row.createdAt,
    read: row.read,
    relatedId: row.relatedId ?? undefined,
  }));
}

export async function markAlertRead(alertId: string): Promise<void> {
  await db
    .update(alerts)
    .set({ read: true })
    .where(eq(alerts.id, Number(alertId)))
    .run();
}
