// Where the site lives, resolved from the environment.
//
// Split out of site.ts so `next.config.ts` can import it too. The config file
// runs before the app is bundled, outside the `@/` path alias, so anything it
// shares has to be a module with no aliased imports of its own — that is the
// only reason this is a separate file. src/lib/site.ts re-exports SITE_URL, so
// nothing else in the app needs to know it moved.
//
// Both the canonical URL and the www redirect are derived from the same
// resolution here. That is the point: a redirect pointing somewhere the
// canonical tag disagrees with is worse than no redirect at all, because it
// splits the shop's search ranking between two hosts that each insist the
// other is wrong.

/**
 * Absolute origin for canonical URLs, Open Graph images, and the sitemap.
 *
 * Metadata needs an absolute base; without one Next falls back to
 * http://localhost:3000 and every shared link points at nothing.
 *
 * Resolution order:
 *   1. NEXT_PUBLIC_SITE_URL — set this in Vercel once the real domain is
 *      attached. It is the only one that survives a domain change.
 *   2. VERCEL_PROJECT_PRODUCTION_URL — the project's production domain,
 *      injected by Vercel. Deliberately NOT VERCEL_URL, which is unique per
 *      deployment and would make canonical URLs point at a preview build.
 *   3. localhost, for `npm run dev`.
 */
export function resolveSiteUrl(env: Record<string, string | undefined> = process.env): string {
  const explicit = env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");

  const vercelProduction = env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelProduction) return `https://${vercelProduction.replace(/\/+$/, "")}`;

  return "http://localhost:3000";
}

/**
 * The `www.` host that should redirect to the canonical one, or null when
 * there is nothing to redirect.
 *
 * Null in three cases, all of which mean "do not add a redirect":
 *   * localhost, where there is no www variant;
 *   * a canonical host that is already `www.`, where redirecting to itself
 *     would be an infinite loop;
 *   * a host with no dot, which cannot have a www variant.
 *
 * Returning null rather than guessing matters because this feeds a permanent
 * (308) redirect. Search engines cache those, and a wrong one is far harder
 * to undo than a missing one.
 */
export function wwwHostFor(env: Record<string, string | undefined> = process.env): string | null {
  let host: string;
  try {
    host = new URL(resolveSiteUrl(env)).host;
  } catch {
    return null;
  }

  if (host.startsWith("www.")) return null;
  // Covers localhost and any bare hostname, with or without a port.
  if (!host.split(":")[0].includes(".")) return null;
  // A preview deployment is reached at its own *.vercel.app host, never at a
  // www variant of it — a redirect there would only ever misfire.
  if (host.endsWith(".vercel.app")) return null;

  return `www.${host}`;
}
