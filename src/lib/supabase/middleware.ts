import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Explicit allowlist — anything NOT listed here is private by default and
// redirects to /login when signed out. Add new public routes here deliberately;
// do not flip this to a denylist.
//
// PUBLIC (no auth):
//   /              landing page
//   /login
//   /catalog       Phase 2 — public catalog browse (/catalog) + detail (/catalog/[id])
//
// PROTECTED (everything else, by omission), currently:
//   /dashboard
//   /products (and subroutes: /products/new, /products/[id], /products/[id]/edit)
//   /suppliers
//   /import
//   /inquiries

// Exact-match roots (checked with `===`, never a prefix — "/" must not swallow
// every other route).
const PUBLIC_EXACT_PATHS = ["/", "/login"];

// Prefix paths for whole public sub-trees. "/catalog" here already covers
// "/catalog/[id]" once that route exists — no separate entry needed.
const PUBLIC_PREFIX_PATHS = ["/catalog"];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_EXACT_PATHS.includes(pathname)) return true;
  return PUBLIC_PREFIX_PATHS.some((path) => pathname.startsWith(path));
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

  if (!user && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
