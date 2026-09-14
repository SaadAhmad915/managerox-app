import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { convertLead } from "@/app/lib/convert";
import { contacts, deals, leads } from "@/db/schema";
import { makeUser, testDb } from "./support/db";

type Db = Awaited<ReturnType<typeof testDb>>;

let db: Db;
let ownerId: number;

beforeEach(async () => {
  db = await testDb();
  ownerId = (await makeUser(db)).id;
});

async function makeLead(overrides: Partial<typeof leads.$inferInsert> = {}) {
  const [lead] = await db
    .insert(leads)
    .values({
      name: "Farhan Ali",
      email: "farhan@example.com",
      phone: "+92 300 1234567",
      detail: "Residential Plot – DHA Lahore",
      status: "qualified",
      ownerId,
      ...overrides,
    })
    .returning();

  return lead;
}

describe("converting a lead", () => {
  it("creates a contact and a deal and marks the lead converted", async () => {
    const lead = await makeLead();

    const result = await convertLead(db, lead.id, { value: 5_000_000 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const [contact] = await db
      .select()
      .from(contacts)
      .where(eq(contacts.id, result.contactId));
    const [deal] = await db.select().from(deals).where(eq(deals.id, result.dealId));

    expect(contact.name).toBe("Farhan Ali");
    expect(contact.email).toBe("farhan@example.com");
    expect(contact.leadId).toBe(lead.id);
    // The enquiry text is the only context the person arrived with.
    expect(contact.notes).toBe("Residential Plot – DHA Lahore");

    expect(deal.contactId).toBe(contact.id);
    expect(deal.value).toBe(5_000_000);
    expect(deal.stage).toBe("qualified");
    // The money lives on the deal, never on the lead.
    expect(deal.title).toBe("Residential Plot – DHA Lahore");

    expect(result.lead.status).toBe("converted");
    expect(result.lead.convertedAt).not.toBeNull();
  });

  it("carries the lead's owner onto both new records", async () => {
    const lead = await makeLead();
    const result = await convertLead(db, lead.id);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const [contact] = await db
      .select()
      .from(contacts)
      .where(eq(contacts.id, result.contactId));
    const [deal] = await db.select().from(deals).where(eq(deals.id, result.dealId));

    expect(contact.ownerId).toBe(ownerId);
    expect(deal.ownerId).toBe(ownerId);
  });

  it("prefers an explicit deal title over the enquiry text", async () => {
    const lead = await makeLead();
    const result = await convertLead(db, lead.id, { title: "  1 Kanal – Askari  " });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const [deal] = await db.select().from(deals).where(eq(deals.id, result.dealId));
    expect(deal.title).toBe("1 Kanal – Askari");
  });

  it("falls back to the person's name when there is no detail", async () => {
    const lead = await makeLead({ detail: null });
    const result = await convertLead(db, lead.id);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const [deal] = await db.select().from(deals).where(eq(deals.id, result.dealId));
    expect(deal.title).toBe("Farhan Ali");
  });

  it("refuses a second conversion instead of duplicating the person", async () => {
    const lead = await makeLead();
    await convertLead(db, lead.id);

    const again = await convertLead(db, lead.id);

    expect(again).toEqual({ ok: false, reason: "already-converted" });
    expect(await db.select().from(contacts)).toHaveLength(1);
    expect(await db.select().from(deals)).toHaveLength(1);
  });

  it("reports a missing lead rather than throwing", async () => {
    expect(await convertLead(db, 9999)).toEqual({ ok: false, reason: "not-found" });
  });

  it("writes nothing at all when the lead is already converted", async () => {
    const lead = await makeLead({
      status: "converted",
      convertedAt: new Date(),
    });

    await convertLead(db, lead.id, { value: 1 });

    expect(await db.select().from(contacts)).toHaveLength(0);
    expect(await db.select().from(deals)).toHaveLength(0);

    const [after] = await db.select().from(leads).where(eq(leads.id, lead.id));
    expect(after.status).toBe("converted");
  });
});
