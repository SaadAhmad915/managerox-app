import "server-only";

import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { and, eq, gt } from "drizzle-orm";
import { getDb } from "@/db";
import { sessions, users } from "@/db/schema";

const scryptAsync = promisify(scrypt);

const SESSION_COOKIE = "managerox_session";
const SESSION_DAYS = 30;

/**
 * Password hashing with Node's built-in scrypt.
 *
 * Deliberately no bcrypt/argon2 package: those compile native code, which is
 * the single most common reason `npm install` fails on a Windows machine
 * without build tools. scrypt is memory-hard, in the standard library, and
 * needs no toolchain.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [salt, key] = stored.split(":");
  if (!salt || !key) return false;

  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  const expected = Buffer.from(key, "hex");

  // Length check first: timingSafeEqual throws on a mismatch rather than
  // returning false, and the comparison itself must not leak timing.
  return (
    derived.length === expected.length && timingSafeEqual(derived, expected)
  );
}

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
