import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { contacts, deals, leads, users } from "@/db/schema";
import { requireUser } from "@/app/lib/auth-server";
import { handle, json, noContent, parse } from "@/app/lib/http";
import { presentLead } from "@/app/lib/present";
import { found, idParam, named } from "@/app/lib/query";
import { leadInput } from "../route";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  return handle(async () => {
    await requireUser();

    const id = idParam((await params).id);
    const input = await parse(request, leadInput.partial());
    const db = await getDb();

    const [lead] = await db
      .update(leads)
      .set({
        ...input,
        // A blank field means "clear it", so undefined and null differ here.
        updatedAt: new Date(),
      })
      .where(eq(leads.id, id))
      .returning();

    found(lead);

    const [related] = await db
      .select({
        owner: { id: users.id, name: users.name },
        contactId: contacts.id,
        dealId: deals.id,
      })
      .from(leads)
      .leftJoin(users, eq(users.id, leads.ownerId))
      .leftJoin(contacts, eq(contacts.leadId, leads.id))
      .leftJoin(deals, eq(deals.leadId, leads.id))
      .where(eq(leads.id, id))
      .limit(1);

    return json(
      presentLead(lead, {
        owner: named(related?.owner),
        contactId: related?.contactId,
        dealId: related?.dealId,
      }),
    );
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  return handle(async () => {
    await requireUser();

    const id = idParam((await params).id);
    const db = await getDb();

    const deleted = await db.delete(leads).where(eq(leads.id, id)).returning();
    found(deleted[0]);

    return noContent();
  });
}
