import type { DashboardData } from "@/app/lib/types";

/**
 * The single seam between the UI and the backend.
 *
 * Every function here is async and returns domain types, so swapping the mock
 * for the Laravel API on api.managerox.com is a change to this file only — no
 * component touches fetch, URLs, or response shapes.
 *
 * When the API exists, the body becomes roughly:
 *
 *   const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/dashboard`, {
 *     credentials: "include",        // session cookie on .managerox.com
 *     headers: { Accept: "application/json" },
 *   });
 *   if (!res.ok) throw new ApiError(res.status);
 *   return res.json();
 *
 * app. and api. are different origins but the same site, so a Lax cookie
 * scoped to .managerox.com is sent on these requests; Laravel needs CORS with
 * an explicit origin plus supports_credentials.
 */

const MOCK_DASHBOARD: DashboardData = {
  user: { firstName: "Ali", fullName: "Ali Khan", role: "Sales Manager" },
  stats: [
    {
      key: "leads",
      label: "Total Leads",
      display: "1,250",
      value: 1250,
      trend: { changePct: 12, comparisonLabel: "vs last month" },
    },
    {
      key: "deals",
      label: "Active Deals",
      display: "320",
      value: 320,
      trend: { changePct: 8, comparisonLabel: "vs last month" },
    },
    {
      key: "customers",
      label: "Customers",
      display: "890",
      value: 890,
      trend: { changePct: 15, comparisonLabel: "vs last month" },
    },
    {
      key: "revenue",
      label: "Revenue (PKR)",
      display: "52M",
      value: 52_000_000,
      trend: { changePct: 20, comparisonLabel: "vs last month" },
    },
  ],
  pipeline: [
    { id: "new", label: "New Leads", count: 1250 },
    { id: "qualified", label: "Qualified", count: 640 },
    { id: "proposal", label: "Proposal", count: 320 },
    { id: "negotiation", label: "Negotiation", count: 210 },
    { id: "closed", label: "Closed", count: 180 },
  ],
  revenue: {
    currency: "PKR",
    total: 52_000_000,
    totalDisplay: "PKR 52,000,000",
    trend: { changePct: 20, comparisonLabel: "vs last month" },
    points: [
      { month: "Jan", value: 8_000_000 },
      { month: "Feb", value: 20_000_000 },
      { month: "Mar", value: 28_000_000 },
      { month: "Apr", value: 38_000_000 },
      { month: "May", value: 45_000_000 },
      { month: "Jun", value: 52_000_000 },
    ],
  },
  tasks: [
    {
      id: "t1",
      title: "Follow up with Ahmed (Phase 7 Plot)",
      dueLabel: "Today, 11:00 AM",
      priority: "urgent",
      done: false,
    },
    {
      id: "t2",
      title: "Send proposal to Zameen Group",
      dueLabel: "Today, 2:00 PM",
      priority: "urgent",
      done: false,
    },
    {
      id: "t3",
      title: "Call new lead from website",
      dueLabel: "Tomorrow, 10:00 AM",
      priority: "normal",
      done: false,
    },
    {
      id: "t4",
      title: "Prepare weekly sales report",
      dueLabel: "Tomorrow, 4:00 PM",
      priority: "normal",
      done: false,
    },
  ],
  recentLeads: [
    {
      id: "l1",
      name: "Farhan Ali",
      initials: "FA",
      detail: "Residential Plot – DHA Lahore",
      receivedLabel: "10 mins ago",
    },
    {
      id: "l2",
      name: "Sara Khan",
      initials: "SK",
      detail: "Commercial – DHA Karachi",
      receivedLabel: "1 hour ago",
    },
    {
      id: "l3",
      name: "Ahmad Malik",
      initials: "AM",
      detail: "Villa – DHA Islamabad",
      receivedLabel: "3 hours ago",
    },
    {
      id: "l4",
      name: "Nida Zahra",
      initials: "NZ",
      detail: "Apartment – DHA Multan",
      receivedLabel: "5 hours ago",
    },
  ],
  team: [
    { id: "u1", name: "Ali Khan", role: "Sales Manager", attainment: 92 },
    { id: "u2", name: "Sara Ahmed", role: "Sales Executive", attainment: 78 },
    { id: "u3", name: "Bilal Raza", role: "Sales Executive", attainment: 65 },
    { id: "u4", name: "Ayesha Malik", role: "Sales Executive", attainment: 58 },
  ],
};

export async function getDashboard(): Promise<DashboardData> {
  return MOCK_DASHBOARD;
}
