import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { PGlite } from "@electric-sql/pglite";
import * as schema from "@/db/schema";

/**
 * A throwaway Postgres for one test file.
 *
 * PGlite's `memory://` keeps it entirely in RAM, so tests never touch the
 * .pglite folder the dev server uses — a test run cannot wipe the data someone
 * was looking at in the browser.
 */
export async function testDb() {
  const db = drizzle(new PGlite("memory://"), { schema });
  await migrate(db, { migrationsFolder: "./db/migrations" });
  return db;
}

export async function makeUser(db: Awaited<ReturnType<typeof testDb>>) {
  const [user] = await db
    .insert(schema.users)
    .values({
      name: "Test Owner",
      email: `owner-${Math.random().toString(36).slice(2)}@example.com`,
      passwordHash: "x",
    })
    .returning();

  return user;
}
