# Local SQLite + Drizzle setup

This project now persists data on-device using Expo's SQLite driver and Drizzle ORM.

## Dependencies

- `expo-sqlite` (installed via `npx expo install expo-sqlite`)
- `drizzle-orm` (already present)

> If `npx expo install` warns about the Node engine, upgrade to Node 20.19.4+ when convenient. The install still succeeds, but the warning will remain until the runtime is updated.

## Key files

- `db/client.ts` – opens the `app.db` file, initializes Drizzle, and ensures the `todos` table exists.
- `db/schema.ts` – houses strongly typed table definitions. Add new tables here.
- `db/todos.ts` – contains convenience helpers for querying and mutating the `todos` table.
- `app/(tabs)/index.tsx` – demonstrates how to call the helpers inside a screen.

## Using the database

1. Import helpers directly, e.g. `import { getAllTodos } from '@/db/todos';`.
2. All helpers are synchronous because they rely on `openDatabaseSync`. Avoid calling them inside render loops; prefer `useState` + `useEffect`/callbacks as shown in `TabOneScreen`.
3. Long-press a list item on the first tab to delete it, or tap to toggle completion. This exercises `toggleTodo`/`deleteTodo` under the hood.

## Adding new tables

1. Extend `db/schema.ts` with another `sqliteTable` definition.
2. Mirror the `CREATE TABLE IF NOT EXISTS ...` block inside `db/client.ts` or migrate to `drizzle-kit` migrations for more complex schemas.
3. Create helper modules similar to `db/todos.ts` so UI code stays tidy.

## Resetting the database

If you need to start fresh during development:

```ts
import { deleteDatabaseSync } from "expo-sqlite";

deleteDatabaseSync("app.db");
```

Run this in a script (not inside production code) and then reload the app so `ensureSchema()` recreates the tables.
