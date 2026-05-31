import { drizzle } from "drizzle-orm/expo-sqlite";
import { migrate } from "drizzle-orm/expo-sqlite/migrator";
import { openDatabaseSync } from "expo-sqlite";
import migrations from "@/drizzle/migrations";

const sqlite = openDatabaseSync("app.db");

export const db = drizzle(sqlite);

let didInitializeDatabase = false;

export async function initDatabase(): Promise<void> {
  if (didInitializeDatabase) {
    return;
  }

  await migrate(db, migrations);
  didInitializeDatabase = true;
}
