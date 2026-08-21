import { describe, expect, it } from "vitest";
import { SERVICE_LOCATIONS, deliveryForLocation, findLocation } from "./locations";
import { estimateDelivery } from "./delivery";

describe("SERVICE_LOCATIONS", () => {
  it("covers exactly the cities the spec names", () => {
    expect(SERVICE_LOCATIONS.map((l) => l.name).sort()).toEqual([
      "Apopka",
      "Daytona Beach",
      "Kissimmee",
      "Lakeland",
      "Sanford",
      "Winter Park",
    ]);
  });

  it("has unique slugs", () => {
    const slugs = SERVICE_LOCATIONS.map((l) => l.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("uses URL-safe slugs", () => {
    for (const l of SERVICE_LOCATIONS) expect(l.slug).toMatch(/^[a-z0-9-]+$/);
  });

  it("gives every city its own note, so pages aren't near-duplicates", () => {
    // Six pages differing only by a city name are doorway pages, which Google
    // demotes — the opposite of the cheap traffic this is meant to earn.
    const notes = SERVICE_LOCATIONS.map((l) => l.note);
    expect(new Set(notes).size).toBe(notes.length);
    for (const n of notes) expect(n.length).toBeGreaterThan(40);
  });

  it("records a plausible distance and county for each", () => {
    for (const l of SERVICE_LOCATIONS) {
      expect(l.approxMiles).toBeGreaterThan(0);
      expect(l.approxMiles).toBeLessThan(120);
      expect(l.county).toMatch(/County$/);
      expect(l.zip).toMatch(/^\d{5}$/);
    }
  });
});

describe("findLocation", () => {
  it("finds a known city and rejects anything else", () => {
    expect(findLocation("kissimmee")?.name).toBe("Kissimmee");
    expect(findLocation("miami")).toBeNull();
    expect(findLocation("")).toBeNull();
  });
});

describe("deliveryForLocation", () => {
  it("derives the promise from the same zone table as the ZIP checker", () => {
    // A landing page must never advertise a delivery the estimator declines.
    for (const l of SERVICE_LOCATIONS) {
      const page = deliveryForLocation(l);
      const morning = new Date();
      morning.setHours(9, 0, 0, 0);
      const checker = estimateDelivery(l.zip, morning);
      expect(page.zone, `${l.name} zone`).toBe(checker?.zone);
      expect(page.free, `${l.name} free`).toBe(checker?.free);
    }
  });

  it("puts every named city inside the same-day area", () => {
    // All six are Central Florida; if one ever isn't, the page copy would be
    // making a promise the shop can't keep.
    for (const l of SERVICE_LOCATIONS) {
      expect(deliveryForLocation(l).sameDayAvailable, `${l.name}`).toBe(true);
    }
  });

  it("does not claim free delivery outside Orlando city limits", () => {
    // Free is an Orlando-only rule; none of these six are in it.
    for (const l of SERVICE_LOCATIONS) {
      expect(deliveryForLocation(l).free, `${l.name}`).toBe(false);
    }
  });
});
