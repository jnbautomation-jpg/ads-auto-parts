import { describe, expect, it } from "vitest";
import {
  QUOTE_LIMITS,
  formatReceivedDate,
  normalizePhone,
  parseQuoteMessage,
  validateQuoteInput,
} from "./inquiry";

const VALID = {
  name: "Jane Doe",
  phone: "(407) 743-4644",
  email: "jane@example.com",
  vehicle: "2020 Kia K5",
  partNeeded: "Doors",
  notes: "Left front, silver.",
};

describe("validateQuoteInput", () => {
  it("accepts a complete request and trims every field", () => {
    const result = validateQuoteInput({ ...VALID, name: "  Jane Doe  " });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.name).toBe("Jane Doe");
  });

  it("accepts a request with only the required fields", () => {
    expect(validateQuoteInput({ name: "Jane", phone: "4077434644" }).ok).toBe(true);
  });

  it("requires name and phone", () => {
    expect(validateQuoteInput({ phone: "4077434644" })).toMatchObject({ ok: false });
    expect(validateQuoteInput({ name: "Jane" })).toMatchObject({ ok: false });
    expect(validateQuoteInput({ name: "   ", phone: "4077434644" })).toMatchObject({ ok: false });
  });

  it("rejects a phone number with too few digits", () => {
    // Guards lead quality: "asdf" or "1" is not something the shop can call.
    expect(validateQuoteInput({ ...VALID, phone: "asdf" })).toMatchObject({ ok: false });
    expect(validateQuoteInput({ ...VALID, phone: "12345" })).toMatchObject({ ok: false });
  });

  it("accepts a phone number written with punctuation or a country code", () => {
    expect(validateQuoteInput({ ...VALID, phone: "+1 (407) 743-4644" }).ok).toBe(true);
    expect(validateQuoteInput({ ...VALID, phone: "407.743.4644" }).ok).toBe(true);
  });

  it("rejects a malformed email but allows an absent one", () => {
    expect(validateQuoteInput({ ...VALID, email: "not-an-email" })).toMatchObject({ ok: false });
    expect(validateQuoteInput({ ...VALID, email: "" }).ok).toBe(true);
  });

  it("rejects over-length input rather than silently truncating it", () => {
    // Truncation would lose part of a real customer's message without
    // telling them; an unbounded field lets a bot write junk into the DB.
    for (const [field, limit] of Object.entries(QUOTE_LIMITS)) {
      const result = validateQuoteInput({ ...VALID, [field]: "x".repeat(limit + 1) });
      expect(result.ok, `${field} over limit should be rejected`).toBe(false);
    }
  });

  it("accepts input exactly at each limit", () => {
    expect(validateQuoteInput({ ...VALID, notes: "x".repeat(QUOTE_LIMITS.notes) }).ok).toBe(true);
    expect(validateQuoteInput({ ...VALID, name: "x".repeat(QUOTE_LIMITS.name) }).ok).toBe(true);
  });
});

describe("normalizePhone", () => {
  it("reduces differently formatted spellings to the same digits", () => {
    // The rate limit compares on this, so formatting variance must not be a
    // way around it.
    expect(normalizePhone("(407) 743-4644")).toBe("4077434644");
    expect(normalizePhone("407.743.4644")).toBe("4077434644");
    expect(normalizePhone("407 743 4644")).toBe("4077434644");
  });

  it("returns an empty string when there are no digits", () => {
    expect(normalizePhone("no digits here")).toBe("");
  });
});

describe("parseQuoteMessage", () => {
  it("pulls vehicle and part back out of the composed message", () => {
    const message = "Vehicle: 2020 Kia K5\nPart needed: Doors\nLeft front";
    expect(parseQuoteMessage(message)).toEqual({ vehicle: "2020 Kia K5", part: "Doors" });
  });

  it("falls back to a dash for a missing message or missing lines", () => {
    expect(parseQuoteMessage(null)).toEqual({ vehicle: "—", part: "—" });
    expect(parseQuoteMessage("just a note")).toEqual({ vehicle: "—", part: "—" });
  });
});

describe("formatReceivedDate", () => {
  it("labels today's date as Today", () => {
    expect(formatReceivedDate(new Date())).toBe("Today");
  });

  it("formats an older date as month and day", () => {
    expect(formatReceivedDate(new Date("2026-03-04T12:00:00Z"))).toMatch(/Mar \d+/);
  });
});
