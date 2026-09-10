import { describe, expect, it } from "vitest";
import {
  FLORIDA_FEE_PER_PART_USD,
  OUT_OF_STATE_FEE_PER_PART_USD,
  SAME_DAY_CUTOFF_HOUR,
  deliveryFeeFor,
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

  it("separates the rest of Florida from the rest of the country", () => {
    // The two paid zones are priced differently, so a Miami order must not
    // fall into the same bucket as a Texas one.
    expect(zoneForZip("33101")).toBe("FLORIDA"); // Miami
    expect(zoneForZip("32501")).toBe("FLORIDA"); // Pensacola
    expect(zoneForZip("10001")).toBe("OUTSIDE"); // New York
    expect(zoneForZip("77001")).toBe("OUTSIDE"); // Houston
  });
});

describe("estimateDelivery", () => {
  it("is free inside Orlando — the rule the spec states outright", () => {
    const est = estimateDelivery("32807", MORNING);
    expect(est).toMatchObject({ zone: "ORLANDO", free: true, perPartUsd: 0 });
  });

  it("is free across Central Florida", () => {
    const est = estimateDelivery("34741", MORNING);
    expect(est).toMatchObject({ zone: "CENTRAL_FL", free: true, perPartUsd: 0 });
  });

  it("offers same-day before the cutoff and not after", () => {
    // A customer told "same day" at 4 PM has been misled.
    expect(estimateDelivery("32807", MORNING)?.sameDayAvailable).toBe(true);
    expect(estimateDelivery("32807", AFTERNOON)?.sameDayAvailable).toBe(false);
    expect(estimateDelivery("34741", MORNING)?.sameDayAvailable).toBe(true);
    expect(estimateDelivery("34741", AFTERNOON)?.sameDayAvailable).toBe(false);
  });

  it("never promises same-day outside the free zones", () => {
    // The paid zones are a shipment, not a van run.
    expect(estimateDelivery("33101", MORNING)?.sameDayAvailable).toBe(false);
    expect(estimateDelivery("10001", MORNING)?.sameDayAvailable).toBe(false);
  });

  it("charges the confirmed per-part rate outside the free zones", () => {
    expect(estimateDelivery("33101", MORNING)?.perPartUsd).toBe(FLORIDA_FEE_PER_PART_USD);
    expect(estimateDelivery("10001", MORNING)?.perPartUsd).toBe(OUT_OF_STATE_FEE_PER_PART_USD);
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

describe("deliveryFeeFor", () => {
  it("charges nothing in the free zones, whatever the part count", () => {
    expect(deliveryFeeFor("ORLANDO", 4)).toBe(0);
    expect(deliveryFeeFor("CENTRAL_FL", 4)).toBe(0);
  });

  it("multiplies by the part count — two doors is two parts", () => {
    expect(deliveryFeeFor("FLORIDA", 1)).toBe(90);
    expect(deliveryFeeFor("FLORIDA", 2)).toBe(180);
    expect(deliveryFeeFor("OUTSIDE", 1)).toBe(250);
    expect(deliveryFeeFor("OUTSIDE", 4)).toBe(1000);
  });

  it("is zero on an empty or nonsensical cart rather than throwing", () => {
    // This runs where an empty cart is a normal intermediate state.
    expect(deliveryFeeFor("OUTSIDE", 0)).toBe(0);
    expect(deliveryFeeFor("OUTSIDE", -1)).toBe(0);
    expect(deliveryFeeFor("OUTSIDE", NaN)).toBe(0);
  });
});