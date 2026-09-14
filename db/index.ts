import "server-only";

import { join } from "node:path";
import * as schema from "@/db/schema";

/**
 * One database, two drivers.
 *
 * With no DATABASE_URL set — the normal case on a developer's machine — the app
 * runs PGlite: real PostgreSQL compiled to WebAssembly, stored in a file under
 * .pglite. Nothing to install, no account, no container. Set DATABASE_URL and
 * the same schema runs against a hosted Postgres instead, which is what
 * production uses.
 *
 * Both speak the same dialect, so there is no "works locally, breaks deployed"
 * gap between them.
 *
 * Migrations run on first connection rather than as a separate command. That is
 * one fewer thing to remember, and drizzle records which have already been
 * applied, so running it on every cold start costs a single cheap query.
 */

/** Derived from `open`, not `create`: `create` is annotated with this type. */
export type Database = Awaited<ReturnType<typeof open>>;

/**
 * Absolute, because a serverless function does not necessarily run from the
 * project root the way `next dev` does, and a relative path would then resolve
 * to nothing.
 */
const MIGRATIONS = join(process.cwd(), "db", "migrations");

/**
 * How long to wait for the database to open before giving up.
 *
 * The dev server prints "Ready" before it ever touches the database — the
 * connection is only opened on the first request. So a database that never
 * opens used to show up as a page that span forever with nothing in the
 * terminal and nothing in the browser. Failing loudly after a wait is far more
 * use than hanging politely. First-run startup compiles a WebAssembly build of
 * Postgres, so the wait has to be generous.
 */
const OPEN_TIMEOUT_MS = Number(process.env.DB_TIMEOUT_MS ?? 45_000);

function timeout(): Promise<never> {
  return new Promise((_resolve, reject) =>
    setTimeout(
      () =>
        reject(
          new Error(
            `The database did not open within ${Math.round(OPEN_TIMEOUT_MS / 1000)}s.\n` +
              (databaseUrl()
                ? "Check DATABASE_URL is reachable from here."
                : "The usual cause is another process holding the .pglite folder — " +
                  "PGlite allows one writer at a time. Stop any other `npm run dev` " +
                  "or `npm run db:seed`, then try again. If it persists, delete the " +
                  ".pglite folder and run `npm run db:seed`.\n" +
                  "A project folder synced by OneDrive or Dropbox can also lock it; " +
                  "move the project somewhere unsynced, or set PGLITE_PATH to a " +
                  "local path."),
          ),
        ),
      OPEN_TIMEOUT_MS,
    ),
  );
}

/**
 * The connection string, whatever the host decided to call it.
 *
 * Vercel's Postgres integrations set POSTGRES_URL and friends rather than
 * DATABASE_URL, so insisting on one name means clicking "create database" gets
 * you a deployment that still cannot find it. The pooled URL comes first: a
 * serverless function opens a connection per invocation and would otherwise
 * exhaust the database's connection limit under any real traffic.
 */
export function databaseUrl(): string | undefined {
  return (
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ??
    process.env.POSTGRES_PRISMA_URL ??
    process.env.POSTGRES_URL_NON_POOLING
  );
}

async function open() {
  const url = databaseUrl();

  /*
   * PGlite keeps its data in a folder on disk. That is ideal on a laptop and
   * impossible on a serverless host, where the filesystem is read-only and the
   * container is thrown away between requests — so it would either fail oddly
   * or appear to work and lose every write. Better to say so plainly than to
   * let someone deploy a CRM that silently forgets.
   */
  if (!url && (process.env.VERCEL || process.env.NODE_ENV === "production")) {
    throw new Error(
      "No database connection string found. A deployed instance needs a hosted " +
        "Postgres: the local PGlite database writes to disk, which does not " +
        "survive (or even work) on a serverless host. Set DATABASE_URL (or " +
        "POSTGRES_URL, which Vercel's Postgres integrations create for you) in " +
        "the project's environment variables and redeploy.",
    );
  }

  if (url) {
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    const { Pool } = await import("pg");

    const db = drizzle(
      new Pool({
        connectionString: url,
        // Hosted Postgres almost always terminates TLS with its own chain;
        // rejecting it here is the usual cause of a deploy that cannot connect.
        ssl: url.includes("localhost") ? false : { rejectUnauthorized: false },
      }),
      { schema },
    );

    await migrate(db, { migrationsFolder: MIGRATIONS });
    return db;
  }

  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const { PGlite } = await import("@electric-sql/pglite");

  const path = process.env.PGLITE_PATH ?? ".pglite";
  const db = drizzle(new PGlite(path), { schema });

  await migrate(db, { migrationsFolder: MIGRATIONS });
  return db;
}

/**
 * Puts the demo data into a database that has never been used.
 *
 * Opt-in through SEED_ON_EMPTY, and only when there is not a single account —
 * so it can populate a brand new deployment on its first request, and can never
 * touch a database that someone is already using. Remove the variable once
 * there is real data in there.
 */
async function seedIfEmpty(db: Database) {
  if (!process.env.SEED_ON_EMPTY) return;

  const [existing] = await db.select({ id: schema.users.id }).from(schema.users).limit(1);
  if (existing) return;

  console.log("[db] empty database and SEED_ON_EMPTY is set — seeding…");
  const { seedDatabase } = await import("@/db/seed-data");
  const counts = await seedDatabase(db);
  console.log(`[db] seeded ${counts.users} users and ${counts.deals} deals`);
}

/**
 * Opens the database, saying so in the terminal.
 *
 * The logging is not noise: this is the one slow, failure-prone step between a
 * server that claims to be ready and a page that renders, and it happens on the
 * first request rather than at startup. Without it there is nothing at all to
 * see while it works, and nothing to read if it does not.
 */
async function create(): Promise<Database> {
  const where = databaseUrl()
    ? "hosted Postgres"
    : `PGlite (${process.env.PGLITE_PATH ?? ".pglite"})`;
  const started = Date.now();

  console.log(`[db] opening ${where}…`);

  try {
    const db = await Promise.race([open(), timeout()]);
    await seedIfEmpty(db);
    console.log(`[db] ready in ${Date.now() - started}ms`);
    return db;
  } catch (error) {
    console.error(
      `[db] failed to open ${where}\n${error instanceof Error ? error.message : error}`,
    );
    throw error;
  }
}

/**
 * Cached on globalThis so Next's hot reload does not open a second handle to
 * the same PGlite directory, which would corrupt it.
 */
const globalForDb = globalThis as unknown as {
  __managerox_db?: Promise<Database>;
};

export function getDb(): Promise<Database> {
  /*
   * A rejected promise left in the cache would poison every later request with
   * the original error, so a retry could never succeed — you would have to
   * restart the server even after fixing the cause. Clearing it on failure lets
   * the next request try again.
   */
  globalForDb.__managerox_db ??= create().catch((error) => {
    globalForDb.__managerox_db = undefined;
    throw error;
  });

  return globalForDb.__managerox_db;
}
