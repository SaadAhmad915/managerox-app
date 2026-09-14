import { and, eq, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { contacts, deals, users } from "@/db/schema";
import { requireUser } from "@/app/lib/auth-server";
import { handle, json, noContent, parse } from "@/app/lib/http";
import { presentContact } from "@/app/lib/present";
import { found, idParam, named } from "@/app/lib/query";
import { contactInput } from "../route";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  return handle(async () => {
    await requireUser();

    const id = idParam((await params).id);
    const input = await parse(request, contactInput.partial());
    const db = await getDb();

    const [contact] = await db
      .update(contacts)
      .set(input)
      .where(eq(contacts.id, id))
      .returning();

    found(contact);

    const [owner] = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.id, contact.ownerId ?? 0))
      .limit(1);

    // Same definition of "open" as the list endpoint: still being worked, and
    // not written off. The two disagreeing would make the number change when
    // you edited an unrelated field.
    const [rollup] = await db
      .select({
        open: sql<number>`count(*) filter (where ${deals.stage} <> 'closed')`.mapWith(Number),
        won: sql<number>`coalesce(sum(${deals.value}) filter (where ${deals.stage} = 'closed'), 0)`.mapWith(Number),
      })
      .from(deals)
      .where(and(eq(deals.contactId, id), isNull(deals.lostAt)));

    return json(
      presentContact(contact, {
        owner: named(owner),
        openDeals: rollup?.open ?? 0,
        wonValue: rollup?.won ?? 0,
      }),
    );
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  return handle(async () => {
    await requireUser();

    const id = idParam((await params).id);
    const db = await getDb();

    const deleted = await db.delete(contacts).where(eq(contacts.id, id)).returning();
    found(deleted[0]);

    return noContent();
  });
}
