import "server-only";

import { json } from "@/app/lib/http";
import type { Named } from "@/app/lib/present";

/**
 * Small helpers the resource handlers all need.
 */

/**
 * A left-joined relation comes back as an object of nulls rather than a null
 * object, so `{ id: null, name: null }` would serialise as a contact with no
 * name instead of no contact at all.
 */
export function named(
  row: { id: number | null; name: string | null } | null | undefined,
): Named {
  return row && row.id !== null && row.name !== null
    ? { id: row.id, name: row.name }
    : null;
}

export function titled(
  row: { id: number | null; title: string | null } | null | undefined,
): { id: number; title: string } | null {
  return row && row.id !== null && row.title !== null
    ? { id: row.id, title: row.title }
    : null;
}

/** Route ids arrive as strings; anything non-numeric is a 404, not a crash. */
export function idParam(value: string): number {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw json({ message: "Not found." }, 404);
  }

  return id;
}

/** Throws a 404 when a row does not exist, so handlers can stay linear. */
export function found<T>(row: T | undefined): T {
  if (!row) throw json({ message: "Not found." }, 404);
  return row;
}

/** LIKE wildcards in user input would otherwise match far more than intended. */
export function likeTerm(term: string): string {
  return `%${term.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

/** Per-page from the query string, capped so one request cannot pull the table. */
export function perPageOf(url: URL, fallback: number, max = 100): number {
  const value = Number(url.searchParams.get("perPage") ?? fallback);
  if (!Number.isFinite(value) || value < 1) return fallback;
  return Math.min(Math.floor(value), max);
}
