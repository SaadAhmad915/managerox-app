import { and, count, desc, eq, ilike, inArray, isNull, or, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { contacts, deals, users } from "@/db/schema";
import { requireUser } from "@/app/lib/auth-server";
import { handle, json, meta, pageOf, parse } from "@/app/lib/http";
import { presentContact } from "@/app/lib/present";
import { likeTerm, named, perPageOf } from "@/app/lib/query";

export const contactInput = z.object({
  name: z.string().trim().min(1, "A name is required.").max(255),
  email: z.email("Enter a valid email address.").max(255).nullish(),
  phone: z.string().max(40).nullish(),
  company: z.string().max(255).nullish(),
  notes: z.string().max(5000).nullish(),
});

/**
 * Open-deal counts and won value for a page of contacts, in one query.
 *
 * Aggregating per contact inside the list query would need two correlated
 * subqueries; fetching the page first and then aggregating over just those ids
 * keeps both queries simple and reads the deals table once.
 */
async function dealRollup(
  db: Awaited<ReturnType<typeof getDb>>,
  contactIds: number[],
) {
  if (contactIds.length === 0) return new Map<number, { open: number; won: number }>();

  const rows = await db
    .select({
      contactId: deals.contactId,
      open: sql<number>`count(*) filter (where ${deals.stage} <> 'closed')`.mapWith(Number),
      won: sql<number>`coalesce(sum(${deals.value}) filter (where ${deals.stage} = 'closed'), 0)`.mapWith(Number),
    })
    .from(deals)
    .where(and(inArray(deals.contactId, contactIds), isNull(deals.lostAt)))
    .groupBy(deals.contactId);

  return new Map(
    rows.map((row) => [row.contactId as number, { open: row.open, won: row.won }]),
  );
}

export async function GET(request: Request) {
  return handle(async () => {
    await requireUser();

    const db = await getDb();
    const url = new URL(request.url);
    const page = pageOf(url);
    const perPage = perPageOf(url, 25);

    const filters: SQL[] = [];
    const search = url.searchParams.get("search")?.trim();

    if (search) {
      const term = likeTerm(search);
      filters.push(
        or(
          ilike(contacts.name, term),
          ilike(contacts.company, term),
          ilike(contacts.email, term),
        ) as SQL,
      );
    }

    const where = filters.length ? and(...filters) : undefined;

    const [{ total }] = await db
      .select({ total: count() })
      .from(contacts)
      .where(where);

    const rows = await db
      .select({ contact: contacts, owner: { id: users.id, name: users.name } })
      .from(contacts)
      .leftJoin(users, eq(users.id, contacts.ownerId))
      .where(where)
      .orderBy(desc(contacts.createdAt), desc(contacts.id))
      .limit(perPage)
      .offset((page - 1) * perPage);

    const rollup = await dealRollup(db, rows.map((row) => row.contact.id));

    return json({
      data: rows.map((row) =>
        presentContact(row.contact, {
          owner: named(row.owner),
          openDeals: rollup.get(row.contact.id)?.open ?? 0,
          wonValue: rollup.get(row.contact.id)?.won ?? 0,
        }),
      ),
      meta: meta(page, perPage, total),
    });
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    const user = await requireUser();

    const input = await parse(request, contactInput);
    const db = await getDb();

    const [contact] = await db
      .insert(contacts)
      .values({
        name: input.name,
        email: input.email ?? null,
        phone: input.phone ?? null,
        company: input.company ?? null,
        notes: input.notes ?? null,
        ownerId: user.id,
      })
      .returning();

    return json(
      presentContact(contact, { owner: { id: user.id, name: user.name } }),
      201,
    );
  });
}
