import type { Config } from "drizzle-kit";

/**
 * Only used by `npm run db:generate`, which turns db/schema.ts into SQL under
 * db/migrations. Applying those migrations is done by the app itself (see
 * db/index.ts), not by drizzle-kit, so that a fresh clone needs no extra step.
 */
export default {
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
} satisfies Config;
