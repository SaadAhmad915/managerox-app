import { and, count, desc, eq, ilike, inArray, isNotNull, isNull, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { DEAL_STAGES, OPEN_DEAL_STAGES, contacts, deals, users } from "@/db/schema";
import { requireUser } from "@/app/lib/auth-server";
import { stamped } from "@/app/lib/deal-stage";
import { handle, json, meta, pageOf, parse } from "@/app/lib/http";
import { presentDeal, startOfMonth } from "@/app/lib/present";
import { likeTerm, named, perPageOf } from "@/app/lib/query";

export const dealInput = z.object({
  title: z.string().trim().min(1, "A title is required.").max(255),
  contact_id: z.union([z.string(), z.number()]).nullish(),
  stage: z.enum(DEAL_STAGES).optional(),
  value: z.number().int().min(0).optional(),
  expected_close_on: z.string().nullish(),
  lost: z.boolean().optional(),
});

export async function GET(request: Request) {
  return handle(async () => {
    await requireUser();

    const db = await getDb();
    const url = new URL(request.url);
    const page = pageOf(url);
    const perPage = perPageOf(url, 25);

    const filters: SQL[] = [];
    const stage = url.searchParams.get("stage");
    const search = url.searchParams.get("search")?.trim();

    if (stage) filters.push(eq(deals.stage, stage));
    if (search) filters.push(ilike(deals.title, likeTerm(search)));
    // Lost deals are history: shown only when explicitly asked for.
    if (!url.searchParams.get("includeLost")) filters.push(isNull(deals.lostAt));

    const where = filters.length ? and(...filters) : undefined;

    const [{ total }] = await db
      .select({ total: count() })
      .from(deals)
      .where(where);

    const rows = await db
      .select({
        deal: deals,
        contact: { id: contacts.id, name: contacts.name },
        owner: { id: users.id, name: users.name },
      })
      .from(deals)
      .leftJoin(contacts, eq(contacts.id, deals.contactId))
      .leftJoin(users, eq(users.id, deals.ownerId))
      .where(where)
      .orderBy(desc(deals.createdAt), desc(deals.id))
      .limit(perPage)
      .offset((page - 1) * perPage);

    const [openValue] = await db
      .select({ total: sql<number>`coalesce(sum(${deals.value}), 0)`.mapWith(Number) })
      .from(deals)
      .where(and(isNull(deals.lostAt), inArray(deals.stage, [...OPEN_DEAL_STAGES])));

    const [wonValue] = await db
      .select({ total: sql<number>`coalesce(sum(${deals.value}), 0)`.mapWith(Number) })
      .from(deals)
      .where(
        and(
          isNull(deals.lostAt),
          isNotNull(deals.closedAt),
          sql`${deals.closedAt} >= ${startOfMonth(new Date())}`,
        ),
      );

    return json({
      data: rows.map((row) =>
        presentDeal(row.deal, {
          contact: named(row.contact),
          owner: named(row.owner),
        }),
      ),
      meta: meta(page, perPage, total),
      summary: {
        openValue: openValue.total,
        wonValueThisMonth: wonValue.total,
      },
    });
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    const user = await requireUser();

    const input = await parse(request, dealInput);
    const db = await getDb();

    const [deal] = await db
      .insert(deals)
      .values({
        title: input.title,
        stage: input.stage ?? "new",
        value: input.value ?? 0,
        ownerId: user.id,
        ...stamped(input),
      })
      .returning();

    const [contact] = deal.contactId
      ? await db
          .select({ id: contacts.id, name: contacts.name })
          .from(contacts)
          .where(eq(contacts.id, deal.contactId))
          .limit(1)
      : [];

    return json(
      presentDeal(deal, {
        contact: named(contact),
        owner: { id: user.id, name: user.name },
      }),
      201,
    );
  });
}
