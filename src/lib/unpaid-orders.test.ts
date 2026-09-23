import { beforeEach, describe, expect, it, vi } from "vitest";

// No database in the unit suite, so Prisma is replaced by a fake whose
// findMany applies the query it is given — the where clause, the ordering and
// the batch size — to a fixture table. The tests therefore check which orders
// the query the sweep builds would select, and one test pins the exact query.
// What the fake cannot check is Postgres itself; that is out of scope here, as
// it is for createOrder (see orders.test.ts).

type Row = {
  id: string;
  organizationId: string;
  paymentStatus: "UNPAID" | "PAID" | "REFUNDED";
  status: "NEW" | "CONFIRMED" | "CANCELLED";
  stripePaymentIntentId: string | null;
  createdAt: Date;
};

type Where = Record<string, unknown>;

const table: Row[] = [];

function matches(row: Row, where: Where): boolean {
  return Object.entries(where).every(([key, cond]) => {
    const value = row[key as keyof Row];
    if (cond && typeof cond === "object" && !(cond instanceof Date)) {
      const c = cond as { not?: unknown; lt?: Date };
      if ("not" in c && value === c.not) return false;
      if (c.lt !== undefined && !(value instanceof Date && value < c.lt)) return false;
      return true;
    }
    return value === cond;
  });
}

const findMany = vi.fn(
  async (args: { where: Where; orderBy?: { createdAt: "asc" | "desc" }; take?: number }) => {
    let rows = table.filter((r) => matches(r, args.where));
    if (args.orderBy?.createdAt) {
      const dir = args.orderBy.createdAt === "desc" ? -1 : 1;
      rows = [...rows].sort((a, b) => dir * (a.createdAt.getTime() - b.createdAt.getTime()));
    }
    if (args.take !== undefined) rows = rows.slice(0, args.take);
    return rows.map((r) => ({ id: r.id, stripePaymentIntentId: r.stripePaymentIntentId }));
  },
);

const cancel = vi.fn<(id: string) => Promise<object>>(async () => ({}));
let stripeConfigured = true;

vi.mock("@/lib/prisma", () => ({ prisma: { order: { findMany } } }));
vi.mock("@/lib/stripe", () => ({
  stripeClient: () => (stripeConfigured ? { paymentIntents: { cancel } } : null),
}));

const { releaseStaleUnpaidOrders, UNPAID_HOLD_MINUTES } = await import("./unpaid-orders");

const ORG = "org_shop";
const NOW = new Date("2026-09-21T15:00:00Z");
const minutesAgo = (m: number) => new Date(NOW.getTime() - m * 60_000);

function order(id: string, overrides: Partial<Row> = {}): Row {
  return {
    id,
    organizationId: ORG,
    paymentStatus: "UNPAID",
    status: "NEW",
    stripePaymentIntentId: `pi_${id}`,
    createdAt: minutesAgo(UNPAID_HOLD_MINUTES + 5),
    ...overrides,
  };
}

const cancelledIds = () => cancel.mock.calls.map(([id]) => id);

beforeEach(() => {
  table.length = 0;
  findMany.mockClear();
  cancel.mockReset();
  cancel.mockImplementation(async () => ({}));
  stripeConfigured = true;
});

describe("releaseStaleUnpaidOrders", () => {
  it("cancels an unpaid NEW order older than the hold", async () => {
    table.push(order("stale"));
    await releaseStaleUnpaidOrders(ORG, NOW);
    expect(cancelledIds()).toEqual(["pi_stale"]);
  });

  it("skips orders still inside the hold, including one exactly at the cutoff", async () => {
    table.push(
      order("fresh", { createdAt: minutesAgo(1) }),
      order("almost", { createdAt: minutesAgo(UNPAID_HOLD_MINUTES - 1) }),
      order("edge", { createdAt: minutesAgo(UNPAID_HOLD_MINUTES) }),
      order("stale", { createdAt: minutesAgo(UNPAID_HOLD_MINUTES + 1) }),
    );
    await releaseStaleUnpaidOrders(ORG, NOW);
    expect(cancelledIds()).toEqual(["pi_stale"]);
  });

  it("skips paid orders and orders staff have moved past NEW", async () => {
    table.push(
      order("paid", { paymentStatus: "PAID" }),
      order("refunded", { paymentStatus: "REFUNDED" }),
      order("confirmed", { status: "CONFIRMED" }),
      order("cancelled", { status: "CANCELLED" }),
    );
    await releaseStaleUnpaidOrders(ORG, NOW);
    expect(cancel).not.toHaveBeenCalled();
  });

  it("skips orders with no PaymentIntent — staff phone orders and reorders", async () => {
    table.push(order("phone", { stripePaymentIntentId: null }));
    await releaseStaleUnpaidOrders(ORG, NOW);
    expect(cancel).not.toHaveBeenCalled();
  });

  it("only touches the given organisation's orders", async () => {
    table.push(order("ours"), order("theirs", { organizationId: "org_other" }));
    await releaseStaleUnpaidOrders(ORG, NOW);
    expect(cancelledIds()).toEqual(["pi_ours"]);
  });

  it("builds exactly the query the fake assumes", async () => {
    await releaseStaleUnpaidOrders(ORG, NOW);
    expect(findMany).toHaveBeenCalledWith({
      where: {
        organizationId: ORG,
        paymentStatus: "UNPAID",
        status: "NEW",
        stripePaymentIntentId: { not: null },
        createdAt: { lt: minutesAgo(UNPAID_HOLD_MINUTES) },
      },
      select: { id: true, stripePaymentIntentId: true },
      orderBy: { createdAt: "asc" },
      take: 10,
    });
  });

  it("cancels at most one batch per sweep, oldest first", async () => {
    // o0 is the newest of the stale set, o11 the oldest.
    for (let i = 0; i < 12; i++) table.push(order(`o${i}`, { createdAt: minutesAgo(UNPAID_HOLD_MINUTES + 1 + i) }));
    await releaseStaleUnpaidOrders(ORG, NOW);
    // The ten that have held their stock longest, not the ten most recent:
    // taking the newest would leave the backlog permanently unreached.
    expect(cancelledIds()).toEqual(Array.from({ length: 10 }, (_, i) => `pi_o${11 - i}`));
  });

  it("never throws when Stripe refuses a cancel, and carries on with the rest", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    table.push(order("a", { createdAt: minutesAgo(40) }), order("b", { createdAt: minutesAgo(50) }));
    cancel.mockImplementationOnce(async () => {
      throw new Error("This PaymentIntent's status is succeeded");
    });

    await expect(releaseStaleUnpaidOrders(ORG, NOW)).resolves.toBeUndefined();
    // b is the older of the two, so oldest-first reaches it first; the throw
    // on that one must not stop a from being cancelled after it.
    expect(cancelledIds()).toEqual(["pi_b", "pi_a"]);
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });

  it("never throws when the query itself fails", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    findMany.mockRejectedValueOnce(new Error("connection reset"));
    await expect(releaseStaleUnpaidOrders(ORG, NOW)).resolves.toBeUndefined();
    expect(error).toHaveBeenCalledOnce();
    error.mockRestore();
  });

  it("does nothing when Stripe is not configured", async () => {
    stripeConfigured = false;
    table.push(order("stale"));
    await releaseStaleUnpaidOrders(ORG, NOW);
    expect(findMany).not.toHaveBeenCalled();
  });
});
