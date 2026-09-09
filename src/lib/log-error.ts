// One line that says what actually went wrong.
//
// `console.error("failed:", cause)` hands the log sink a multi-line Error
// inspection. Vercel's ingestion can split that across entries, collapse it,
// or show only the first line — which is how a checkout that failed on every
// attempt produced a log that appeared to contain no cause at all. A single
// pre-formatted string cannot be mangled that way.
//
// For a Prisma error the interesting part is two levels down: the driver
// adapter wraps the raw Postgres failure in `meta.driverAdapterError.cause`,
// and THAT carries the SQLSTATE and the server's own message — e.g.
//   42703 column "tax" of relation "orders" does not exist
// which is the one line that would have named this bug on the first try.

type PrismaLike = {
  code?: unknown;
  message?: unknown;
  meta?: { driverAdapterError?: { cause?: Record<string, unknown> } } & Record<string, unknown>;
};

function firstLine(value: unknown): string {
  return String(value ?? "").split("\n")[0].trim();
}

/**
 * Flatten any thrown value into one greppable line.
 *
 * Order of parts, most useful first: the raw database error if there is one,
 * then Prisma's own code and message, then anything else. Never throws —
 * this runs inside catch blocks, and an error while describing an error
 * would replace a useful message with a crash.
 */
export function describeError(cause: unknown): string {
  try {
    if (cause instanceof Error || (typeof cause === "object" && cause !== null)) {
      const e = cause as PrismaLike;
      const parts: string[] = [];

      const db = e.meta?.driverAdapterError?.cause;
      if (db && typeof db === "object") {
        const sqlstate = firstLine(db.originalCode ?? db.code);
        const msg = firstLine(db.originalMessage ?? db.message);
        if (sqlstate || msg) parts.push(`db=${[sqlstate, msg].filter(Boolean).join(" ")}`);
      }

      if (e.code) parts.push(`code=${firstLine(e.code)}`);
      if (e.message) parts.push(`message=${firstLine(e.message)}`);

      if (parts.length === 0) {
        parts.push(`raw=${firstLine(JSON.stringify(cause)).slice(0, 300)}`);
      }
      return parts.join(" | ");
    }
    return `raw=${firstLine(String(cause))}`;
  } catch {
    return "unserializable error";
  }
}
