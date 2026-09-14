import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { createSession, verifyPassword } from "@/app/lib/auth-server";
import { handle, json, parse } from "@/app/lib/http";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  return handle(async () => {
    const input = await parse(request, schema);
    const db = await getDb();

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, input.email.toLowerCase()))
      .limit(1);

    /*
     * One generic message whether the address is unknown or the password is
     * wrong: distinguishing them tells an attacker which emails have accounts.
     * The hash is still verified against a dummy when no user is found, so the
     * response time does not give it away either.
     */
    const ok = user
      ? await verifyPassword(input.password, user.passwordHash)
      : await verifyPassword(input.password, "0:0");

    if (!user || !ok) {
      /*
       * An empty users table is not a failed sign-in, it is an unseeded
       * database — and saying "these credentials do not match" there sends
       * someone hunting for a typo in a password that was never going to work.
       * Saying so leaks nothing: it reveals that the system has no accounts at
       * all, not which addresses have one.
       */
      const [existing] = await db.select({ id: users.id }).from(users).limit(1);

      if (!existing) {
        return json(
          {
            message:
              "This database has no accounts yet. Stop the dev server and run: npm run db:seed",
            errors: {
              email: ["No accounts exist yet — run npm run db:seed."],
            },
          },
          422,
        );
      }

      return json(
        {
          message: "These credentials do not match our records.",
          errors: { email: ["These credentials do not match our records."] },
        },
        422,
      );
    }

    await createSession(user.id);

    return json({
      id: String(user.id),
      firstName: user.name.split(" ")[0],
      fullName: user.name,
      email: user.email,
      role: user.role,
      initials: user.name
        .split(" ")
        .filter(Boolean)
        .map((p) => p[0])
        .slice(0, 2)
        .join(""),
    });
  });
}
