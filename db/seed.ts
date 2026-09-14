import { getDb } from "@/db";
import { seedDatabase } from "@/db/seed-data";

/**
 * Command-line wrapper around the seed.
 *
 * The data itself lives in db/seed-data.ts so that a fresh deployment can run
 * the same thing on its first request — see SEED_ON_EMPTY in db/index.ts —
 * without anyone needing a terminal pointed at the production database.
 */
async function main() {
  const db = await getDb();
  const counts = await seedDatabase(db);

  console.log(
    `Seeded ${counts.users} users, ${counts.leads} leads, ` +
      `${counts.contacts} contacts, ${counts.deals} deals.`,
  );
  console.log("Sign in with saad@managerox.com / password");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
