import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/app/lib/auth-server";

describe("password hashing", () => {
  it("accepts the right password", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(await verifyPassword("correct horse battery staple", hash)).toBe(true);
  });

  it("rejects the wrong password", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(await verifyPassword("Correct horse battery staple", hash)).toBe(false);
  });

  it("salts each hash, so identical passwords do not look identical", async () => {
    const a = await hashPassword("same");
    const b = await hashPassword("same");

    expect(a).not.toBe(b);
    expect(await verifyPassword("same", a)).toBe(true);
    expect(await verifyPassword("same", b)).toBe(true);
  });

  it("returns false rather than throwing on a malformed stored hash", async () => {
    // The login handler verifies against a dummy "0:0" when no account exists,
    // so that a wrong address and a wrong password take the same time. That
    // dummy must not blow up.
    expect(await verifyPassword("anything", "0:0")).toBe(false);
    expect(await verifyPassword("anything", "")).toBe(false);
    expect(await verifyPassword("anything", "nocolon")).toBe(false);
  });
});
