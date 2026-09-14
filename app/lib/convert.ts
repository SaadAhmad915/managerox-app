import { eq } from "drizzle-orm";
import type { getDb } from "@/db";
import { contacts, deals, leads } from "@/db/schema";

type Database = Awaited<ReturnType<typeof getDb>>;

export type ConvertResult =
  | { ok: true; lead: typeof leads.$inferSelect; contactId: number; dealId: number }
  | { ok: false; reason: "not-found" | "already-converted" };

/**
 * Turns a qualified enquiry into a Contact and a Deal.
 *
 * The three writes run in one transaction. A lead marked converted with no deal
 * behind it is worse than a failed conversion, because nothing on any screen
 * would show that the work was lost — the pipeline would just look quiet.
 *
 * Converting twice is refused rather than allowed to duplicate the person and
 * their pipeline. The guard reads inside the transaction, so two requests
 * racing each other cannot both get past it.
 */
export async function convertLead(
  db: Database,
  leadId: number,
  input: { title?: string | null; value?: number } = {},
): Promise<ConvertResult> {
  return db.transaction(async (tx): Promise<ConvertResult> => {
    const [lead] = await tx
      .select()
      .from(leads)
      .where(eq(leads.id, leadId))
      .limit(1);

    if (!lead) return { ok: false, reason: "not-found" };
    if (lead.convertedAt !== null) {
      return { ok: false, reason: "already-converted" };
    }

    const [contact] = await tx
      .insert(contacts)
      .values({
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        ownerId: lead.ownerId,
        leadId: lead.id,
        // The enquiry text is the only context the person arrived with.
        notes: lead.detail,
      })
      .returning();

    const [deal] = await tx
      .insert(deals)
      .values({
        title: input.title?.trim() || lead.detail || lead.name,
        contactId: contact.id,
        ownerId: lead.ownerId,
        leadId: lead.id,
        // A lead worth converting is by definition past the "new" stage.
        stage: "qualified",
        value: input.value ?? 0,
      })
      .returning();

    const [updated] = await tx
      .update(leads)
      .set({
        status: "converted",
        convertedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(leads.id, leadId))
      .returning();

    return { ok: true, lead: updated, contactId: contact.id, dealId: deal.id };
  });
}
