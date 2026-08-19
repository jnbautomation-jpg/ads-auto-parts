import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Staff-only route roots. Anything NOT listed here is treated as public,
// which means an unknown URL renders the 404 page instead of bouncing a
// customer to the staff sign-in screen (Phase 2 spec 1.1 — old ADS URLs are
// still indexed in Google, and sending that traffic to a login form is both
// a dead end for the customer and wasted crawl budget).
//
// This is a denylist, so forgetting to add a new staff route here would make
// it publicly *reachable* — but not publicly *readable*: every page under
// (admin) renders inside (admin)/layout.tsx, which calls requireAuthContext()
// and redirects to /login itself, and every mutating server action re-checks
// auth and role independently. This middleware is the fast path, not the
// security boundary.
//
// src/lib/supabase/middleware.test.ts enumerates src/app/(admin)/ and fails
// if any segment is missing from this list, so it cannot silently fall
// behind the routes.
export const PRIVATE_PREFIXES = [
  "/dashboard",
  "/products",
  "/suppliers",
  "/import",
  "/inquiries",
  "/orders",
  "/customers",
  "/staff",
  // Not under (admin), but authenticated-only: a signed-out visitor must not
  // reach it.
  "/force-password-change",
];

// Segment-aware prefix match: "/products" matches "/products" and
// "/products/abc" but NOT "/products-recall", which a bare startsWith would
// wrongly capture.
export function isPrivatePath(pathname: string): boolean {
  return PRIVATE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not remove: this call refreshes the auth token and is what actually
  // keeps sessions alive. Without it the client above is inert.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  if (!user && isPrivatePath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // NOTE: "already signed in, bounce off /login" is handled by the login page
  // itself, not here. Middleware can't tell a staff session from a customer
  // session without a database query, and bouncing a signed-in CUSTOMER to
  // /dashboard produced an infinite loop: /dashboard has no `users` row for
  // them, so requireAuthContext() sent them straight back to /login.

  // Staff accounts are created with a temp password and this flag set —
  // only the admin API (never the user's own session) can clear it, so it's
  // tamper-proof from the client. Block every other route until it's clear.
  const mustChangePassword = Boolean(user?.app_metadata?.must_change_password);
  if (user && mustChangePassword && pathname !== "/force-password-change") {
    const url = request.nextUrl.clone();
    url.pathname = "/force-password-change";
    return NextResponse.redirect(url);
  }
  // Same reasoning as above: leaving this page when the flag is clear is
  // decided by the page, which can tell staff from customers.

  return supabaseResponse;
}
