import "server-only";

import type { InferSelectModel } from "drizzle-orm";
import { agoLabel, initialsOf } from "@/app/lib/http";
import type { contacts, deals, leads, tasks } from "@/db/schema";

/**
 * Turns database rows into the JSON the screens read.
 *
 * Every presenter lives here rather than in its route handler so that a field
 * the UI depends on is renamed in one place. `id` is always a string: the
 * client types it that way, and a numeric id that arrives as a number in one
 * response and a string in another is a bug waiting to happen in a key prop.
 */

export const LEAD_STATUS_LABELS: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  unqualified: "Unqualified",
  converted: "Converted",
};

export const DEAL_STAGE_LABELS: Record<string, string> = {
  new: "New Leads",
  qualified: "Qualified",
  proposal: "Proposal",
  negotiation: "Negotiation",
  closed: "Closed",
};

type LeadRow = InferSelectModel<typeof leads>;
type ContactRow = InferSelectModel<typeof contacts>;
type DealRow = InferSelectModel<typeof deals>;
type TaskRow = InferSelectModel<typeof tasks>;

export type Named = { id: number; name: string } | null;

export function presentLead(
  lead: LeadRow,
  related: { owner?: Named; contactId?: number | null; dealId?: number | null } = {},
) {
  return {
    id: String(lead.id),
    name: lead.name,
    initials: initialsOf(lead.name),
    email: lead.email,
    phone: lead.phone,
    detail: lead.detail ?? "",
    status: lead.status,
    statusLabel: LEAD_STATUS_LABELS[lead.status] ?? lead.status,
    source: lead.source,
    isConverted: lead.convertedAt !== null,
    contactId: related.contactId != null ? String(related.contactId) : null,
    dealId: related.dealId != null ? String(related.dealId) : null,
    owner: related.owner ?? null,
    receivedLabel: agoLabel(lead.createdAt),
    createdAt: lead.createdAt.toISOString(),
  };
}

export function presentContact(
  contact: ContactRow,
  related: { owner?: Named; openDeals?: number; wonValue?: number } = {},
) {
  return {
    id: String(contact.id),
    name: contact.name,
    initials: initialsOf(contact.name),
    email: contact.email,
    phone: contact.phone,
    company: contact.company,
    notes: contact.notes,
    owner: related.owner ?? null,
    openDeals: related.openDeals ?? 0,
    wonValue: related.wonValue ?? 0,
    addedLabel: agoLabel(contact.createdAt),
    createdAt: contact.createdAt.toISOString(),
  };
}

export function presentDeal(
  deal: DealRow,
  related: { contact?: Named; owner?: Named } = {},
) {
  return {
    id: String(deal.id),
    title: deal.title,
    stage: deal.stage,
    stageLabel: DEAL_STAGE_LABELS[deal.stage] ?? deal.stage,
    value: deal.value,
    contact: related.contact ?? null,
    owner: related.owner ?? null,
    isWon: deal.stage === "closed" && deal.lostAt === null,
    isLost: deal.lostAt !== null,
    expectedCloseOn: deal.expectedCloseOn,
    addedLabel: agoLabel(deal.createdAt),
    createdAt: deal.createdAt.toISOString(),
  };
}

export function presentTask(
  task: TaskRow,
  related: { contact?: Named; deal?: { id: number; title: string } | null } = {},
) {
  const overdue = !task.done && task.dueAt.getTime() < Date.now();

  return {
    id: String(task.id),
    title: task.title,
    dueAt: task.dueAt.toISOString(),
    dueLabel: dueLabel(task.dueAt),
    done: task.done,
    isOverdue: overdue,
    priority: !task.done && (overdue || isToday(task.dueAt)) ? "urgent" : "normal",
    contact: related.contact ?? null,
    deal: related.deal ?? null,
  };
}

// --- date and number labels -------------------------------------------------

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function isToday(date: Date): boolean {
  return startOfDay(date).getTime() === startOfDay(new Date()).getTime();
}

export function monthLabel(date: Date): string {
  return MONTH_NAMES[date.getMonth()];
}

/** "Today, 3:00 PM" / "Tomorrow, 9:30 AM" / "Fri 12 Sep, 4:00 PM" */
export function dueLabel(due: Date): string {
  const days = Math.round(
    (startOfDay(due).getTime() - startOfDay(new Date()).getTime()) / 86_400_000,
  );

  const day =
    days === 0
      ? "Today"
      : days === 1
        ? "Tomorrow"
        : days === -1
          ? "Yesterday"
          : `${DAY_NAMES[due.getDay()]} ${due.getDate()} ${MONTH_NAMES[due.getMonth()]}`;

  const hour = due.getHours() % 12 || 12;
  const minute = String(due.getMinutes()).padStart(2, "0");
  const suffix = due.getHours() < 12 ? "AM" : "PM";

  return `${day}, ${hour}:${minute} ${suffix}`;
}

/** 52_000_000 -> "52M". Stat tiles have room for four characters, not nine. */
export function compactNumber(value: number): string {
  if (value >= 1_000_000_000) return `${round1(value / 1_000_000_000)}B`;
  if (value >= 1_000_000) return `${round1(value / 1_000_000)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return String(value);
}

function round1(value: number): string {
  return String(Math.round(value * 10) / 10);
}

export function groupedNumber(value: number): string {
  return value.toLocaleString("en-US");
}
