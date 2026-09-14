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

/**
 * Empty on purpose: requests go to this app's own origin and next.config.ts
 * rewrites them to the API. That keeps the session cookie first-party, which is
 * what makes auth work when the CRM and API sit on unrelated hosts.
 *
 * Set NEXT_PUBLIC_API_URL only to bypass the proxy and call the API directly —
 * which requires the two to be same-site, or auth will fail.
 */
const BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");

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
  source: string;
  value: number;
  owner: { id: number; name: string } | null;
  receivedLabel: string;
  createdAt: string;
};

export type Paginated<T> = {
  data: T[];
  meta: { page: number; perPage: number; total: number; lastPage: number };
};

/**
 * Pipeline stages, mirroring Lead::STAGES in the API. Kept here rather than
 * fetched because five constants are not worth a round trip — but if the API's
 * list changes, this must change with it.
 */
export const LEAD_STAGES = [
  { value: "new", label: "New Leads" },
  { value: "qualified", label: "Qualified" },
  { value: "proposal", label: "Proposal" },
  { value: "negotiation", label: "Negotiation" },
  { value: "closed", label: "Closed" },
] as const;

export type LeadInput = {
  name: string;
  email?: string | null;
  phone?: string | null;
  detail?: string | null;
  stage?: string;
  value?: number;
};

export function createLead(input: LeadInput): Promise<LeadRecord> {
  return request<LeadRecord>("/api/leads", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateLead(
  id: string,
  input: Partial<LeadInput>,
): Promise<LeadRecord> {
  return request<LeadRecord>(`/api/leads/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteLead(id: string): Promise<void> {
  return request<void>(`/api/leads/${id}`, { method: "DELETE" });
}

export function getLeads(
  params: {
    stage?: string;
    search?: string;
    source?: string;
    page?: number;
  } = {},
): Promise<Paginated<LeadRecord>> {
  const query = new URLSearchParams();
  if (params.stage) query.set("stage", params.stage);
  if (params.search) query.set("search", params.search);
  if (params.source) query.set("source", params.source);
  if (params.page) query.set("page", String(params.page));
  const suffix = query.toString() ? `?${query}` : "";

  return request<Paginated<LeadRecord>>(`/api/leads${suffix}`);
}
