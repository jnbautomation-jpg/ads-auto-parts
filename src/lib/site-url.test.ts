import { describe, expect, it } from "vitest";
import { resolveSiteUrl, wwwHostFor } from "./site-url";

describe("resolveSiteUrl", () => {
  it("prefers the explicitly configured URL", () => {
    expect(
      resolveSiteUrl({
        NEXT_PUBLIC_SITE_URL: "https://autodoorstoreorlando.com",
        VERCEL_PROJECT_PRODUCTION_URL: "ignored.vercel.app",
      }),
    ).toBe("https://autodoorstoreorlando.com");
  });

  it("strips a trailing slash, so URLs are not built with a double one", () => {
    expect(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: "https://example.com/" })).toBe(
      "https://example.com",
    );
  });

  it("falls back to Vercel's production domain", () => {
    expect(resolveSiteUrl({ VERCEL_PROJECT_PRODUCTION_URL: "ads.vercel.app" })).toBe(
      "https://ads.vercel.app",
    );
  });

  it("falls back to localhost for local development", () => {
    expect(resolveSiteUrl({})).toBe("http://localhost:3000");
  });
});

// This feeds a permanent (308) redirect, which search engines cache. A wrong
// one is far harder to undo than a missing one, so every case that is not
// clearly a www-to-apex redirect returns null instead of guessing.
describe("wwwHostFor", () => {
  it("returns the www twin of the canonical host", () => {
    expect(wwwHostFor({ NEXT_PUBLIC_SITE_URL: "https://autodoorstoreorlando.com" })).toBe(
      "www.autodoorstoreorlando.com",
    );
  });

  it("returns null when the canonical host is already www — that would loop", () => {
    expect(wwwHostFor({ NEXT_PUBLIC_SITE_URL: "https://www.autodoorstoreorlando.com" })).toBeNull();
  });

  it("returns null on localhost, which has no www variant", () => {
    expect(wwwHostFor({})).toBeNull();
    expect(wwwHostFor({ NEXT_PUBLIC_SITE_URL: "http://localhost:3000" })).toBeNull();
  });

  // A preview build is only ever reached at its own deployment host, so a www
  // redirect there could not fire correctly and might misfire.
  it("returns null for a Vercel preview domain", () => {
    expect(wwwHostFor({ VERCEL_PROJECT_PRODUCTION_URL: "ads-auto-parts.vercel.app" })).toBeNull();
    expect(wwwHostFor({ NEXT_PUBLIC_SITE_URL: "https://preview.vercel.app" })).toBeNull();
  });

  it("returns null for a hostname that cannot have a www variant", () => {
    expect(wwwHostFor({ NEXT_PUBLIC_SITE_URL: "http://internal:8080" })).toBeNull();
  });

  it("returns null rather than throwing on an unparseable URL", () => {
    expect(wwwHostFor({ NEXT_PUBLIC_SITE_URL: "not a url" })).toBeNull();
  });

  it("keeps a subdomain rather than assuming the canonical host is an apex", () => {
    expect(wwwHostFor({ NEXT_PUBLIC_SITE_URL: "https://shop.example.com" })).toBe(
      "www.shop.example.com",
    );
  });
});
