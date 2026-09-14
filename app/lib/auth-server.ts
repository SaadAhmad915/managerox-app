import "server-only";

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { and, eq, gt } from "drizzle-orm";
import { getDb } from "@/db";
import { sessions, users } from "@/db/schema";

/**
 * Hashing lives in app/lib/password.ts, which imports nothing. The seed needs
 * to hash a password and this module needs the database, so keeping them
 * together would make the seed import the database in order to write to it.
 */
export { hashPassword, verifyPassword } from "@/app/lib/password";

const SESSION_COOKIE = "managerox_session";
const SESSION_DAYS = 30;

export type SessionUser = {
  id: number;
  name: string;
  email: string;
  role: string;
};

/**
 * Sessions are rows, not self-contained tokens, so signing out revokes access
 * immediately. A signed JWT would stay valid until it expired no matter how
 * many times someone logged out.
 */
export async function createSession(userId: number): Promise<void> {
  const db = await getDb();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);

  await db.insert(sessions).values({ id: token, userId, expiresAt });

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true, // unreadable from JavaScript, so XSS cannot steal it
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;

  if (token) {
    const db = await getDb();
    await db.delete(sessions).where(eq(sessions.id, token));
  }

  store.delete(SESSION_COOKIE);
}

/** The signed-in user, or null. Expired sessions count as signed out. */
export async function currentUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const db = await getDb();
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, token), gt(sessions.expiresAt, new Date())))
    .limit(1);

  return rows[0] ?? null;
}

/** Throws a 401 Response when signed out — route handlers let it bubble. */
export async function requireUser(): Promise<SessionUser> {
  const user = await currentUser();

  if (!user) {
    throw Response.json({ message: "Unauthenticated." }, { status: 401 });
  }

  return user;
}
