import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { contacts, deals, users } from "@/db/schema";
import { requireUser } from "@/app/lib/auth-server";
import { handle, json, noContent, parse } from "@/app/lib/http";
import { presentDeal } from "@/app/lib/present";
import { stamped } from "@/app/lib/deal-stage";
import { found, idParam, named } from "@/app/lib/query";
import { dealInput } from "../route";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  return handle(async () => {
    await requireUser();

    const id = idParam((await params).id);
    const input = await parse(request, dealInput.partial());
    const db = await getDb();

    const [existing] = await db
      .select()
      .from(deals)
      .where(eq(deals.id, id))
      .limit(1);

    found(existing);

    const [deal] = await db
      .update(deals)
      .set(stamped(input, existing))
      .where(eq(deals.id, id))
      .returning();

    const [contact] = deal.contactId
      ? await db
          .select({ id: contacts.id, name: contacts.name })
          .from(contacts)
          .where(eq(contacts.id, deal.contactId))
          .limit(1)
      : [];

    const [owner] = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.id, deal.ownerId ?? 0))
      .limit(1);

    return json(
      presentDeal(deal, { contact: named(contact), owner: named(owner) }),
    );
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  return handle(async () => {
    await requireUser();

    const id = idParam((await params).id);
    const db = await getDb();

    const deleted = await db.delete(deals).where(eq(deals.id, id)).returning();
    found(deleted[0]);

    return noContent();
  });
}
