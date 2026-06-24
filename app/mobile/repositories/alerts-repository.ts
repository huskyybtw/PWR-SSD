import { db } from "@/shared/client";
import { alerts } from "@/shared/schema";
import { AlertMessage } from "@/shared/types/finance";
import { generateId } from "@/shared/utils";
import { eq } from "drizzle-orm";

export async function createAlert(
  value: Pick<AlertMessage, "type" | "title" | "message"> & {
    relatedId?: string;
  },
): Promise<AlertMessage> {
  if (!value.type || !value.title || !value.message) {
    throw new Error("Invalid alert input");
  }

  const id = generateId();
  const now = new Date().toISOString();

  await db
    .insert(alerts)
    .values({
      id,
      type: value.type,
      title: value.title,
      message: value.message,
      read: false,
      createdAt: now,
    } as any)
    .run();

  return {
    id,
    type: value.type as AlertMessage["type"],
    title: value.title,
    message: value.message,
    createdAt: now,
    read: false,
    relatedId: value.relatedId,
  };
}

export async function listAlerts(): Promise<AlertMessage[]> {
  const rows = (await db.select().from(alerts).all()) as any[];

  return rows.map((row) => ({
    id: String(row.id),
    type: row.type as AlertMessage["type"],
    title: row.title,
    message: row.message,
    createdAt: row.createdAt ?? row.created_at,
    read: Boolean(row.read),
    relatedId: row.related_id ?? row.relatedId ?? undefined,
  }));
}

export async function markAlertRead(alertId: string): Promise<void> {
  await db
    .update(alerts)
    .set({ read: true } as any)
    .where(eq(alerts.id, alertId))
    .run();
}
