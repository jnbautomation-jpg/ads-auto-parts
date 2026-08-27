// Resolving the connection string Prisma Migrate uses.
//
// Supabase hands out two connection strings that differ only in a port and a
// flag, and they are not interchangeable:
//
//   transaction pooler   …pooler.supabase.com:6543/postgres?pgbouncer=true
//   session pooler       …pooler.supabase.com:5432/postgres
//
// The app's queries go through the first (DATABASE_URL). Migrate needs the
// second (DIRECT_URL) because advisory locks and DDL cannot run through
// PgBouncer's transaction pooling.
//
// There is a third string in the Supabase dashboard — the "direct connection"
// at db.<project-ref>.supabase.co — and it is the one people paste, because it
// is the one labelled "direct". It is **IPv6-only**, so Vercel's build
// machines cannot reach it at all. Setting DIRECT_URL to it produces
// `P1001: Can't reach database server`, and that failure only appears once
// something in the build actually connects — which is why an environment can
// sit misconfigured for months and then break the first time migrate-on-deploy
// ships. That is exactly what happened here.
//
// So rather than requiring every environment to have DIRECT_URL set correctly
// by hand, we derive it. The session pooler differs from the transaction
// pooler by a port and a flag, so DATABASE_URL — which must already be correct
// or the site could not serve a page — is enough to reconstruct it.

/**
 * True for Supabase's IPv6-only direct host, which is never usable from a
 * Vercel build regardless of how the rest of the string looks.
 */
export function isUnreachableDirectHost(url: string): boolean {
  return /@db\.[a-z0-9]+\.supabase\.co(?::|\/|$)/i.test(url);
}

/**
 * Turns a transaction-pooler URL into its session-pooler twin: same host, same
 * credentials, port 5432, no pgbouncer flag.
 *
 * Deliberately string surgery rather than `new URL()` — reserializing the URL
 * risks re-encoding a password that contains reserved characters, and a
 * corrupted password would fail in a way that looks nothing like its cause.
 */
export function sessionPoolerFrom(transactionPoolerUrl: string): string {
  return transactionPoolerUrl
    .replace(/:6543\//, ":5432/")
    .replace(/([?&])pgbouncer=true(&|$)/, (_match, sep: string, tail: string) => (tail ? sep : ""))
    .replace(/[?&]$/, "");
}

/**
 * A connection string with its password replaced by a placeholder.
 *
 * The build log is the only place the DIRECT_URL warning is ever read, and
 * Vercel build logs are visible to everyone on the project — so the derived
 * value can be shown to say WHICH host and port are wanted, but the password
 * inside it absolutely cannot. Everything except the password is either
 * already public or already in the dashboard.
 *
 * Fails closed: anything that does not parse as a URL with credentials comes
 * back fully redacted rather than being printed on the assumption it is safe.
 */
export function redactPassword(url: string): string {
  // The password group is GREEDY and the host group forbids "@", so the split
  // happens at the LAST "@" rather than the first. A non-greedy password stops
  // at the first one, and a password containing "@" — which Supabase generates
  // — then has its tail printed as if it were part of the host. That is the
  // exact failure this function exists to prevent.
  const match = /^([a-z+]+:\/\/)([^:@/]+):(.*)@([^@]+)$/i.exec(url);
  if (!match) return "<unparseable connection string>";
  const [, scheme, user, , host] = match;
  return `${scheme}${user}:<password>@${host}`;
}

export type MigrationUrl = {
  url: string | undefined;
  /** Where the value came from, for the log line at build time. */
  source: "DIRECT_URL" | "derived-from-DATABASE_URL" | "none";
  /** Set when the operator should fix something, even though we carried on. */
  warning?: string;
};

/**
 * Picks the URL Migrate should use.
 *
 * DIRECT_URL wins whenever it is set to something usable. It is only ignored
 * when it points at the IPv6-only host, because that value cannot work — this
 * is not a preference being overridden, it is a value with no working case.
 */
export function resolveMigrationUrl(env: Record<string, string | undefined>): MigrationUrl {
  const direct = env.DIRECT_URL?.trim();
  const runtime = env.DATABASE_URL?.trim();

  if (direct && !isUnreachableDirectHost(direct)) {
    return { url: direct, source: "DIRECT_URL" };
  }

  if (runtime && !isUnreachableDirectHost(runtime)) {
    const derived = sessionPoolerFrom(runtime);
    // The warning names the exact value to set, with the password redacted.
    // Saying only "fix DIRECT_URL" leaves whoever reads the build log hunting
    // through the Supabase dashboard for a string that differs from the one
    // they already have by a port and a query flag — which is how it came to
    // be wrong in the first place.
    const fix = `Set it to: ${redactPassword(derived)} (same password as DATABASE_URL).`;

    return {
      url: derived,
      source: "derived-from-DATABASE_URL",
      warning: direct
        ? "DIRECT_URL points at db.<ref>.supabase.co, which is IPv6-only and unreachable from a " +
          `Vercel build. Using the session pooler derived from DATABASE_URL instead. ${fix}`
        : `DIRECT_URL is not set. Using the session pooler derived from DATABASE_URL. ${fix}`,
    };
  }

  // Nothing usable. Hand back whatever was configured so Prisma reports its own
  // error against the real value, rather than us masking it with undefined.
  return {
    url: direct ?? runtime,
    source: "none",
    warning:
      "Neither DIRECT_URL nor DATABASE_URL points at a reachable Supabase pooler. Migrations " +
      "will fail. Both should be …pooler.supabase.com — 6543 for DATABASE_URL, 5432 for DIRECT_URL.",
  };
}
