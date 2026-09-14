import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

/**
 * Password hashing, kept apart from the session code on purpose.
 *
 * The seed needs to hash a password, and the session code needs the database.
 * Leaving these two functions in the same module as `getDb` would make the seed
 * import the database in order to write to the database — a cycle. They depend
 * on nothing but node:crypto, so they sit on their own.
 *
 * Deliberately no bcrypt or argon2: those compile native code, which is the
 * single most common reason `npm install` fails on a Windows machine without
 * build tools. scrypt is memory-hard, in the standard library, and needs no
 * toolchain.
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
