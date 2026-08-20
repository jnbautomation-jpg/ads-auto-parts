import { describe, expect, it } from "vitest";
import {
  COUNT_STALE_DAYS,
  RISK_LABEL,
  buildCountWorklist,
  stockRisk,
  summarize,
  type StockAuditProduct,
} from "./stock-audit";

const NOW = new Date("2026-08-20T12:00:00");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000);

const p = (over: Partial<StockAuditProduct> = {}): StockAuditProduct => ({
  id: "1",
  sku: "A",
  quantity: 10,
  reorderPoint: 2,
  isPublic: true,
  lastCountedAt: null,
  ...over,
});

describe("stockRisk", () => {
  it("ranks a public part showing CALL highest", () => {
    // Customers see CALL and most won't. If it's actually on the shelf that
    // is a lost sale every day.
    expect(stockRisk(p({ quantity: 0 }), NOW)).toBe("SHOWING_CALL");
  });

  it("ranks a public part showing LOW STOCK next", () => {
    expect(stockRisk(p({ quantity: 2, reorderPoint: 2 }), NOW)).toBe("SHOWING_LOW");
  });

  it("treats an uncounted but healthy part as merely never counted", () => {
    expect(stockRisk(p({ quantity: 20 }), NOW)).toBe("NEVER_COUNTED");
  });

  it("does not raise a hidden part to the top, however bad its count", () => {
    // A part nobody can see isn't costing credibility.
    expect(stockRisk(p({ quantity: 0, isPublic: false }), NOW)).toBe("NEVER_COUNTED");
  });

  it("treats a recently counted part as fine", () => {
    expect(stockRisk(p({ lastCountedAt: daysAgo(5) }), NOW)).toBe("OK");
  });

  it("goes stale after the documented window", () => {
    expect(stockRisk(p({ lastCountedAt: daysAgo(COUNT_STALE_DAYS - 1) }), NOW)).toBe("OK");
    expect(stockRisk(p({ lastCountedAt: daysAgo(COUNT_STALE_DAYS + 1) }), NOW)).toBe("STALE");
  });

  it("re-raises a stale part that is publicly showing a bad label", () => {
    // A count from a year ago saying "1 left" is exactly what the spec warns
    // about.
    expect(stockRisk(p({ quantity: 1, reorderPoint: 2, lastCountedAt: daysAgo(200) }), NOW)).toBe(
      "SHOWING_LOW",
    );
  });
});

describe("buildCountWorklist", () => {
  it("puts the parts costing money first", () => {
    const list = buildCountWorklist(
      [
        p({ id: "ok", sku: "OK", lastCountedAt: daysAgo(1) }),
        p({ id: "never", sku: "NEV" }),
        p({ id: "low", sku: "LOW", quantity: 1, reorderPoint: 2 }),
        p({ id: "call", sku: "CALL", quantity: 0 }),
      ],
      NOW,
    );
    expect(list.map((l) => l.id)).toEqual(["call", "low", "never", "ok"]);
  });

  it("within a tier, counts the longest-neglected first", () => {
    const list = buildCountWorklist(
      [
        p({ id: "recent", sku: "B", lastCountedAt: daysAgo(100) }),
        p({ id: "ancient", sku: "A", lastCountedAt: daysAgo(400) }),
      ],
      NOW,
    );
    expect(list[0].id).toBe("ancient");
  });

  it("is stable for identical products", () => {
    const list = buildCountWorklist([p({ id: "2", sku: "B" }), p({ id: "1", sku: "A" })], NOW);
    expect(list.map((l) => l.sku)).toEqual(["A", "B"]);
  });

  it("handles an empty catalog", () => {
    expect(buildCountWorklist([], NOW)).toEqual([]);
  });
});

describe("summarize", () => {
  it("reports how much of the catalog is actually verified", () => {
    const s = summarize(
      [
        p({ lastCountedAt: daysAgo(1) }),
        p({ lastCountedAt: daysAgo(1) }),
        p({ quantity: 0 }),
        p(),
      ],
      NOW,
    );
    expect(s.total).toBe(4);
    expect(s.counts.OK).toBe(2);
    expect(s.counts.SHOWING_CALL).toBe(1);
    expect(s.counts.NEVER_COUNTED).toBe(1);
    expect(s.verifiedPercent).toBe(50);
  });

  it("reports 0% rather than dividing by zero on an empty catalog", () => {
    expect(summarize([], NOW).verifiedPercent).toBe(0);
  });
});

describe("labels", () => {
  it("explains each state in words staff can act on", () => {
    expect(RISK_LABEL.SHOWING_CALL).toBe("Publicly out of stock");
    expect(RISK_LABEL.NEVER_COUNTED).toBe("Never counted");
  });
});
