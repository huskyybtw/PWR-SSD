import { drizzle } from "drizzle-orm/expo-sqlite";
import { migrate } from "drizzle-orm/expo-sqlite/migrator";
import { openDatabaseSync } from "expo-sqlite";
import migrations from "@/drizzle/migrations";

const sqlite = openDatabaseSync("app.db");

export const db = drizzle(sqlite);

let initPromise: Promise<void> | null = null;

/** Runs migrations once. Concurrent callers share the same promise. */
export function initDatabase(): Promise<void> {
  if (!initPromise) {
    initPromise = migrate(db, migrations).catch((error) => {
      // Allow a retry after a failure.
      initPromise = null;
      throw error;
    });
  }
  return initPromise;
}
