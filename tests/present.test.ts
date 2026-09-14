import { afterEach, describe, expect, it, vi } from "vitest";
import { compactNumber, dueLabel } from "@/app/lib/present";

afterEach(() => vi.useRealTimers());

/** Freeze the clock so "Today" and "Tomorrow" are not a matter of when CI ran. */
function freeze(iso: string) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(iso));
}

describe("dueLabel", () => {
  it("names today, tomorrow and yesterday instead of dating them", () => {
    freeze("2026-09-14T09:00:00");

    expect(dueLabel(new Date("2026-09-14T15:30:00"))).toBe("Today, 3:30 PM");
    expect(dueLabel(new Date("2026-09-15T09:00:00"))).toBe("Tomorrow, 9:00 AM");
    expect(dueLabel(new Date("2026-09-13T17:00:00"))).toBe("Yesterday, 5:00 PM");
  });

  it("dates anything further out", () => {
    freeze("2026-09-14T09:00:00");
    expect(dueLabel(new Date("2026-09-18T16:00:00"))).toBe("Fri 18 Sep, 4:00 PM");
  });

  it("counts calendar days, not 24-hour periods", () => {
    // 11pm tonight is 2 hours away but still today; 1am is 2 hours away and is
    // tomorrow. Rounding elapsed hours would get both wrong.
    freeze("2026-09-14T23:00:00");
    expect(dueLabel(new Date("2026-09-14T23:30:00"))).toBe("Today, 11:30 PM");
    expect(dueLabel(new Date("2026-09-15T01:00:00"))).toBe("Tomorrow, 1:00 AM");
  });

  it("writes midnight and noon the way a person would read them", () => {
    freeze("2026-09-14T09:00:00");
    expect(dueLabel(new Date("2026-09-14T00:15:00"))).toBe("Today, 12:15 AM");
    expect(dueLabel(new Date("2026-09-14T12:05:00"))).toBe("Today, 12:05 PM");
  });
});

describe("compactNumber", () => {
  it("shortens large figures to fit a stat tile", () => {
    expect(compactNumber(52_000_000)).toBe("52M");
    expect(compactNumber(1_450_000)).toBe("1.5M");
    expect(compactNumber(12_400)).toBe("12K");
    expect(compactNumber(2_100_000_000)).toBe("2.1B");
  });

  it("leaves small figures alone", () => {
    expect(compactNumber(0)).toBe("0");
    expect(compactNumber(999)).toBe("999");
  });
});
