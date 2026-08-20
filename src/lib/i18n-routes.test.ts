import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { localePath, stripLocale } from "./i18n";

// Walks the (public) route group and returns every URL path that has a page,
// with route groups "(x)" and private folders "_x" dropped because they are
// not URL segments. Dynamic segments stay as written ("[id]"), which is what
// makes the two languages comparable.
function publicRoutes(): string[] {
  const root = join(process.cwd(), "src", "app", "(public)");
  const found: string[] = [];

  function walk(dir: string, path: string) {
    if (existsSync(join(dir, "page.tsx"))) found.push(path === "" ? "/" : path);
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const isSegment = !entry.name.startsWith("(") && !entry.name.startsWith("_");
      walk(join(dir, entry.name), isSegment ? `${path}/${entry.name}` : path);
    }
  }

  walk(root, "");
  return found;
}

// The spec's i18n requirement is the whole public site in Spanish, not the
// marketing pages only. Nothing enforced that, and two pages (/estimate and
// /returns) were shipped English-only — while their metadata still advertised
// an hreflang alternate at /es/..., pointing Google and every language toggle
// at a URL that 404s under the spec 1.1 denylist middleware.
//
// This fails the build for the next one instead of leaving it to be noticed in
// production.
describe("every public page exists in both languages", () => {
  const routes = publicRoutes();
  const english = routes.filter((r) => stripLocale(r).locale === "en");
  const spanish = routes.filter((r) => stripLocale(r).locale === "es");

  it("found the route tree at all", () => {
    // Guards against the walk silently returning nothing if the directory
    // layout changes — an empty list would make every check below vacuous.
    expect(english).toContain("/");
    expect(english).toContain("/catalog");
    expect(english.length).toBeGreaterThan(5);
  });

  it("has a Spanish page for every English page", () => {
    for (const path of english) {
      expect(
        spanish.includes(localePath("es", path)),
        `${path} has no Spanish twin — add src/app/(public)/es${path === "/" ? "" : path}/page.tsx, ` +
          `or its hreflang alternate will point at a URL that 404s`,
      ).toBe(true);
    }
  });

  it("has an English page for every Spanish page", () => {
    for (const path of spanish) {
      const { path: neutral } = stripLocale(path);
      expect(
        english.includes(neutral),
        `${path} has no English original — every /es page is a translation of one`,
      ).toBe(true);
    }
  });
});
