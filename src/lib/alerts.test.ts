import { describe, expect, it } from "vitest";
import { ALERT_STATUS_LABEL, ALERT_TYPE_LABEL, validateAlert } from "./alerts";

const VALID = { make: "Toyota", model: "RAV4", phone: "(407) 555-0142" };

describe("validateAlert", () => {
  it("accepts a minimal request", () => {
    const result = validateAlert(VALID);
    expect(result.ok).toBe(true);
  });

  it("normalizes make and model the same way the catalog does", () => {
    // This is the whole point of the feature: an alert saved as "cx 5" would
    // never match a "CX-5" arriving in stock, and nobody would ever be called.
    const result = validateAlert({ ...VALID, make: "vw", model: "cx 5" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.make).toBe("Volkswagen");
      expect(result.value.model).toBe("CX-5");
    }
  });

  it("requires a vehicle", () => {
    expect(validateAlert({ ...VALID, make: "" }).ok).toBe(false);
    expect(validateAlert({ ...VALID, model: "  " }).ok).toBe(false);
  });

  it("requires a reachable phone number", () => {
    // The shop calls people; an alert with no usable number is not a lead.
    expect(validateAlert({ ...VALID, phone: "" }).ok).toBe(false);
    expect(validateAlert({ ...VALID, phone: "abc" }).ok).toBe(false);
    expect(validateAlert({ ...VALID, phone: "12345" }).ok).toBe(false);
  });

  it("accepts an optional year and rejects an implausible one", () => {
    expect(validateAlert({ ...VALID, year: 2021 }).ok).toBe(true);
    expect(validateAlert({ ...VALID, year: "" }).ok).toBe(true);
    expect(validateAlert({ ...VALID, year: 1890 }).ok).toBe(false);
    expect(validateAlert({ ...VALID, year: 3000 }).ok).toBe(false);
  });

  it("treats a missing year as null rather than zero", () => {
    const result = validateAlert({ ...VALID, year: null });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.year).toBeNull();
  });

  it("validates an email only when one is given", () => {
    expect(validateAlert({ ...VALID, email: "" }).ok).toBe(true);
    expect(validateAlert({ ...VALID, email: "nope" }).ok).toBe(false);
    expect(validateAlert({ ...VALID, email: "shop@example.com" }).ok).toBe(true);
  });

  it("rejects over-length input", () => {
    expect(validateAlert({ ...VALID, name: "x".repeat(200) }).ok).toBe(false);
  });
});

describe("labels", () => {
  it("uses plain words staff can scan, not enum values", () => {
    expect(ALERT_STATUS_LABEL.ACTIVE).toBe("Waiting");
    expect(ALERT_STATUS_LABEL.NOTIFIED).toBe("Contacted");
    expect(ALERT_TYPE_LABEL.BACK_IN_STOCK).toBe("Back in stock");
  });
});
