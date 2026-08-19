import { describe, expect, it } from "vitest";
import { PartType } from "@/generated/prisma/enums";
import { CROSS_SELL_MAP, relatedPartTypes } from "./cross-sell";

describe("relatedPartTypes", () => {
  it("suggests hinges with a hood — the client's own example", () => {
    expect(relatedPartTypes("HOOD")).toContain("HINGE");
  });

  it("suggests the front-end collision cluster together", () => {
    // A car that needed a new bumper usually needed more than the bumper.
    expect(relatedPartTypes("BUMPER")).toEqual(
      expect.arrayContaining(["GRILLE", "RADIATOR_SUPPORT"]),
    );
  });

  it("returns an empty list for a part type with no pairings", () => {
    expect(relatedPartTypes("HINGE")).toEqual([]);
    expect(relatedPartTypes("NOT_A_PART")).toEqual([]);
  });

  it("never suggests a part type as related to itself", () => {
    for (const [type, related] of Object.entries(CROSS_SELL_MAP)) {
      expect(related, `${type} suggests itself`).not.toContain(type);
    }
  });

  it("only ever names real part types", () => {
    const valid = new Set<string>(Object.values(PartType));
    for (const [type, related] of Object.entries(CROSS_SELL_MAP)) {
      expect(valid.has(type), `${type} is not a PartType`).toBe(true);
      for (const r of related) {
        expect(valid.has(r), `${type} -> ${r} is not a PartType`).toBe(true);
      }
    }
  });
});
