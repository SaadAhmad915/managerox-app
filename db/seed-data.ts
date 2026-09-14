import type { getDb } from "@/db";
import { contacts, deals, leads, sessions, tasks, users } from "@/db/schema";
import { hashPassword } from "@/app/lib/password";

type Database = Awaited<ReturnType<typeof getDb>>;

/**
 * Fills an empty database with enough data to make every screen meaningful:
 * six months of closed revenue for the chart, deals spread across the funnel,
 * tasks that are overdue, due today and due later.
 *
 * Safe to re-run — it clears the CRM tables first. It does not touch anything
 * else, so a real deployment's users are not wiped by an accidental run.
 */

const DAY = 86_400_000;

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * DAY);
}

function daysAhead(days: number, hour = 10): Date {
  const date = new Date(Date.now() + days * DAY);
  date.setHours(hour, 0, 0, 0);
  return date;
}

/** First of the month, `back` months ago — where the revenue chart reads from. */
function monthsBack(back: number): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - back, 15, 12);
}

export async function seedDatabase(db: Database) {
  // Order matters: children before parents, or the foreign keys refuse.
  await db.delete(sessions);
  await db.delete(tasks);
  await db.delete(deals);
  await db.delete(contacts);
  await db.delete(leads);
  await db.delete(users);

  const password = await hashPassword("password");

  const team = await db
    .insert(users)
    .values([
      {
        name: "Saad Ahmad",
        email: "saad@managerox.com",
        passwordHash: password,
        role: "Sales Manager",
        monthlyTarget: 12_000_000,
      },
      {
        name: "Ayesha Khan",
        email: "ayesha@managerox.com",
        passwordHash: password,
        role: "Sales Executive",
        monthlyTarget: 8_000_000,
      },
      {
        name: "Bilal Raza",
        email: "bilal@managerox.com",
        passwordHash: password,
        role: "Sales Executive",
        monthlyTarget: 6_000_000,
      },
    ])
    .returning();

  const [saad, ayesha, bilal] = team;

  const leadRows = await db
    .insert(leads)
    .values([
      { name: "Farhan Ali", email: "farhan@example.com", phone: "+92 300 1234567", detail: "Residential Plot – DHA Lahore", status: "new", ownerId: ayesha.id, createdAt: daysAgo(0.1) },
      { name: "Hina Sheikh", email: "hina@example.com", phone: "+92 321 9876543", detail: "Commercial Shop – Gulberg", status: "contacted", ownerId: bilal.id, createdAt: daysAgo(0.4) },
      { name: "Usman Tariq", phone: "+92 333 5556677", detail: "2 Kanal House – Bahria Town", status: "qualified", ownerId: ayesha.id, createdAt: daysAgo(1.2) },
      { name: "Mehwish Anwar", email: "mehwish@example.com", detail: "Apartment – Clifton Karachi", status: "new", ownerId: saad.id, createdAt: daysAgo(2) },
      { name: "Kamran Butt", email: "kamran@example.com", phone: "+92 301 2223344", detail: "Warehouse – Sundar Estate", status: "contacted", ownerId: bilal.id, createdAt: daysAgo(4) },
      { name: "Nadia Iqbal", email: "nadia@example.com", detail: "Office Floor – Blue Area", status: "unqualified", ownerId: saad.id, createdAt: daysAgo(9) },
    ])
    .returning();

  // Three leads that were converted earlier, each with the contact and deal
  // that conversion produces — so the funnel and revenue chart have history.
  const converted = await db
    .insert(leads)
    .values([
      { name: "Imran Sadiq", email: "imran@example.com", phone: "+92 345 1112233", detail: "5 Marla House – Johar Town", status: "converted", ownerId: saad.id, convertedAt: daysAgo(40), createdAt: daysAgo(48) },
      { name: "Sana Malik", email: "sana@example.com", phone: "+92 322 4445566", detail: "Plot File – Park View City", status: "converted", ownerId: ayesha.id, convertedAt: daysAgo(70), createdAt: daysAgo(80) },
      { name: "Rizwan Ahmed", email: "rizwan@example.com", detail: "Shop – Emporium Mall", status: "converted", ownerId: bilal.id, convertedAt: daysAgo(15), createdAt: daysAgo(20) },
    ])
    .returning();

  const [imranLead, sanaLead, rizwanLead] = converted;

  const contactRows = await db
    .insert(contacts)
    .values([
      { name: "Imran Sadiq", email: "imran@example.com", phone: "+92 345 1112233", company: "Sadiq Traders", notes: "5 Marla House – Johar Town", ownerId: saad.id, leadId: imranLead.id, createdAt: daysAgo(40) },
      { name: "Sana Malik", email: "sana@example.com", phone: "+92 322 4445566", company: "Malik Associates", notes: "Plot File – Park View City", ownerId: ayesha.id, leadId: sanaLead.id, createdAt: daysAgo(70) },
      { name: "Rizwan Ahmed", email: "rizwan@example.com", company: "RA Retail", notes: "Shop – Emporium Mall", ownerId: bilal.id, leadId: rizwanLead.id, createdAt: daysAgo(15) },
      { name: "Tariq Jameel", email: "tariq@example.com", phone: "+92 300 7778899", company: "Jameel Builders", ownerId: saad.id, createdAt: daysAgo(120) },
      { name: "Sadia Noor", email: "sadia@example.com", company: "Noor Interiors", ownerId: ayesha.id, createdAt: daysAgo(200) },
      { name: "Hassan Sheikh", email: "hassan@example.com", phone: "+92 311 6667788", company: "Sheikh Estates", ownerId: bilal.id, createdAt: daysAgo(3) },
    ])
    .returning();

  const [imran, sana, rizwan, tariq, sadia, hassan] = contactRows;

  const dealRows = await db
    .insert(deals)
    .values([
      // Open pipeline, spread across the stages the funnel draws.
      { title: "5 Marla House – Johar Town", contactId: imran.id, ownerId: saad.id, leadId: imranLead.id, stage: "qualified", value: 18_500_000, expectedCloseOn: daysAhead(25).toISOString().slice(0, 10), createdAt: daysAgo(40) },
      { title: "Shop – Emporium Mall", contactId: rizwan.id, ownerId: bilal.id, leadId: rizwanLead.id, stage: "proposal", value: 9_200_000, expectedCloseOn: daysAhead(12).toISOString().slice(0, 10), createdAt: daysAgo(15) },
      { title: "Fit-out – Jameel Builders", contactId: tariq.id, ownerId: saad.id, stage: "negotiation", value: 6_400_000, expectedCloseOn: daysAhead(5).toISOString().slice(0, 10), createdAt: daysAgo(30) },
      { title: "Office Refurb – Noor Interiors", contactId: sadia.id, ownerId: ayesha.id, stage: "new", value: 3_100_000, createdAt: daysAgo(6) },
      { title: "Plot File – Park View City", contactId: sana.id, ownerId: ayesha.id, leadId: sanaLead.id, stage: "negotiation", value: 4_750_000, expectedCloseOn: daysAhead(18).toISOString().slice(0, 10), createdAt: daysAgo(70) },

      // Enough early-stage work that the funnel narrows the way a real one does.
      { title: "Plot – DHA Phase 8", contactId: hassan.id, ownerId: bilal.id, stage: "new", value: 5_600_000, createdAt: daysAgo(2) },
      { title: "Shop – Y Block Market", contactId: rizwan.id, ownerId: bilal.id, stage: "new", value: 2_800_000, createdAt: daysAgo(3) },
      { title: "Apartment – Gulberg Greens", contactId: sana.id, ownerId: ayesha.id, stage: "new", value: 4_200_000, createdAt: daysAgo(5) },
      { title: "Farmhouse – Bedian Road", contactId: imran.id, ownerId: saad.id, stage: "new", value: 21_000_000, createdAt: daysAgo(8) },
      { title: "Showroom – MM Alam Road", contactId: tariq.id, ownerId: saad.id, stage: "qualified", value: 16_500_000, expectedCloseOn: daysAhead(40).toISOString().slice(0, 10), createdAt: daysAgo(12) },
      { title: "Plot – Lake City", contactId: sadia.id, ownerId: ayesha.id, stage: "qualified", value: 6_900_000, expectedCloseOn: daysAhead(33).toISOString().slice(0, 10), createdAt: daysAgo(18) },
      { title: "Warehouse – Kot Lakhpat", contactId: rizwan.id, ownerId: bilal.id, stage: "proposal", value: 8_400_000, expectedCloseOn: daysAhead(21).toISOString().slice(0, 10), createdAt: daysAgo(22) },

      // Closed and won, dated across six months so the chart has a line.
      { title: "Corner Plot – DHA Phase 6", contactId: tariq.id, ownerId: saad.id, stage: "closed", value: 7_800_000, closedAt: monthsBack(5), createdAt: monthsBack(6) },
      { title: "Apartment – Sea View", contactId: sana.id, ownerId: ayesha.id, stage: "closed", value: 5_200_000, closedAt: monthsBack(4), createdAt: monthsBack(5) },
      { title: "Retail Unit – Packages Mall", contactId: rizwan.id, ownerId: bilal.id, stage: "closed", value: 11_400_000, closedAt: monthsBack(3), createdAt: monthsBack(4) },
      { title: "Villa – Bahria Orchard", contactId: imran.id, ownerId: saad.id, stage: "closed", value: 9_100_000, closedAt: monthsBack(2), createdAt: monthsBack(3) },
      { title: "Land Parcel – Raiwind Road", contactId: tariq.id, ownerId: ayesha.id, stage: "closed", value: 13_600_000, closedAt: monthsBack(1), createdAt: monthsBack(2) },
      { title: "Penthouse – Gulberg Heights", contactId: sadia.id, ownerId: saad.id, stage: "closed", value: 15_900_000, closedAt: monthsBack(0), createdAt: monthsBack(1) },

      // One written off, so "include lost" has something to reveal.
      { title: "Godown – Multan Road", contactId: tariq.id, ownerId: bilal.id, stage: "proposal", value: 2_300_000, lostAt: daysAgo(11), createdAt: daysAgo(60) },
    ])
    .returning();

  const byTitle = (title: string) => dealRows.find((deal) => deal.title === title)!;

  await db.insert(tasks).values([
    { title: "Call Farhan about site visit", dueAt: daysAgo(1), userId: ayesha.id, contactId: imran.id },
    { title: "Send proposal – Emporium Mall", dueAt: daysAhead(0, 16), userId: bilal.id, contactId: rizwan.id, dealId: byTitle("Shop – Emporium Mall").id },
    { title: "Follow up on Jameel fit-out pricing", dueAt: daysAhead(1, 11), userId: saad.id, contactId: tariq.id, dealId: byTitle("Fit-out – Jameel Builders").id },
    { title: "Prepare Park View payment plan", dueAt: daysAhead(3, 9), userId: ayesha.id, contactId: sana.id, dealId: byTitle("Plot File – Park View City").id },
    { title: "Quarterly pipeline review", dueAt: daysAhead(7, 15), userId: saad.id },
    { title: "Share brochure with Noor Interiors", dueAt: daysAgo(4), done: true, userId: ayesha.id, contactId: sadia.id },
  ]);

  return {
    users: team.length,
    leads: leadRows.length + converted.length,
    contacts: contactRows.length,
    deals: dealRows.length,
  };
}
