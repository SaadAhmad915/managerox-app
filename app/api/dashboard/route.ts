import { and, asc, count, desc, eq, gte, inArray, isNotNull, isNull, lt, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import {
  DEAL_STAGES,
  OPEN_DEAL_STAGES,
  OPEN_LEAD_STATUSES,
  contacts,
  deals,
  leads,
  tasks,
  users,
} from "@/db/schema";
import { requireUser } from "@/app/lib/auth-server";
import { agoLabel, handle, initialsOf, json } from "@/app/lib/http";
import {
  DEAL_STAGE_LABELS,
  compactNumber,
  dueLabel,
  groupedNumber,
  monthLabel,
  startOfMonth,
} from "@/app/lib/present";

/**
 * Everything the dashboard draws, in one response.
 *
 * The shape mirrors `DashboardData` in app/lib/types.ts — the screen reads
 * these keys directly, so renaming one here breaks it there.
 */

type Database = Awaited<ReturnType<typeof getDb>>;

/** A deal that is still live: not written off. */
const active = isNull(deals.lostAt);

/** A deal that actually brought in money. */
const won = and(isNull(deals.lostAt), eq(deals.stage, "closed"), isNotNull(deals.closedAt));

export async function GET() {
  return handle(async () => {
    const user = await requireUser();
    const db = await getDb();

    const now = new Date();
    const monthStart = startOfMonth(now);
    const prevStart = new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1);

    const rows = async (where: SQL | undefined, table: typeof leads | typeof contacts) => {
      const [row] = await db.select({ total: count() }).from(table).where(where);
      return row.total;
    };

    const sumWhere = async (where: SQL | undefined) => {
      const [row] = await db
        .select({ total: sql<number>`coalesce(sum(${deals.value}), 0)`.mapWith(Number) })
        .from(deals)
        .where(where);
      return row.total;
    };

    const dealsWhere = async (where: SQL | undefined) => {
      const [row] = await db.select({ total: count() }).from(deals).where(where);
      return row.total;
    };

    const openDealFilter = and(active, inArray(deals.stage, [...OPEN_DEAL_STAGES]));

    const [
      totalLeads,
      leadsThisMonth,
      leadsLastMonth,
      totalContacts,
      contactsThisMonth,
      contactsLastMonth,
      openDeals,
      openDealsThisMonth,
      openDealsLastMonth,
      revenueThisMonth,
      revenueLastMonth,
    ] = await Promise.all([
      rows(undefined, leads),
      rows(gte(leads.createdAt, monthStart), leads),
      rows(and(gte(leads.createdAt, prevStart), lt(leads.createdAt, monthStart)), leads),
      rows(undefined, contacts),
      rows(gte(contacts.createdAt, monthStart), contacts),
      rows(and(gte(contacts.createdAt, prevStart), lt(contacts.createdAt, monthStart)), contacts),
      dealsWhere(openDealFilter),
      dealsWhere(and(openDealFilter, gte(deals.createdAt, monthStart))),
      dealsWhere(and(openDealFilter, gte(deals.createdAt, prevStart), lt(deals.createdAt, monthStart))),
      sumWhere(and(won, gte(deals.closedAt, monthStart))),
      sumWhere(and(won, gte(deals.closedAt, prevStart), lt(deals.closedAt, monthStart))),
    ]);

    return json({
      user: {
        firstName: user.name.split(" ")[0],
        fullName: user.name,
        role: user.role,
      },
      stats: [
        stat("leads", "Total Leads", totalLeads, leadsThisMonth, leadsLastMonth),
        stat("deals", "Active Deals", openDeals, openDealsThisMonth, openDealsLastMonth),
        stat("customers", "Customers", totalContacts, contactsThisMonth, contactsLastMonth),
        stat("revenue", "Revenue (PKR)", revenueThisMonth, revenueThisMonth, revenueLastMonth, true),
      ],
      pipeline: await pipeline(db, monthStart),
      revenue: await revenue(db, monthStart, revenueThisMonth, revenueLastMonth),
      tasks: await openTasks(db),
      recentLeads: await recentLeads(db),
      team: await team(db, monthStart),
    });
  });
}

/**
 * A percentage change needs something to divide by. With no activity last month
 * there is no honest figure, so the change is reported as zero rather than as
 * an invented "+100%".
 */
