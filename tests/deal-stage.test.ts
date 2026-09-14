import { describe, expect, it } from "vitest";
import { stamped } from "@/app/lib/deal-stage";

const open = { stage: "proposal", closedAt: null, lostAt: null };

describe("deal stage stamping", () => {
  it("stamps closedAt when a deal reaches the closed stage", () => {
    const values = stamped({ stage: "closed" }, open);

    expect(values.closedAt).toBeInstanceOf(Date);
    expect(values.lostAt).toBeNull();
  });

  it("leaves closedAt null while the deal is still open", () => {
    expect(stamped({ stage: "negotiation" }, open).closedAt).toBeNull();
  });

  it("does not re-date a deal that was already closed", () => {
    const closedAt = new Date("2026-01-15T10:00:00Z");
    const values = stamped({ title: "Renamed" }, { stage: "closed", closedAt, lostAt: null });

    // Editing the title of a deal closed in January must not move its revenue
    // into the current month.
    expect(values.closedAt).toBe(closedAt);
  });

  it("clears closedAt when a closed deal is marked lost", () => {
    const closedAt = new Date("2026-01-15T10:00:00Z");
    const values = stamped({ lost: true }, { stage: "closed", closedAt, lostAt: null });

    expect(values.closedAt).toBeNull();
    expect(values.lostAt).toBeInstanceOf(Date);
  });

  it("never counts a lost deal as won, whatever stage it is moved to", () => {
    const values = stamped({ stage: "closed", lost: true }, open);

    expect(values.closedAt).toBeNull();
    expect(values.lostAt).toBeInstanceOf(Date);
  });

  it("clears lostAt when a deal is reopened", () => {
    const lostAt = new Date("2026-02-01T10:00:00Z");
    const values = stamped({ lost: false }, { stage: "proposal", closedAt: null, lostAt });

    expect(values.lostAt).toBeNull();
  });

  it("keeps a deal lost when an unrelated field is edited", () => {
    const lostAt = new Date("2026-02-01T10:00:00Z");
    const values = stamped({ value: 10 }, { stage: "proposal", closedAt: null, lostAt });

    expect(values.lostAt).toBe(lostAt);
  });

  it("only writes the fields that were sent", () => {
    const values = stamped({ value: 42 }, open);

    expect(values).not.toHaveProperty("title");
    expect(values).not.toHaveProperty("stage");
    expect(values.value).toBe(42);
  });

  it("distinguishes clearing a contact from leaving it alone", () => {
    expect(stamped({ contact_id: null }, open).contactId).toBeNull();
    expect(stamped({ contact_id: "7" }, open).contactId).toBe(7);
    expect(stamped({}, open)).not.toHaveProperty("contactId");
  });
});
