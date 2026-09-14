import { and, count, desc, eq, ilike, inArray, or, type SQL } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import {
  LEAD_STATUSES,
  OPEN_LEAD_STATUSES,
  contacts,
  deals,
  leads,
  users,
} from "@/db/schema";
import { requireUser } from "@/app/lib/auth-server";
import { handle, json, meta, pageOf, parse } from "@/app/lib/http";
import { presentLead } from "@/app/lib/present";
import { likeTerm, named, perPageOf } from "@/app/lib/query";

export const leadInput = z.object({
  name: z.string().trim().min(1, "A name is required.").max(255),
  email: z.email("Enter a valid email address.").max(255).nullish(),
  phone: z.string().max(40).nullish(),
  detail: z.string().max(255).nullish(),
  status: z.enum(LEAD_STATUSES).optional(),
  source: z.string().max(60).optional(),
});

export async function GET(request: Request) {
  return handle(async () => {
    await requireUser();

    const db = await getDb();
    const url = new URL(request.url);
    const page = pageOf(url);
    const perPage = perPageOf(url, 25);

    const filters: SQL[] = [];
    const status = url.searchParams.get("status");
    const source = url.searchParams.get("source");
    const search = url.searchParams.get("search")?.trim();

    if (status) filters.push(eq(leads.status, status));
    if (source) filters.push(eq(leads.source, source));
    if (url.searchParams.get("openOnly")) {
      filters.push(inArray(leads.status, [...OPEN_LEAD_STATUSES]));
    }
    if (search) {
      const term = likeTerm(search);
      filters.push(
        or(ilike(leads.name, term), ilike(leads.detail, term)) as SQL,
      );
    }

    const where = filters.length ? and(...filters) : undefined;

    const [{ total }] = await db
      .select({ total: count() })
      .from(leads)
      .where(where);

    const rows = await db
      .select({
        lead: leads,
        owner: { id: users.id, name: users.name },
        contactId: contacts.id,
        dealId: deals.id,
      })
      .from(leads)
      .leftJoin(users, eq(users.id, leads.ownerId))
      .leftJoin(contacts, eq(contacts.leadId, leads.id))
      .leftJoin(deals, eq(deals.leadId, leads.id))
      .where(where)
      .orderBy(desc(leads.createdAt), desc(leads.id))
      .limit(perPage)
      .offset((page - 1) * perPage);

    return json({
      data: rows.map((row) =>
        presentLead(row.lead, {
          owner: named(row.owner),
          contactId: row.contactId,
          dealId: row.dealId,
        }),
      ),
      meta: meta(page, perPage, total),
    });
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    const user = await requireUser();

    const input = await parse(request, leadInput);
    const db = await getDb();

    const [lead] = await db
      .insert(leads)
      .values({
        name: input.name,
        email: input.email ?? null,
        phone: input.phone ?? null,
        detail: input.detail ?? null,
        status: input.status ?? "new",
        source: input.source ?? "manual",
        // Whoever entered it owns it until it is reassigned.
        ownerId: user.id,
      })
      .returning();

    return json(
      presentLead(lead, { owner: { id: user.id, name: user.name } }),
      201,
    );
  });
}
