import { describe, expect, it } from "vitest";
import { isUnreachableDirectHost, resolveMigrationUrl, sessionPoolerFrom } from "./db-url";

const POOLER_6543 =
  "postgresql://postgres.abc123:pw@aws-0-ca-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true";
const POOLER_5432 =
  "postgresql://postgres.abc123:pw@aws-0-ca-central-1.pooler.supabase.com:5432/postgres";
const IPV6_ONLY = "postgresql://postgres:pw@db.lyfftxahbeygkjtmcyzg.supabase.co:5432/postgres";

describe("isUnreachableDirectHost", () => {
  it("flags Supabase's IPv6-only direct host", () => {
    // The one that produced P1001 on the first production deploy.
    expect(isUnreachableDirectHost(IPV6_ONLY)).toBe(true);
  });

  it("does not flag either pooler", () => {
    expect(isUnreachableDirectHost(POOLER_6543)).toBe(false);
    expect(isUnreachableDirectHost(POOLER_5432)).toBe(false);
  });

  it("does not flag a host that merely contains the word db", () => {
    expect(
      isUnreachableDirectHost("postgresql://u:p@dbx.example.com:5432/postgres"),
    ).toBe(false);
  });
});

describe("sessionPoolerFrom", () => {
  it("swaps the port and drops the pgbouncer flag", () => {
    expect(sessionPoolerFrom(POOLER_6543)).toBe(POOLER_5432);
  });

  it("keeps other query parameters", () => {
    expect(
      sessionPoolerFrom(`${POOLER_6543}&connection_limit=1`),
    ).toBe(`${POOLER_5432}?connection_limit=1`);
  });

  it("leaves a password containing reserved characters untouched", () => {
    // String surgery rather than new URL() precisely so this survives — a
    // re-encoded password fails in a way that looks nothing like its cause.
    const withSymbols =
      "postgresql://postgres.abc:p%40ss!w0rd#x@aws-0-eu-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true";
    expect(sessionPoolerFrom(withSymbols)).toContain("p%40ss!w0rd#x");
  });

  it("is a no-op on a string that is already the session pooler", () => {
    expect(sessionPoolerFrom(POOLER_5432)).toBe(POOLER_5432);
  });
});

describe("resolveMigrationUrl", () => {
  it("uses DIRECT_URL when it is usable", () => {
    const r = resolveMigrationUrl({ DIRECT_URL: POOLER_5432, DATABASE_URL: POOLER_6543 });
    expect(r.url).toBe(POOLER_5432);
    expect(r.source).toBe("DIRECT_URL");
    expect(r.warning).toBeUndefined();
  });

  it("derives from DATABASE_URL when DIRECT_URL is the IPv6-only host", () => {
    // The production misconfiguration. Nobody set this deliberately — the
    // build simply never connected to the database until migrate-on-deploy
    // shipped, so a wrong value sat harmless for months.
    const r = resolveMigrationUrl({ DIRECT_URL: IPV6_ONLY, DATABASE_URL: POOLER_6543 });
    expect(r.url).toBe(POOLER_5432);
    expect(r.source).toBe("derived-from-DATABASE_URL");
    expect(r.warning).toMatch(/IPv6-only/);
  });

  it("derives from DATABASE_URL when DIRECT_URL is missing entirely", () => {
    const r = resolveMigrationUrl({ DATABASE_URL: POOLER_6543 });
    expect(r.url).toBe(POOLER_5432);
    expect(r.source).toBe("derived-from-DATABASE_URL");
  });

  it("never silently overrides a working DIRECT_URL that differs from DATABASE_URL", () => {
    // A separate migration database is a legitimate setup; only the value that
    // cannot work is ignored.
    const other = "postgresql://postgres.zzz:pw@aws-0-us-east-1.pooler.supabase.com:5432/postgres";
    expect(resolveMigrationUrl({ DIRECT_URL: other, DATABASE_URL: POOLER_6543 }).url).toBe(other);
  });

  it("reports rather than hides a setup where neither URL can work", () => {
    const r = resolveMigrationUrl({ DIRECT_URL: IPV6_ONLY, DATABASE_URL: IPV6_ONLY });
    expect(r.source).toBe("none");
    expect(r.url).toBe(IPV6_ONLY);
    expect(r.warning).toMatch(/pooler\.supabase\.com/);
  });

  it("treats blank strings as unset", () => {
    const r = resolveMigrationUrl({ DIRECT_URL: "   ", DATABASE_URL: POOLER_6543 });
    expect(r.source).toBe("derived-from-DATABASE_URL");
  });
});
