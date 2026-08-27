import { describe, expect, it } from "vitest";
import {
  isUnreachableDirectHost,
  redactPassword,
  resolveMigrationUrl,
  sessionPoolerFrom,
} from "./db-url";

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

// The DIRECT_URL warning is read in the Vercel build log, which everyone on
// the project can see. It names the value to set so nobody has to go hunting
// for it — which means it must never carry the password there.
describe("redactPassword", () => {
  it("removes the password and keeps everything needed to identify the host", () => {
    expect(
      redactPassword("postgresql://postgres.abcd:s3cr3t@aws-0-us-east-1.pooler.supabase.com:5432/postgres"),
    ).toBe("postgresql://postgres.abcd:<password>@aws-0-us-east-1.pooler.supabase.com:5432/postgres");
  });

  // Supabase generates passwords containing "@". Splitting on the FIRST "@"
  // treats everything after it as the host and prints it — so this is the case
  // that decides whether the warning is safe to log at all.
  it("redacts a password containing an @, splitting on the last one", () => {
    const redacted = redactPassword("postgresql://user:p@ss:zzz9/x@host:5432/db");
    expect(redacted).not.toContain("zzz9");
    expect(redacted).toBe("postgresql://user:<password>@host:5432/db");
  });

  it("fails closed on anything it cannot parse, rather than printing it", () => {
    expect(redactPassword("not a url")).toBe("<unparseable connection string>");
    expect(redactPassword("")).toBe("<unparseable connection string>");
  });

  it("never leaks the password of a real derived URL", () => {
    const secret = "hunter2-swordfish";
    const url = `postgresql://postgres.ref:${secret}@aws-0-us-east-1.pooler.supabase.com:5432/postgres`;
    expect(redactPassword(url)).not.toContain(secret);
  });
});

describe("the DIRECT_URL warning", () => {
  const DATABASE_URL =
    "postgresql://postgres.ref:s3cr3t@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true";

  it("names the exact value to set", () => {
    const result = resolveMigrationUrl({
      DATABASE_URL,
      DIRECT_URL: "postgresql://postgres:s3cr3t@db.ref.supabase.co:5432/postgres",
    });
    expect(result.warning).toContain("aws-0-us-east-1.pooler.supabase.com:5432");
  });

  it("does not put the password in the build log", () => {
    const result = resolveMigrationUrl({
      DATABASE_URL,
      DIRECT_URL: "postgresql://postgres:s3cr3t@db.ref.supabase.co:5432/postgres",
    });
    expect(result.warning).not.toContain("s3cr3t");
    // The URL Prisma actually connects with still has the real password.
    expect(result.url).toContain("s3cr3t");
  });
});
