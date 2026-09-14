import type { DashboardData } from "@/app/lib/types";

/**
 * The only place that talks to the API.
 *
 * The API is this same app — the handlers under app/api — so every request is
 * same-origin and the session cookie is first-party. That is what removed the
 * whole class of silent 401s that comes from a cookie the browser quietly
 * refuses to send to a different site.
 */

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    /** Validation errors, keyed by field. */
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

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    // Same-origin, so the cookie rides along; stated explicitly so a future
    // move to a different host fails loudly rather than silently anonymously.
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
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
  status: string;
  statusLabel: string;
  source: string;
  isConverted: boolean;
  contactId: string | null;
  dealId: string | null;
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
export const LEAD_STATUSES = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "unqualified", label: "Unqualified" },
  { value: "converted", label: "Converted" },
] as const;

/** Deal pipeline stages, mirroring Deal::STAGES in the API. */
export const DEAL_STAGES = [
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
  status?: string;
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
    status?: string;
    search?: string;
    source?: string;
    page?: number;
  } = {},
): Promise<Paginated<LeadRecord>> {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.search) query.set("search", params.search);
  if (params.source) query.set("source", params.source);
  if (params.page) query.set("page", String(params.page));
  const suffix = query.toString() ? `?${query}` : "";

  return request<Paginated<LeadRecord>>(`/api/leads${suffix}`);
}

export function convertLead(
  id: string,
  input: { title?: string; value?: number } = {},
): Promise<{ lead: LeadRecord; contactId: string; dealId: string }> {
  return request(`/api/leads/${id}/convert`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// --- contacts ---------------------------------------------------------------

export type ContactRecord = {
  id: string;
  name: string;
  initials: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  notes: string | null;
  owner: { id: number; name: string } | null;
  openDeals: number;
  wonValue: number;
  addedLabel: string;
  createdAt: string;
};

export type ContactInput = {
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  notes?: string | null;
};

export function getContacts(
  params: { search?: string; page?: number } = {},
): Promise<Paginated<ContactRecord>> {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.page) query.set("page", String(params.page));
  const suffix = query.toString() ? `?${query}` : "";

  return request<Paginated<ContactRecord>>(`/api/contacts${suffix}`);
}

export function createContact(input: ContactInput): Promise<ContactRecord> {
  return request("/api/contacts", { method: "POST", body: JSON.stringify(input) });
}

export function updateContact(
  id: string,
  input: Partial<ContactInput>,
): Promise<ContactRecord> {
  return request(`/api/contacts/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function deleteContact(id: string): Promise<void> {
  return request(`/api/contacts/${id}`, { method: "DELETE" });
}

// --- deals ------------------------------------------------------------------

export type DealRecord = {
  id: string;
  title: string;
  stage: string;
  stageLabel: string;
  value: number;
  contact: { id: number; name: string } | null;
  owner: { id: number; name: string } | null;
  isWon: boolean;
  isLost: boolean;
  expectedCloseOn: string | null;
  addedLabel: string;
  createdAt: string;
};

export type DealInput = {
  title: string;
  contact_id?: string | null;
  stage?: string;
  value?: number;
  expected_close_on?: string | null;
  lost?: boolean;
};

export type DealList = Paginated<DealRecord> & {
  summary: { openValue: number; wonValueThisMonth: number };
};

export function getDeals(
  params: { stage?: string; search?: string; includeLost?: boolean; page?: number } = {},
): Promise<DealList> {
  const query = new URLSearchParams();
  if (params.stage) query.set("stage", params.stage);
  if (params.search) query.set("search", params.search);
  if (params.includeLost) query.set("includeLost", "1");
  if (params.page) query.set("page", String(params.page));
  const suffix = query.toString() ? `?${query}` : "";

  return request<DealList>(`/api/deals${suffix}`);
}

export function createDeal(input: DealInput): Promise<DealRecord> {
  return request("/api/deals", { method: "POST", body: JSON.stringify(input) });
}

export function updateDeal(id: string, input: Partial<DealInput>): Promise<DealRecord> {
  return request(`/api/deals/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function deleteDeal(id: string): Promise<void> {
  return request(`/api/deals/${id}`, { method: "DELETE" });
}

// --- tasks ------------------------------------------------------------------

export type TaskRecord = {
  id: string;
  title: string;
  dueAt: string;
  dueLabel: string;
  done: boolean;
  isOverdue: boolean;
  priority: "urgent" | "normal";
  contact: { id: number; name: string } | null;
  deal: { id: number; title: string } | null;
};

export type TaskList = Paginated<TaskRecord> & {
  counts: { open: number; overdue: number; today: number };
};

export function getTasks(
  params: { filter?: string; page?: number } = {},
): Promise<TaskList> {
  const query = new URLSearchParams();
  if (params.filter) query.set("filter", params.filter);
  if (params.page) query.set("page", String(params.page));
  const suffix = query.toString() ? `?${query}` : "";

  return request<TaskList>(`/api/tasks${suffix}`);
}

export function createTask(input: {
  title: string;
  due_at: string;
  contact_id?: string | null;
}): Promise<TaskRecord> {
  return request("/api/tasks", { method: "POST", body: JSON.stringify(input) });
}

export function updateTask(
  id: string,
  input: { title?: string; due_at?: string; done?: boolean },
): Promise<TaskRecord> {
  return request(`/api/tasks/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function deleteTask(id: string): Promise<void> {
  return request(`/api/tasks/${id}`, { method: "DELETE" });
}
