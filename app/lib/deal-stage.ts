export type DealFields = {
  title?: string;
  contact_id?: string | number | null;
  stage?: string;
  value?: number;
  expected_close_on?: string | null;
  lost?: boolean;
};

type Existing = { stage: string; closedAt: Date | null; lostAt: Date | null };

/**
 * Keeps `closedAt` and `lostAt` consistent with the stage.
 *
 * Moving a deal to "closed" and forgetting the timestamp is exactly how revenue
 * figures drift away from what the pipeline shows, so the timestamps are never
 * accepted from the client — they are derived from the stage on every write.
 * An existing timestamp is preserved, so editing the title of a deal closed
 * last month does not re-date the revenue to today.
 */
export function stamped(input: DealFields, existing?: Existing) {
  const stage = input.stage ?? existing?.stage ?? "new";
  const lost = input.lost ?? existing?.lostAt != null;
  const now = new Date();

  const values: Record<string, unknown> = {};

  if (input.title !== undefined) values.title = input.title;
  if (input.value !== undefined) values.value = input.value;
  if (input.stage !== undefined) values.stage = input.stage;
  if (input.contact_id !== undefined) {
    values.contactId = input.contact_id == null ? null : Number(input.contact_id);
  }
  if (input.expected_close_on !== undefined) {
    values.expectedCloseOn = input.expected_close_on || null;
  }

  values.lostAt = lost ? (existing?.lostAt ?? now) : null;
  // A lost deal is not won, whatever stage it was dragged to on the way out.
  values.closedAt = stage === "closed" && !lost ? (existing?.closedAt ?? now) : null;

  return values;
}
