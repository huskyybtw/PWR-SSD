import { openDatabaseSync } from "expo-sqlite";

import { AlertMessage } from "@/shared/types/finance";

const sqlite = openDatabaseSync("finance.db");

type AlertRow = {
  id: string;
  type: AlertMessage["type"];
  title: string;
  message: string;
  read: number;
  createdAt: string;
  relatedId: string | null;
};

let didInitializeAlertsTable = false;

function ensureAlertsTable(): void {
  if (didInitializeAlertsTable) {
    return;
  }

  sqlite.runSync(`
    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      related_id TEXT
    )
  `);

  try {
    sqlite.runSync("ALTER TABLE alerts ADD COLUMN related_id TEXT");
  } catch {
    // Column already exists on upgraded databases.
  }

  didInitializeAlertsTable = true;
}

function toAlertMessage(row: AlertRow): AlertMessage {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    createdAt: row.createdAt,
    read: row.read === 1,
    relatedId: row.relatedId ?? undefined,
  };
}

ensureAlertsTable();

export async function listAlerts(): Promise<AlertMessage[]> {
  try {
    const storedAlerts = sqlite.getAllSync<AlertRow>(
      `
        SELECT
          id,
          type,
          title,
          message,
          read,
          created_at AS createdAt,
          related_id AS relatedId
        FROM alerts
        WHERE read = 0
        ORDER BY created_at DESC
      `,
    );

    return storedAlerts.map(toAlertMessage);
  } catch (error) {
    console.error("Failed to list alerts", error);
    throw error;
  }
}

export async function hasUnreadAlertForRelatedId(
  relatedId: string,
): Promise<boolean> {
  try {
    const storedAlert = sqlite.getFirstSync<{ id: string }>(
      `
        SELECT id
        FROM alerts
        WHERE related_id = ? AND read = 0
        LIMIT 1
      `,
      relatedId,
    );

    return storedAlert !== null;
  } catch (error) {
    console.error("Failed to check unread alert by related id", error);
    throw error;
  }
}

export async function createAlert(value: AlertMessage): Promise<void> {
  try {
    if (!value.type || !value.title || !value.message) {
      throw new Error("Invalid alert input");
    }

    sqlite.runSync(
      `
        INSERT INTO alerts (id, type, title, message, read, created_at, related_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      value.id,
      value.type,
      value.title,
      value.message,
      value.read ? 1 : 0,
      value.createdAt || new Date().toISOString(),
      value.relatedId ?? null,
    );
  } catch (error) {
    console.error("Failed to create alert", error);
    throw error;
  }
}

export async function markAlertRead(alertId: string): Promise<void> {
  try {
    const result = sqlite.runSync(
      `
        UPDATE alerts
        SET read = 1
        WHERE id = ?
      `,
      alertId,
    );

    if (result.changes === 0) {
      throw new Error(`Notification ${alertId} does not exist`);
    }
  } catch (error) {
    console.error("Failed to mark alert as read", error);
    throw error;
  }
}

export async function replaceAlerts(values: AlertMessage[]): Promise<void> {
  try {
    sqlite.runSync("BEGIN TRANSACTION");
    sqlite.runSync("DELETE FROM alerts");

    for (const value of values) {
      sqlite.runSync(
        `
          INSERT INTO alerts (id, type, title, message, read, created_at, related_id)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        value.id,
        value.type,
        value.title,
        value.message,
        value.read ? 1 : 0,
        value.createdAt,
        value.relatedId ?? null,
      );
    }

    sqlite.runSync("COMMIT");
  } catch (error) {
    try {
      sqlite.runSync("ROLLBACK");
    } catch {
      // Ignore rollback failures and surface the original error.
    }

    console.error("Failed to replace alerts", error);
    throw error;
  }
}
