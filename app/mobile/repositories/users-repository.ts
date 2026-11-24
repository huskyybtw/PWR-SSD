import { eq } from "drizzle-orm";

import { db } from "@/shared/client";
import { users } from "@/shared/schema";

export const DEFAULT_USER_ID = 1;

export async function ensureDefaultUser(): Promise<void> {
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.id, DEFAULT_USER_ID))
    .get();

  if (!existingUser) {
    await db
      .insert(users)
      .values({
        id: DEFAULT_USER_ID,
        name: "Default User",
        baseCurrency: "PLN",
      })
      .run();
  }
}
