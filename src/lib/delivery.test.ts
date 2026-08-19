import { describe, expect, it } from "vitest";
import {
  SAME_DAY_CUTOFF_HOUR,
  estimateDelivery,
  isValidZip,
  normalizeZip,
  zoneForZip,
} from "./delivery";

const MORNING = new Date("2026-08-19T09:00:00");
const AFTERNOON = new Date("2026-08-19T16:00:00");

describe("normalizeZip", () => {
  it("keeps the first five digits of a ZIP+4", () => {
    expect(normalizeZip("32807-1234")).toBe("32807");
    expect(normalizeZip(" 32807 ")).toBe("32807");
  });

  it("strips letters people type by accident", () => {
    expect(normalizeZip("FL 32807")).toBe("32807");
  });
});

describe("isValidZip", () => {
  it("requires exactly five digits", () => {
    expect(isValidZip("32807")).toBe(true);
    expect(isValidZip("3280")).toBe(false);
    expect(isValidZip("")).toBe(false);
  });
});

describe("zoneForZip", () => {
  it("puts the shop's own ZIP in Orlando", () => {
    // 6950 Venture Cir is 32807.
    expect(zoneForZip("32807")).toBe("ORLANDO");
  });

  it("recognises Central Florida beyond the city", () => {
    expect(zoneForZip("34741")).toBe("CENTRAL_FL"); // Kissimmee
    expect(zoneForZip("32771")).toBe("CENTRAL_FL"); // Sanford
    expect(zoneForZip("33801")).toBe("CENTRAL_FL"); // Lakeland
  });

  it("treats the rest of the country as outside", () => {
    expect(zoneForZip("33101")).toBe("OUTSIDE"); // Miami
    expect(zoneForZip("10001")).toBe("OUTSIDE"); // New York
  });
});

describe("estimateDelivery", () => {
  it("is free inside Orlando — the rule the spec states outright", () => {
    const est = estimateDelivery("32807", MORNING);
    expect(est).toMatchObject({ zone: "ORLANDO", free: true, feeUsd: 0 });
  });

  it("offers same-day before the cutoff and not after", () => {
    // A customer told "same day" at 4 PM has been misled.
    expect(estimateDelivery("32807", MORNING)?.sameDayAvailable).toBe(true);
    expect(estimateDelivery("32807", AFTERNOON)?.sameDayAvailable).toBe(false);
    expect(estimateDelivery("34741", MORNING)?.sameDayAvailable).toBe(true);
    expect(estimateDelivery("34741", AFTERNOON)?.sameDayAvailable).toBe(false);
  });

  it("never promises same-day outside the service area", () => {
    expect(estimateDelivery("10001", MORNING)?.sameDayAvailable).toBe(false);
  });

  it("does not invent a fee it hasn't been told", () => {
    // Quoting a delivery price wrongly is the kind of error a customer
    // notices at the door, so an unknown fee is null, not a guess.
    expect(estimateDelivery("34741", MORNING)?.feeUsd).toBeNull();
    expect(estimateDelivery("10001", MORNING)?.feeUsd).toBeNull();
  });

  it("returns null for an unusable ZIP rather than guessing a zone", () => {
    expect(estimateDelivery("abc", MORNING)).toBeNull();
    expect(estimateDelivery("123", MORNING)).toBeNull();
  });

  it("uses the documented cutoff hour", () => {
    expect(SAME_DAY_CUTOFF_HOUR).toBe(12);
    const justBefore = new Date("2026-08-19T11:59:00");
    const justAfter = new Date("2026-08-19T12:01:00");
    expect(estimateDelivery("32807", justBefore)?.sameDayAvailable).toBe(true);
    expect(estimateDelivery("32807", justAfter)?.sameDayAvailable).toBe(false);
  });
});
