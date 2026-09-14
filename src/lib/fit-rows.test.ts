import { describe, expect, it } from "vitest";
import { dedupeFitRows, type RawFitRow } from "./fit-rows";

function raw(over: Partial<RawFitRow> = {}): RawFitRow {
  return {
    make: "Toyota",
    model: "Tundra",
    yearStart: 2014,
    yearEnd: 2021,
    product: { partType: "DOOR" },
    ...over,
  };
}

describe("dedupeFitRows", () => {
  it("collapses one-row-per-product into one row per combination", () => {
    // Three doors for the same fit is one selectable combination.
    expect(dedupeFitRows([raw(), raw(), raw()])).toEqual([
      { make: "Toyota", model: "Tundra", yearStart: 2014, yearEnd: 2021, partType: "DOOR" },
    ]);
  });

  it("keeps a row that differs in any single field", () => {
    const rows = dedupeFitRows([
      raw(),
      raw({ make: "Tesla" }),
      raw({ model: "RAV4" }),
      raw({ yearStart: 2015 }),
      raw({ yearEnd: 2022 }),
      raw({ product: { partType: "HOOD" } }),
    ]);
    expect(rows).toHaveLength(6);
  });

  it("flattens the nested product shape the query returns", () => {
    const [row] = dedupeFitRows([raw({ product: { partType: "FENDER" } })]);
    expect(row.partType).toBe("FENDER");
    expect("product" in row).toBe(false);
  });

  it("is empty for an empty catalog rather than throwing", () => {
    expect(dedupeFitRows([])).toEqual([]);
  });

  it("keeps first-seen order — callers sort as they render", () => {
    const rows = dedupeFitRows([raw({ make: "Tesla" }), raw({ make: "Honda" }), raw({ make: "Tesla" })]);
    expect(rows.map((r) => r.make)).toEqual(["Tesla", "Honda"]);
  });
});
