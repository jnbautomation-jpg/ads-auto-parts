import { describe, expect, it } from "vitest";
import { CATALOG_TOOL, CHAT_LIMITS, buildSystemPrompt } from "./chat";
import { PHONE_DISPLAY } from "./site";

describe("buildSystemPrompt", () => {
  it("forbids answering catalog questions from memory", () => {
    // The spec's hardest requirement: it must not invent parts or prices.
    const prompt = buildSystemPrompt("GUEST");
    expect(prompt).toMatch(/do NOT know the catalog/i);
    expect(prompt).toMatch(/Never invent a part, a price, or a\nstock level/i);
  });

  it("tells a retail viewer it has no trade pricing at all", () => {
    const prompt = buildSystemPrompt("RETAIL");
    expect(prompt).toMatch(/no access to trade pricing/i);
    // And points them at the real route to getting it.
    expect(prompt).toMatch(/apply for a trade account/i);
  });

  it("tells a guest the same thing", () => {
    expect(buildSystemPrompt("GUEST")).toMatch(/no access to trade pricing/i);
  });

  it("tells an approved trade account its prices are trade prices", () => {
    for (const tier of ["WHOLESALE", "STAFF"] as const) {
      const prompt = buildSystemPrompt(tier);
      expect(prompt).toMatch(/approved trade account/i);
      expect(prompt).not.toMatch(/no access to trade pricing/i);
    }
  });

  it("carries the handoff number, since handing off is a valid answer", () => {
    expect(buildSystemPrompt("GUEST")).toContain(PHONE_DISPLAY);
  });

  it("requires availability labels rather than exact counts", () => {
    // Same public rule the catalog follows — quantities are staff-only.
    const prompt = buildSystemPrompt("GUEST");
    expect(prompt).toMatch(/IN STOCK, LOW STOCK, CALL/);
    expect(prompt).toMatch(/Never state or guess an exact quantity/i);
  });

  it("asks for Spanish as well as English", () => {
    expect(buildSystemPrompt("GUEST")).toMatch(/Spanish/);
  });
});

describe("CATALOG_TOOL", () => {
  it("is the only way the model can learn catalog facts", () => {
    expect(CATALOG_TOOL.name).toBe("search_catalog");
    expect(CATALOG_TOOL.description).toMatch(/Never answer those from your own knowledge/i);
  });

  it("accepts no free-text query the model could smuggle an answer into", () => {
    const props = CATALOG_TOOL.input_schema.properties as Record<string, unknown>;
    expect(Object.keys(props).sort()).toEqual(["make", "model", "partType", "year"]);
    expect(CATALOG_TOOL.input_schema.additionalProperties).toBe(false);
  });
});

describe("CHAT_LIMITS", () => {
  it("bounds cost per session, per message, and per conversation", () => {
    // The spec warns token cost scales with traffic.
    expect(CHAT_LIMITS.perSession).toBeGreaterThan(0);
    expect(CHAT_LIMITS.maxMessageLength).toBeGreaterThan(0);
    expect(CHAT_LIMITS.historyTurns).toBeGreaterThan(0);
    expect(CHAT_LIMITS.windowMs).toBeGreaterThan(0);
  });
});
