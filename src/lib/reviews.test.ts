import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { REVIEWS, REVIEW_SOURCES, getReviews } from "./reviews";

// The sample reviews exist for layout work on a dev server and must never be
// what a customer sees. These tests are the guard.

const SRC = join(__dirname, "..");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === "generated" ? [] : walk(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("production cannot reach the sample reviews", () => {
  it("returns the real REVIEWS array in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(await getReviews()).toBe(REVIEWS);
  });

  it("returns the real REVIEWS array under test, too", async () => {
    vi.stubEnv("NODE_ENV", "test");
    expect(await getReviews()).toBe(REVIEWS);
  });

  it("refuses to load the sample module outside development", async () => {
    vi.stubEnv("NODE_ENV", "production");
    await expect(import("./reviews.sample")).rejects.toThrow(/outside development/);
  });

  it("only uses the samples in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const { SAMPLE_REVIEWS } = await import("./reviews.sample");
    expect(await getReviews()).toBe(SAMPLE_REVIEWS);
    expect(SAMPLE_REVIEWS).not.toBe(REVIEWS);
  });

  it("is imported by nothing but reviews.ts, and only dynamically", () => {
    const importers = walk(SRC)
      .filter((file) => !file.endsWith(".test.ts"))
      .filter((file) => /reviews\.sample/.test(readFileSync(file, "utf8")))
      .map((file) => relative(SRC, file).replaceAll("\\", "/"));
    expect(importers.sort()).toEqual(["lib/reviews.sample.ts", "lib/reviews.ts"].sort());

    const source = readFileSync(join(SRC, "lib/reviews.ts"), "utf8");
    // A static import would put the samples in every bundle regardless of the
    // NODE_ENV check.
    expect(source).not.toMatch(/^\s*import[^;]*reviews\.sample/m);
    expect(source).toMatch(
      /if \(process\.env\.NODE_ENV === "development"\) \{\s*const \{ SAMPLE_REVIEWS \} = await import\("\.\/reviews\.sample"\);/,
    );
  });

  it("never has sample text pasted into the real array", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const { SAMPLE_REVIEWS } = await import("./reviews.sample");
    const sampleTexts = new Set(SAMPLE_REVIEWS.map((r) => r.text));
    expect(REVIEWS.filter((r) => sampleTexts.has(r.text))).toEqual([]);
    expect(REVIEWS.filter((r) => /sample|muestra/i.test(r.author))).toEqual([]);
  });
});

describe("REVIEWS entries are well formed", () => {
  // Vacuous while the array is empty; it starts biting with the first review.
  it("has an author, rating, text, source and date on every entry", () => {
    for (const r of REVIEWS) {
      expect(r.author, r.author).toMatch(/^\S.* \p{Lu}\.$/u); // first name + last initial
      expect([1, 2, 3, 4, 5], r.author).toContain(r.rating);
      expect(r.text.trim(), r.author).not.toBe("");
      expect(REVIEW_SOURCES, r.author).toContain(r.source);
      expect(r.date, r.author).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(new Date(r.date).getTime()), r.author).toBe(false);
      if (r.sourceUrl) expect(r.sourceUrl, r.author).toMatch(/^https:\/\//);
    }
  });
});
