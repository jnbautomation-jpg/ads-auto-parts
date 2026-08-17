import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PRIVATE_PREFIXES, isPrivatePath } from "./middleware";

describe("isPrivatePath", () => {
  it("matches a staff route root and everything under it", () => {
    expect(isPrivatePath("/products")).toBe(true);
    expect(isPrivatePath("/products/abc123")).toBe(true);
    expect(isPrivatePath("/products/abc123/edit")).toBe(true);
    expect(isPrivatePath("/dashboard")).toBe(true);
    expect(isPrivatePath("/staff")).toBe(true);
    expect(isPrivatePath("/force-password-change")).toBe(true);
  });

  it("does not match a public route", () => {
    // Spec 1.1: these must render, not redirect to the staff login.
    expect(isPrivatePath("/")).toBe(false);
    expect(isPrivatePath("/login")).toBe(false);
    expect(isPrivatePath("/catalog")).toBe(false);
    expect(isPrivatePath("/catalog/abc123")).toBe(false);
    expect(isPrivatePath("/robots.txt")).toBe(false);
    expect(isPrivatePath("/sitemap.xml")).toBe(false);
  });

  it("does not match an unknown URL, so it can 404 instead of redirecting", () => {
    // Old ADS URLs still indexed in Google. Sending this traffic to a staff
    // sign-in form is the bug spec 1.1 describes.
    expect(isPrivatePath("/category/all-products")).toBe(false);
    expect(isPrivatePath("/catolog")).toBe(false);
    expect(isPrivatePath("/some/old/page.html")).toBe(false);
  });

  it("is segment-aware and does not match on a shared prefix", () => {
    // A bare startsWith would wrongly treat these as staff routes and hide
    // them behind the login.
    expect(isPrivatePath("/products-recall")).toBe(false);
    expect(isPrivatePath("/staff-picks")).toBe(false);
    expect(isPrivatePath("/importer")).toBe(false);
  });
});

describe("PRIVATE_PREFIXES covers every admin route", () => {
  // The denylist above is only safe if it stays in step with the filesystem.
  // This walks the (admin) route group and fails if a segment was added
  // without being protected — turning a silent exposure into a red build.
  it("lists every route segment under src/app/(admin)", () => {
    const adminDir = join(process.cwd(), "src", "app", "(admin)");
    const segments = readdirSync(adminDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      // Route groups "(x)" and private folders "_x" are not URL segments.
      .filter((entry) => !entry.name.startsWith("(") && !entry.name.startsWith("_"))
      .map((entry) => `/${entry.name}`);

    expect(segments.length).toBeGreaterThan(0);

    for (const segment of segments) {
      expect(
        PRIVATE_PREFIXES.includes(segment),
        `Route ${segment} exists under (admin) but is missing from PRIVATE_PREFIXES ` +
          `in src/lib/supabase/middleware.ts — signed-out visitors would reach it ` +
          `before (admin)/layout.tsx redirects them.`,
      ).toBe(true);
    }
  });
});
