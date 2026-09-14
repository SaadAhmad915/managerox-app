import "server-only";

import { ZodError, type ZodType } from "zod";

/**
 * Shared route-handler plumbing.
 *
 * Validation errors come back as `{ message, errors }` keyed by field, which is
 * what `ApiError.fieldError` reads to put a message under the input it belongs
 * to rather than dumping one banner at the top of the form.
 */
export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

export function noContent(): Response {
  return new Response(null, { status: 204 });
}

/**
 * Wraps a handler so a thrown Response (a 401 from requireUser, say) or a
 * validation error becomes a proper reply instead of an unhandled 500.
 */
export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof Response) return error;

    if (error instanceof ZodError) {
      const errors: Record<string, string[]> = {};
      for (const issue of error.issues) {
        const key = issue.path.join(".") || "form";
        (errors[key] ??= []).push(issue.message);
      }

      return json(
        { message: Object.values(errors)[0]?.[0] ?? "Invalid input.", errors },
        422,
      );
    }

    console.error("Unhandled error in route handler", error);
    return json({ message: "Something went wrong." }, 500);
  }
}

export async function parse<T>(request: Request, schema: ZodType<T>): Promise<T> {
  const body = await request.json().catch(() => ({}));
  return schema.parse(body);
}

/** Page number from the query string, clamped to something sane. */
export function pageOf(url: URL): number {
  const page = Number(url.searchParams.get("page") ?? 1);
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
}

export function meta(page: number, perPage: number, total: number) {
  return {
    page,
    perPage,
    total,
    lastPage: Math.max(1, Math.ceil(total / perPage)),
  };
}

/** "10 mins ago" style label, matching what the UI expects. */
export function agoLabel(date: Date): string {
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86_400)}d ago`;
}

export function initialsOf(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("");
}
