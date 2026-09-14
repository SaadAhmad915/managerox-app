import type { DashboardData } from "@/app/lib/types";

/**
 * The only place that talks to the Laravel API.
 *
 * Auth is Sanctum's SPA cookie mode, so every request must send credentials and
 * state-changing requests must carry the XSRF header. Three rules follow, and
 * breaking any of them produces a silent 401 rather than an obvious error:
 *
 *  1. `credentials: "include"` on every call — without it the browser omits the
 *     session cookie and the API sees an anonymous request.
 *  2. `/sanctum/csrf-cookie` must be fetched once before the first POST.
 *  3. The API's Origin must appear in its SANCTUM_STATEFUL_DOMAINS, or Sanctum
 *     treats the request as stateless and never attaches a session at all.
 */

const BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"
).replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    /** Laravel validation errors, keyed by field. */
    readonly errors: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = "ApiError";
  }

  get isUnauthenticated() {
    return this.status === 401 || this.status === 419;
  }

  /** First validation message for a field, if the API returned one. */
  fieldError(field: string): string | undefined {
    return this.errors[field]?.[0];
  }
}

function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : undefined;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? "GET").toUpperCase();

  // Laravel rejects state-changing requests without a matching XSRF header.
  if (method !== "GET" && method !== "HEAD") {
    await ensureCsrfCookie();
  }

  const xsrf = readCookie("XSRF-TOKEN");

  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(xsrf ? { "X-XSRF-TOKEN": xsrf } : {}),
      ...init.headers,
    },
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(
      response.status,
      body.message ?? `Request failed with ${response.status}`,
      body.errors ?? {},
    );
  }

  return body as T;
}

let csrfPromise: Promise<void> | null = null;

/** Fetched once per page load; concurrent callers share the same request. */
export function ensureCsrfCookie(): Promise<void> {
  csrfPromise ??= fetch(`${BASE_URL}/sanctum/csrf-cookie`, {
    credentials: "include",
  })
    .then(() => undefined)
    .catch((error) => {
      csrfPromise = null; // let a later call retry
      throw error;
    });

  return csrfPromise;
}

export type AuthUser = {
  id: string;
  firstName: string;
  fullName: string;
  email: string;
  role: string;
  initials: string;
};

export function login(email: string, password: string): Promise<AuthUser> {
  return request<AuthUser>("/api/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function logout(): Promise<void> {
  await request<{ message: string }>("/api/logout", { method: "POST" });
}

export function getMe(): Promise<AuthUser> {
  return request<AuthUser>("/api/me");
}

export function getDashboard(): Promise<DashboardData> {
  return request<DashboardData>("/api/dashboard");
}

export type LeadRecord = {
  id: string;
  name: string;
  initials: string;
  email: string | null;
  phone: string | null;
  detail: string;
  stage: string;
  stageLabel: string;
  value: number;
  owner: { id: number; name: string } | null;
  receivedLabel: string;
  createdAt: string;
};

export type Paginated<T> = {
  data: T[];
  meta: { page: number; perPage: number; total: number; lastPage: number };
};

export function getLeads(
  params: { stage?: string; search?: string; page?: number } = {},
): Promise<Paginated<LeadRecord>> {
  const query = new URLSearchParams();
  if (params.stage) query.set("stage", params.stage);
  if (params.search) query.set("search", params.search);
  if (params.page) query.set("page", String(params.page));
  const suffix = query.toString() ? `?${query}` : "";

  return request<Paginated<LeadRecord>>(`/api/leads${suffix}`);
}
