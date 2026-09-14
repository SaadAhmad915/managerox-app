import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { json } from "@/app/lib/http";

/**
 * Is the database reachable, and does it have anything in it?
 *
 * Deliberately outside `requireUser`: when something is wrong you cannot sign
 * in, so a check that needs a session is no use at the moment you need it. It
 * reports only whether the database opened and how many accounts exist — never
 * who they are.
 */
export async function GET() {
  const started = Date.now();

  try {
    const db = await getDb();
    const [row] = await db.select({ total: sql<number>`count(*)`.mapWith(Number) }).from(users);

    return json({
      database: process.env.DATABASE_URL ? "hosted Postgres" : "PGlite",
      ok: true,
      users: row.total,
      ms: Date.now() - started,
      hint:
        row.total === 0
          ? "No accounts yet. Stop the dev server and run: npm run db:seed"
          : "Ready. Sign in at /login",
    });
  } catch (error) {
    return json(
      {
        database: process.env.DATABASE_URL ? "hosted Postgres" : "PGlite",
        ok: false,
        ms: Date.now() - started,
        error: error instanceof Error ? error.message : String(error),
      },
      503,
    );
  }
}
