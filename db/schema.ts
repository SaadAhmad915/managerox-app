import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * The CRM's data model.
 *
 *   lead     an enquiry, with a status, converted exactly once
 *   contact  the person, kept forever
 *   deal     one opportunity, carrying the stage and the money
 *
 * A lead deliberately does not hold a stage or a value. Those belong to the
 * deal, because a person outlives any single opportunity and may hold several.
 */

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("Sales Executive"),
  /** Monthly revenue target, used for attainment on the dashboard. */
  monthlyTarget: integer("monthly_target").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Sessions live in the database rather than in a signed cookie so that signing
 * out actually revokes access — a self-contained token stays valid until it
 * expires, however many times you "log out".
 */
export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const LEAD_STATUSES = [
  "new",
  "contacted",
  "qualified",
  "unqualified",
  "converted",
] as const;

/** Statuses where the enquiry is still live and worth chasing. */
export const OPEN_LEAD_STATUSES = ["new", "contacted", "qualified"] as const;

export const leads = pgTable(
  "leads",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    detail: text("detail"),
    status: text("status").notNull().default("new"),
    /** "manual", or the integration that produced it. */
    source: text("source").notNull().default("manual"),
    /** The integration's own id. Unique, so a replayed webhook cannot duplicate. */
    externalId: text("external_id"),
    /** Anything the integration sent that we do not map to a column. */
    payload: jsonb("payload"),
    ownerId: integer("owner_id").references(() => users.id, { onDelete: "set null" }),
    convertedAt: timestamp("converted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("leads_external_id_idx").on(table.externalId)],
);

export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  company: text("company"),
  notes: text("notes"),
  ownerId: integer("owner_id").references(() => users.id, { onDelete: "set null" }),
  /** Where this person came from, when they came from an enquiry. */
  leadId: integer("lead_id").references(() => leads.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const DEAL_STAGES = [
  "new",
  "qualified",
  "proposal",
  "negotiation",
  "closed",
] as const;

/** Stages where the deal is still being worked. */
export const OPEN_DEAL_STAGES = ["new", "qualified", "proposal", "negotiation"] as const;

export const deals = pgTable("deals", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  contactId: integer("contact_id").references(() => contacts.id, { onDelete: "set null" }),
  ownerId: integer("owner_id").references(() => users.id, { onDelete: "set null" }),
  leadId: integer("lead_id").references(() => leads.id, { onDelete: "set null" }),
  stage: text("stage").notNull().default("new"),
  value: integer("value").notNull().default(0),
  expectedCloseOn: date("expected_close_on"),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  /** A lost deal keeps its stage for history but leaves the funnel. */
  lostAt: timestamp("lost_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
  done: boolean("done").notNull().default(false),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  contactId: integer("contact_id").references(() => contacts.id, { onDelete: "set null" }),
  dealId: integer("deal_id").references(() => deals.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  deals: many(deals),
  tasks: many(tasks),
}));

export const leadsRelations = relations(leads, ({ one }) => ({
  owner: one(users, { fields: [leads.ownerId], references: [users.id] }),
  contact: one(contacts, { fields: [leads.id], references: [contacts.leadId] }),
  deal: one(deals, { fields: [leads.id], references: [deals.leadId] }),
}));

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  owner: one(users, { fields: [contacts.ownerId], references: [users.id] }),
  lead: one(leads, { fields: [contacts.leadId], references: [leads.id] }),
  deals: many(deals),
  tasks: many(tasks),
}));

export const dealsRelations = relations(deals, ({ one, many }) => ({
  contact: one(contacts, { fields: [deals.contactId], references: [contacts.id] }),
  owner: one(users, { fields: [deals.ownerId], references: [users.id] }),
  lead: one(leads, { fields: [deals.leadId], references: [leads.id] }),
  tasks: many(tasks),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  user: one(users, { fields: [tasks.userId], references: [users.id] }),
  contact: one(contacts, { fields: [tasks.contactId], references: [contacts.id] }),
  deal: one(deals, { fields: [tasks.dealId], references: [deals.id] }),
}));
