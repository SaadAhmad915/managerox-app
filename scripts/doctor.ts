import { createServer } from "node:net";
import { lookup } from "node:dns/promises";
import { existsSync } from "node:fs";
import { sql } from "drizzle-orm";
import { databaseUrl, getDb } from "@/db";
import { users } from "@/db/schema";

/**
 * Answers "why is it just loading?" without a browser.
 *
 * Every check prints a verdict and, when it fails, the command that fixes it.
 * It runs with the dev server stopped, because the two things most likely to be
 * wrong — the port and the database — are exactly the things a running server
 * would hide.
 */

const PORT = Number(process.env.PORT ?? 3000);

let failures = 0;

function ok(label: string, detail = "") {
  console.log(`  ok    ${label}${detail ? ` — ${detail}` : ""}`);
}

function bad(label: string, fix: string) {
  failures++;
  console.log(`  FAIL  ${label}`);
  console.log(`        → ${fix}`);
}

function warn(label: string, note: string) {
  console.log(`  note  ${label}`);
  console.log(`        → ${note}`);
}

function portFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => server.close(() => resolve(true)));
    server.listen(port, "0.0.0.0");
  });
}

async function main() {
  console.log("\nManagerOX doctor\n");

  // --- the toolchain --------------------------------------------------------
  const major = Number(process.versions.node.split(".")[0]);
  if (major >= 20) ok("Node", `v${process.versions.node}`);
  else bad(`Node v${process.versions.node} is too old`, "Install Node 20.9 or newer.");

  if (existsSync("node_modules/next")) ok("Dependencies installed");
  else bad("node_modules is missing or incomplete", "Run: npm install");

  // --- the port -------------------------------------------------------------
  if (await portFree(PORT)) {
    ok(`Port ${PORT} is free`);
  } else {
    warn(
      `Port ${PORT} is already in use`,
      `Next will quietly start on ${PORT + 1} instead. Either stop whatever holds ` +
        `${PORT}, or open the URL Next actually prints — a stale server on ${PORT} ` +
        `serving an older build is a common cause of confusion.`,
    );
  }

  /*
   * The classic hang on Windows: the browser resolves "localhost" to the IPv6
   * address ::1, the dev server listens on IPv4 only, and the request waits
   * forever with no error at either end. Using 127.0.0.1 sidesteps it.
   */
  try {
    const addresses = await lookup("localhost", { all: true });
    const families = addresses.map((a) => `${a.address}`);
    const hasV6 = addresses.some((a) => a.family === 6);
    const hasV4 = addresses.some((a) => a.family === 4);

    if (hasV6 && !hasV4) {
      warn(
        `"localhost" resolves only to IPv6 (${families.join(", ")})`,
        `If the page hangs, open http://127.0.0.1:${PORT} instead of localhost.`,
      );
    } else {
      ok("localhost resolves", families.join(", "));
    }
  } catch {
    warn("Could not resolve localhost", `Try http://127.0.0.1:${PORT}.`);
  }

  // --- where the data lives -------------------------------------------------
  if (databaseUrl()) {
    warn(
      "A hosted database is configured",
      "The app will use hosted Postgres, not the local .pglite folder. Unset it " +
        "in .env.local to develop locally.",
    );
  }

  const path = process.env.PGLITE_PATH ?? ".pglite";
  if (/onedrive|dropbox|google drive|icloud/i.test(process.cwd())) {
    warn(
      "The project is inside a synced folder",
      `Sync clients can lock database files. Set PGLITE_PATH to an unsynced path.`,
    );
  }

  // --- the database ---------------------------------------------------------
  const started = Date.now();
  try {
    const db = await getDb();
    const [row] = await db
      .select({ total: sql<number>`count(*)`.mapWith(Number) })
      .from(users);

    ok("Database opens", `${Date.now() - started}ms`);

    if (row.total > 0) {
      ok("Accounts", `${row.total} — sign in as saad@managerox.com / password`);
    } else {
      bad("The database has no accounts", "Run: npm run db:seed");
    }
  } catch (error) {
    bad(
      `Database did not open (${databaseUrl() ? "hosted Postgres" : path})`,
      error instanceof Error ? error.message : String(error),
    );
  }

  console.log(
    failures === 0
      ? `\nNothing broken here. Start with: npm run dev — then open http://127.0.0.1:${PORT}\n` +
          "If the page still only spins, try: npm run dev:webpack\n"
      : `\n${failures} problem(s) above. Fix those, then run npm run doctor again.\n`,
  );

  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
