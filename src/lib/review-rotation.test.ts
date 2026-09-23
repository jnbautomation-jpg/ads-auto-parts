import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { liveMode, shouldAutoRotate, stepIndex, type RotationState } from "./review-rotation";
import { ReviewCarousel } from "@/components/review-carousel";

const idle: RotationState = { count: 3, reducedMotion: false, hovered: false, focused: false, paused: false };

describe("shouldAutoRotate", () => {
  it("rotates when nothing is stopping it", () => {
    expect(shouldAutoRotate(idle)).toBe(true);
  });

  it("never rotates when the visitor prefers reduced motion", () => {
    expect(shouldAutoRotate({ ...idle, reducedMotion: true })).toBe(false);
    // Not even once hover and focus have left and nothing is paused.
    expect(shouldAutoRotate({ ...idle, reducedMotion: true, hovered: false, focused: false, paused: false })).toBe(false);
  });

  it("pauses on hover, on focus, and on the Pause button", () => {
    expect(shouldAutoRotate({ ...idle, hovered: true })).toBe(false);
    expect(shouldAutoRotate({ ...idle, focused: true })).toBe(false);
    expect(shouldAutoRotate({ ...idle, paused: true })).toBe(false);
  });

  it("has nothing to rotate with one review", () => {
    expect(shouldAutoRotate({ ...idle, count: 1 })).toBe(false);
  });
});

describe("stepIndex", () => {
  it("wraps in both directions", () => {
    expect(stepIndex(2, 1, 3)).toBe(0);
    expect(stepIndex(0, -1, 3)).toBe(2);
    expect(stepIndex(1, 1, 3)).toBe(2);
  });
});

describe("liveMode", () => {
  it("announces politely only while the visitor is in control", () => {
    expect(liveMode(false)).toBe("polite");
    expect(liveMode(true)).toBe("off");
  });
});

describe("ReviewCarousel", () => {
  it("renders nothing at all for an empty list — no heading, no frame", () => {
    expect(renderToStaticMarkup(createElement(ReviewCarousel, { reviews: [], locale: "en" }))).toBe("");
    expect(renderToStaticMarkup(createElement(ReviewCarousel, { reviews: [], locale: "es" }))).toBe("");
  });

  it("server-renders without rotation, controls, or a pause button until motion is known to be OK", () => {
    const html = renderToStaticMarkup(
      createElement(ReviewCarousel, {
        locale: "en",
        reviews: [
          { author: "Test A.", rating: 5, text: "one", source: "Google", date: "2026-01", sourceUrl: "https://example.com/1" },
          { author: "Test B.", rating: 3, text: "two", source: "Yelp", date: "2026-02", lang: "es" },
        ],
      }),
    );
    expect(html).toContain("What customers say");
    expect(html).toContain('aria-live="polite"'); // not rotating yet
    expect(html).not.toContain(">Pause<"); // reducedMotion is assumed until the browser says otherwise
    expect(html).toContain("Read on Google");
    expect(html).toContain('lang="es"');
    expect(html).toContain('aria-label="Next review"');
    expect(html).toContain("January 2026"); // month and year, never a day
  });
});
