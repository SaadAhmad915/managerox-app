import { and, asc, count, eq, gte, lt, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { contacts, deals, tasks } from "@/db/schema";
import { requireUser } from "@/app/lib/auth-server";
import { handle, json, meta, pageOf, parse } from "@/app/lib/http";
import { presentTask, startOfDay } from "@/app/lib/present";
import { named, perPageOf, titled } from "@/app/lib/query";

export const taskInput = z.object({
  title: z.string().trim().min(1, "A title is required.").max(255),
  due_at: z.coerce.date(),
  done: z.boolean().optional(),
  contact_id: z.union([z.string(), z.number()]).nullish(),
  deal_id: z.union([z.string(), z.number()]).nullish(),
});

function endOfToday(): Date {
  const end = startOfDay(new Date());
  end.setDate(end.getDate() + 1);
  return end;
}

export async function GET(request: Request) {
  return handle(async () => {
    await requireUser();

    const db = await getDb();
    const url = new URL(request.url);
    const page = pageOf(url);
    const perPage = perPageOf(url, 50);
    const filter = url.searchParams.get("filter");
    const now = new Date();

    const open = eq(tasks.done, false);
    const filters: Record<string, SQL | undefined> = {
      open,
      done: eq(tasks.done, true),
      overdue: and(open, lt(tasks.dueAt, now)),
      today: and(open, gte(tasks.dueAt, startOfDay(now)), lt(tasks.dueAt, endOfToday())),
    };

    const where = filter ? filters[filter] : undefined;

    const [{ total }] = await db
      .select({ total: count() })
      .from(tasks)
      .where(where);

    const rows = await db
      .select({
        task: tasks,
        contact: { id: contacts.id, name: contacts.name },
        deal: { id: deals.id, title: deals.title },
      })
      .from(tasks)
      .leftJoin(contacts, eq(contacts.id, tasks.contactId))
      .leftJoin(deals, eq(deals.id, tasks.dealId))
      .where(where)
      // Unfinished work first, then by when it is due.
      .orderBy(asc(tasks.done), asc(tasks.dueAt), asc(tasks.id))
      .limit(perPage)
      .offset((page - 1) * perPage);

    const [counts] = await db
      .select({
        open: sql<number>`count(*) filter (where ${tasks.done} = false)`.mapWith(Number),
        overdue: sql<number>`count(*) filter (where ${tasks.done} = false and ${tasks.dueAt} < ${now})`.mapWith(Number),
        today: sql<number>`count(*) filter (where ${tasks.done} = false and ${tasks.dueAt} >= ${startOfDay(now)} and ${tasks.dueAt} < ${endOfToday()})`.mapWith(Number),
      })
      .from(tasks);

    return json({
      data: rows.map((row) =>
        presentTask(row.task, {
          contact: named(row.contact),
          deal: titled(row.deal),
        }),
      ),
      meta: meta(page, perPage, total),
      counts,
    });
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    const user = await requireUser();

    const input = await parse(request, taskInput);
    const db = await getDb();

    const [task] = await db
      .insert(tasks)
      .values({
        title: input.title,
        dueAt: input.due_at,
        done: input.done ?? false,
        userId: user.id,
        contactId: input.contact_id == null ? null : Number(input.contact_id),
        dealId: input.deal_id == null ? null : Number(input.deal_id),
      })
      .returning();

    return json(presentTask(task), 201);
  });
}
