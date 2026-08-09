import { createClient } from "@supabase/supabase-js";
import { WebSocket } from "ws";

// supabase-js's realtime client unconditionally reaches for a global
// WebSocket constructor, even though we never touch realtime here — and
// requires Node 22+ for the native one. Node 20 (this project's runtime)
// has no global WebSocket, so createClient() throws before we even get to
// the auth admin API. Polyfill it with `ws` rather than bump the whole
// project's Node version for one unused feature of one client.
if (typeof globalThis.WebSocket === "undefined") {
  (globalThis as { WebSocket?: unknown }).WebSocket = WebSocket;
}

// Server-only client backed by the service-role key — bypasses RLS and can
// create/update/delete ANY auth user (not just the caller). Never import this
// from a "use client" file; only from "use server" action files that have
// already re-verified the caller's own identity/role via requireAuthContext().
export function createAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error("createAdminClient() must never run in the browser.");
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
