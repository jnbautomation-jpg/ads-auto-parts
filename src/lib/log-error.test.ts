import { describe, expect, it } from "vitest";
import { describeError } from "./log-error";

// The shape Prisma's driver adapter actually throws: the raw Postgres failure
// is two levels down, and it is the only part that names a missing column.
function prismaError(overrides: Record<string, unknown> = {}) {
  return Object.assign(new Error("Invalid `prisma.order.create()` invocation:\n\n\nsomething"), {
    code: "P2010",
    meta: {
      driverAdapterError: {
        cause: {
          originalCode: "42703",
          originalMessage: 'column "tax" of relation "orders" does not exist',
          kind: "postgres",
        },
      },
    },
    ...overrides,
  });
}

describe("describeError", () => {
  it("surfaces the raw Postgres SQLSTATE and message from inside a Prisma error", () => {
    const line = describeError(prismaError());
    expect(line).toContain('db=42703 column "tax" of relation "orders" does not exist');
    expect(line).toContain("code=P2010");
  });

  // This is the whole reason the helper exists: the line has to survive a log
  // sink that splits or collapses multi-line output.
  it("produces exactly one line, with no newlines from the wrapped message", () => {
    const line = describeError(prismaError());
    expect(line).not.toMatch(/\n/);
    expect(line).toContain("message=Invalid `prisma.order.create()` invocation:");
  });

  it("puts the database error first, since it is the most useful part", () => {
    const line = describeError(prismaError());
    expect(line.startsWith("db=")).toBe(true);
  });

  it("still describes a Prisma error that carries no driver cause", () => {
    const line = describeError(prismaError({ meta: { target: ["stripePaymentIntentId"] } }));
    expect(line).toContain("code=P2010");
    expect(line).not.toContain("db=");
  });

  it("describes a plain Error by its message", () => {
    expect(describeError(new Error("boom"))).toBe("message=boom");
  });

  it("describes a thrown string, number, or null without throwing", () => {
    expect(describeError("just a string")).toBe("raw=just a string");
    expect(describeError(42)).toBe("raw=42");
    expect(describeError(null)).toBe("raw=null");
    expect(describeError(undefined)).toBe("raw=undefined");
  });

  it("falls back to JSON for an object with none of the known fields", () => {
    expect(describeError({ weird: true })).toBe('raw={"weird":true}');
  });

  // Runs inside catch blocks. An error while describing an error must not
  // replace a useful message with a crash.
  it("never throws, even on an object that cannot be serialized", () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(() => describeError(circular)).not.toThrow();
    expect(describeError(circular)).toBe("unserializable error");
  });
});
