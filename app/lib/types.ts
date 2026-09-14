/**
 * Domain types shared by the UI and the API client.
 *
 * `DashboardData` is also the contract app/api/dashboard/route.ts builds to —
 * renaming a key here without changing it there breaks the dashboard silently.
 */

export type Trend = {
  /** Percentage change vs the comparison period, e.g. 12 for "+12%". */
  changePct: number;
  comparisonLabel: string;
};

export type StatKey = "leads" | "deals" | "customers" | "revenue";

export type Stat = {
  key: StatKey;
  label: string;
  /** Pre-formatted for display ("1,250", "52M") — the raw value stays separate. */
  display: string;
  value: number;
  trend: Trend;
};

export type PipelineStage = {
  id: string;
  label: string;
  count: number;
};

export type RevenuePoint = {
  month: string;
  value: number;
};

export type RevenueSeries = {
  currency: string;
  total: number;
  totalDisplay: string;
  trend: Trend;
  points: RevenuePoint[];
};

export type TaskPriority = "urgent" | "normal";

export type Task = {
  id: string;
  title: string;
  dueLabel: string;
  priority: TaskPriority;
  done: boolean;
};

export type Lead = {
  id: string;
  name: string;
  initials: string;
  detail: string;
  receivedLabel: string;
};

export type TeamMember = {
  id: string;
  name: string;
  role: string;
  /** 0–100. */
  attainment: number;
};

export type DashboardData = {
  user: { firstName: string; fullName: string; role: string };
  stats: Stat[];
  pipeline: PipelineStage[];
  revenue: RevenueSeries;
  tasks: Task[];
  recentLeads: Lead[];
  team: TeamMember[];
};
