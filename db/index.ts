import "server-only";

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

export type Database = Awaited<ReturnType<typeof create>>;

const MIGRATIONS = "./db/migrations";

async function create() {
  const url = process.env.DATABASE_URL;

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

  const db = drizzle(new PGlite(process.env.PGLITE_PATH ?? ".pglite"), { schema });

  await migrate(db, { migrationsFolder: MIGRATIONS });
  return db;
}

/**
 * Cached on globalThis so Next's hot reload does not open a second handle to
 * the same PGlite directory, which would corrupt it.
 */
const globalForDb = globalThis as unknown as {
  __managerox_db?: Promise<Database>;
};

export function getDb(): Promise<Database> {
  globalForDb.__managerox_db ??= create();
  return globalForDb.__managerox_db;
}
