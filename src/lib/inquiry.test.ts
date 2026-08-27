import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  QUOTE_LIMITS,
  formatReceivedAt,
  formatReceivedDate,
  normalizePhone,
  parseQuoteMessage,
  validateQuoteInput,
} from "./inquiry";
import { en } from "./dictionaries/en";
import { es } from "./dictionaries/es";

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

  it("rejects in the language the form was submitted in", () => {
    // The quote form is the Spanish site's main conversion point. An English
    // rejection under a Spanish form reads as a broken page, and the customer
    // calls a competitor instead of retyping.
    expect(validateQuoteInput({ phone: "4077434644" }, "es")).toMatchObject({
      ok: false,
      error: es.errors.nameAndPhoneRequired,
    });
    expect(validateQuoteInput({ ...VALID, phone: "1" }, "es")).toMatchObject({
      error: es.errors.phoneInvalid,
    });
    expect(validateQuoteInput({ ...VALID, email: "nope" }, "es")).toMatchObject({
      error: es.errors.emailInvalid,
    });
  });

  it("defaults to English, so callers that pass no locale are unchanged", () => {
    expect(validateQuoteInput({ phone: "4077434644" })).toMatchObject({
      error: en.errors.nameAndPhoneRequired,
    });
  });

  it("names the offending field in the over-length message, in both languages", () => {
    const tooLong = { ...VALID, phone: "1".repeat(QUOTE_LIMITS.phone + 1) };
    const english = validateQuoteInput(tooLong);
    const spanish = validateQuoteInput(tooLong, "es");
    expect(english.ok).toBe(false);
    if (!english.ok) expect(english.error).toBe("That phone number is too long — please shorten it.");
    if (!spanish.ok) expect(spanish.error).toContain(es.quote.fields.phone);
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
  // Every assertion here depends on what day it is, in two zones at once, so
  // the clock is frozen rather than left to whenever CI happens to run.
  // Sep 10 2026, 8 AM in Orlando — a plain mid-morning with no rollover in
  // play, so the tests that do care about rollover can set their own.
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-10T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("labels today's date as Today", () => {
    expect(formatReceivedDate(new Date())).toBe("Today");
  });

  it("formats an older date as month and day", () => {
    expect(formatReceivedDate(new Date("2026-03-04T12:00:00Z"))).toMatch(/Mar \d+/);
  });

  // A Vercel function runs in UTC. Every lead taken after about 8 PM Orlando
  // time is already tomorrow in UTC, so the admin table used to stamp it with
  // a date the shop had not reached yet.
  it("shows the Orlando date for a late-evening lead, not the server's", () => {
    // 01:30 UTC on the 28th is 9:30 PM on the 27th in Orlando.
    expect(formatReceivedDate(new Date("2026-08-28T01:30:00Z"))).toBe("Aug 27");
  });

  // Standard time, to pin that the offset is read from the zone rather than
  // hardcoded at the -4 that happens to hold in August.
  it("handles the same rollover on the winter side of DST", () => {
    // 02:30 UTC on Jan 15 is 9:30 PM on Jan 14 in Orlando (UTC-5).
    expect(formatReceivedDate(new Date("2026-01-15T02:30:00Z"))).toBe("Jan 14");
  });

  // The other half of the bug: "Today" has to mean today *in Orlando*. Once
  // the server's clock has rolled over but the shop's has not, every lead
  // from earlier the same working day stopped saying Today.
  it("still says Today once the server's date is ahead of the shop's", () => {
    // 01:30 UTC on the 28th — 9:30 PM on the 27th, Orlando.
    vi.setSystemTime(new Date("2026-08-28T01:30:00Z"));

    // 2 PM the same Orlando day.
    expect(formatReceivedDate(new Date("2026-08-27T18:00:00Z"))).toBe("Today");
  });

  it("does not say Today for a lead from the shop's previous day", () => {
    vi.setSystemTime(new Date("2026-08-28T01:30:00Z"));

    // 2 PM on the 26th in Orlando — a day earlier for the shop.
    expect(formatReceivedDate(new Date("2026-08-26T18:00:00Z"))).toBe("Aug 26");
  });
});

describe("formatReceivedAt", () => {
  // A Vercel function runs in UTC. Formatting without a zone would put a
  // 2:30 PM lead at 6:30 PM and make it read as after-hours.
  it("stamps the shop's own timezone, not the server's", () => {
    expect(formatReceivedAt(new Date("2026-08-27T18:30:00Z"))).toContain("2:30 PM");
  });

  it("carries the weekday and date, so a lead read the next morning is placeable", () => {
    const formatted = formatReceivedAt(new Date("2026-08-27T18:30:00Z"));
    expect(formatted).toContain("Thu");
    expect(formatted).toContain("Aug 27");
  });

  it("rolls back a day for a late-evening lead, because Orlando is behind UTC", () => {
    // 01:30 UTC on the 28th is 9:30 PM on the 27th in Orlando.
    expect(formatReceivedAt(new Date("2026-08-28T01:30:00Z"))).toContain("Aug 27");
  });
});
