import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { contacts, deals, tasks } from "@/db/schema";
import { requireUser } from "@/app/lib/auth-server";
import { handle, json, noContent, parse } from "@/app/lib/http";
import { presentTask } from "@/app/lib/present";
import { found, idParam, named, titled } from "@/app/lib/query";
import { taskInput } from "../route";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  return handle(async () => {
    await requireUser();

    const id = idParam((await params).id);
    const input = await parse(request, taskInput.partial());
    const db = await getDb();

    const values: Record<string, unknown> = {};
    if (input.title !== undefined) values.title = input.title;
    if (input.due_at !== undefined) values.dueAt = input.due_at;
    if (input.done !== undefined) values.done = input.done;
    if (input.contact_id !== undefined) {
      values.contactId = input.contact_id == null ? null : Number(input.contact_id);
    }
    if (input.deal_id !== undefined) {
      values.dealId = input.deal_id == null ? null : Number(input.deal_id);
    }

    const [task] = await db
      .update(tasks)
      .set(values)
      .where(eq(tasks.id, id))
      .returning();

    found(task);

    const [related] = await db
      .select({
        contact: { id: contacts.id, name: contacts.name },
        deal: { id: deals.id, title: deals.title },
      })
      .from(tasks)
      .leftJoin(contacts, eq(contacts.id, tasks.contactId))
      .leftJoin(deals, eq(deals.id, tasks.dealId))
      .where(eq(tasks.id, id))
      .limit(1);

    return json(
      presentTask(task, {
        contact: named(related?.contact),
        deal: titled(related?.deal),
      }),
    );
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  return handle(async () => {
    await requireUser();

    const id = idParam((await params).id);
    const db = await getDb();

    const deleted = await db.delete(tasks).where(eq(tasks.id, id)).returning();
    found(deleted[0]);

    return noContent();
  });
}