function stat(
  key: string,
  label: string,
  value: number,
  current: number,
  previous: number,
  compact = false,
) {
  return {
    key,
    label,
    display: compact ? compactNumber(value) : groupedNumber(value),
    value,
    trend: {
      changePct: previous > 0 ? Math.round(((current - previous) / previous) * 100) : 0,
      comparisonLabel: "vs last month",
    },
  };
}

/**
 * The funnel counts deals sitting in each open stage right now, plus deals
 * closed **this month**.
 *
 * Counting closed deals for all time would compare a growing archive against a
 * live pipeline: after a year of trading the Closed band dwarfs every other
 * stage and the funnel is upside down for good, which says nothing about how
 * business is actually flowing.
 */
async function pipeline(db: Database, monthStart: Date) {
  const counts = await db
    .select({ stage: deals.stage, total: count() })
    .from(deals)
    .where(and(active, inArray(deals.stage, [...OPEN_DEAL_STAGES])))
    .groupBy(deals.stage);

  const byStage = new Map(counts.map((row) => [row.stage, row.total]));

  const [closed] = await db
    .select({ total: count() })
    .from(deals)
    .where(and(won, gte(deals.closedAt, monthStart)));

  byStage.set("closed", closed.total);

  // Driven by the stage list, not by what the query returned, so an empty stage
  // still shows as a zero-height band instead of vanishing from the funnel.
  return DEAL_STAGES.map((stage) => ({
    id: stage,
    // Named for the period it covers, and short enough that the legend does
    // not truncate away the very qualifier that makes the number honest.
    label: stage === "closed" ? "Won this month" : DEAL_STAGE_LABELS[stage],
    count: byStage.get(stage) ?? 0,
  }));
}

async function revenue(
  db: Database,
  monthStart: Date,
  total: number,
  previous: number,
) {
  const points = [];

  for (let back = 5; back >= 0; back--) {
    const start = new Date(monthStart.getFullYear(), monthStart.getMonth() - back, 1);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);

    const [row] = await db
      .select({ value: sql<number>`coalesce(sum(${deals.value}), 0)`.mapWith(Number) })
      .from(deals)
      .where(and(won, gte(deals.closedAt, start), lt(deals.closedAt, end)));

    points.push({ month: monthLabel(start), value: row.value });
  }

  return {
    currency: "PKR",
    total,
    totalDisplay: `PKR ${groupedNumber(total)}`,
    trend: {
      changePct: previous > 0 ? Math.round(((total - previous) / previous) * 100) : 0,
      comparisonLabel: "vs last month",
    },
    points,
  };
}

async function openTasks(db: Database) {
  const rows = await db
    .select()
    .from(tasks)
    .where(eq(tasks.done, false))
    .orderBy(asc(tasks.dueAt))
    .limit(4);

  return rows.map((task) => ({
    id: String(task.id),
    title: task.title,
    dueLabel: dueLabel(task.dueAt),
    priority: task.dueAt.getTime() <= endOfToday() ? "urgent" : "normal",
    done: task.done,
  }));
}

function endOfToday(): number {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return end.getTime();
}

async function recentLeads(db: Database) {
  const rows = await db
    .select()
    .from(leads)
    .where(inArray(leads.status, [...OPEN_LEAD_STATUSES]))
    .orderBy(desc(leads.createdAt), desc(leads.id))
    .limit(4);

  return rows.map((lead) => ({
    id: String(lead.id),
    name: lead.name,
    initials: initialsOf(lead.name),
    detail: lead.detail ?? "",
    receivedLabel: agoLabel(lead.createdAt),
  }));
}

async function team(db: Database, monthStart: Date) {
  const members = await db.select().from(users).orderBy(asc(users.id));

  const closed = await db
    .select({
      ownerId: deals.ownerId,
      total: sql<number>`coalesce(sum(${deals.value}), 0)`.mapWith(Number),
    })
    .from(deals)
    .where(and(won, gte(deals.closedAt, monthStart)))
    .groupBy(deals.ownerId);

  const byOwner = new Map(closed.map((row) => [row.ownerId, row.total]));

  return members.map((member) => ({
    id: String(member.id),
    name: member.name,
    role: member.role,
    attainment:
      member.monthlyTarget > 0
        ? Math.round(((byOwner.get(member.id) ?? 0) / member.monthlyTarget) * 100)
        : 0,
  }));
}
