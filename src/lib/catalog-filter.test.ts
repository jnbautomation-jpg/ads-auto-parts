import { describe, expect, it } from "vitest";
import { applyChange, optionsFor, rowHas, yearOptions, type FitRow, type Selection } from "./catalog-filter";

// Mirrors the shape of the real catalog: Tesla stocks only Model 3/Y, Toyota
// only Tundra/RAV4, and one Toyota row is a hood rather than a door.
const ROWS: FitRow[] = [
  { make: "Tesla", model: "Model 3", yearStart: 2018, yearEnd: 2024, partType: "DOOR" },
  { make: "Tesla", model: "Model Y", yearStart: 2020, yearEnd: 2024, partType: "DOOR" },
  { make: "Toyota", model: "Tundra", yearStart: 2014, yearEnd: 2021, partType: "DOOR" },
  { make: "Toyota", model: "RAV4", yearStart: 2019, yearEnd: 2024, partType: "DOOR" },
  { make: "Toyota", model: "RAV4", yearStart: 2019, yearEnd: 2024, partType: "HOOD" },
];

const EMPTY: Selection = { year: "", make: "", model: "", partType: "" };

describe("rowHas", () => {
  it("matches a year anywhere inside the fit's range", () => {
    const row = ROWS[0];
    expect(rowHas(row, "year", "2018")).toBe(true);
    expect(rowHas(row, "year", "2021")).toBe(true);
    expect(rowHas(row, "year", "2024")).toBe(true);
    expect(rowHas(row, "year", "2017")).toBe(false);
    expect(rowHas(row, "year", "2025")).toBe(false);
  });

  it("does not match a non-numeric year", () => {
    expect(rowHas(ROWS[0], "year", "abc")).toBe(false);
  });
});

describe("yearOptions", () => {
  it("expands fit ranges into individual years, newest first", () => {
    const years = yearOptions(ROWS);
    expect(years[0]).toBe(2024);
    expect(years[years.length - 1]).toBe(2014);
    expect(years).toContain(2019);
  });

  it("offers every stocked year regardless of selection", () => {
    // Year is first in the cascade, so it is never narrowed — otherwise
    // changing make could hide the year a visitor already picked.
    expect(yearOptions(ROWS)).toHaveLength(2024 - 2014 + 1);
  });
});

describe("optionsFor — directional narrowing", () => {
  it("offers every make when nothing is selected", () => {
    expect(optionsFor(ROWS, EMPTY, "make")).toEqual(["Tesla", "Toyota"]);
  });

  it("narrows models by the selected make", () => {
    expect(optionsFor(ROWS, { ...EMPTY, make: "Tesla" }, "model")).toEqual(["Model 3", "Model Y"]);
    expect(optionsFor(ROWS, { ...EMPTY, make: "Toyota" }, "model")).toEqual(["RAV4", "Tundra"]);
  });

  it("narrows makes by the selected year", () => {
    // Only Toyota stocks anything fitting 2015.
    expect(optionsFor(ROWS, { ...EMPTY, year: "2015" }, "make")).toEqual(["Toyota"]);
  });

  it("narrows part types by make and model", () => {
    expect(optionsFor(ROWS, { ...EMPTY, make: "Toyota", model: "RAV4" }, "partType")).toEqual([
      "DOOR",
      "HOOD",
    ]);
    expect(optionsFor(ROWS, { ...EMPTY, make: "Toyota", model: "Tundra" }, "partType")).toEqual([
      "DOOR",
    ]);
  });

  it("does NOT narrow an earlier select by a later one", () => {
    // The bug this replaced: choosing a model left its make as the only
    // option, so the visitor could not switch make at all.
    const withModel: Selection = { ...EMPTY, model: "Model Y" };
    expect(optionsFor(ROWS, withModel, "make")).toEqual(["Tesla", "Toyota"]);
  });
});

describe("applyChange", () => {
  it("clears a later select stranded by an earlier change", () => {
    const start: Selection = { year: "", make: "Tesla", model: "Model Y", partType: "" };
    const next = applyChange(ROWS, start, "make", "Toyota");
    expect(next.make).toBe("Toyota");
    expect(next.model).toBe("");
  });

  it("keeps a later select that is still valid", () => {
    const start: Selection = { year: "", make: "Toyota", model: "RAV4", partType: "DOOR" };
    const next = applyChange(ROWS, start, "year", "2020");
    expect(next).toMatchObject({ year: "2020", make: "Toyota", model: "RAV4", partType: "DOOR" });
  });

  it("clears a part type that the new vehicle doesn't stock", () => {
    const start: Selection = { year: "", make: "Toyota", model: "RAV4", partType: "HOOD" };
    const next = applyChange(ROWS, start, "model", "Tundra");
    expect(next.partType).toBe("");
  });

  it("never clears an earlier select", () => {
    const start: Selection = { year: "2020", make: "Tesla", model: "", partType: "" };
    const next = applyChange(ROWS, start, "model", "Model Y");
    expect(next.year).toBe("2020");
    expect(next.make).toBe("Tesla");
  });

  it("preserves a multi-type slug it cannot validate", () => {
    // "tailgates-trunks" spans two enum values and is resolved server-side,
    // so it isn't in the fit matrix. Dropping it would lose the category a
    // visitor arrived with from a landing-page tile.
    const start: Selection = { year: "", make: "", model: "", partType: "tailgates-trunks" };
    const next = applyChange(ROWS, start, "make", "Toyota", "tailgates-trunks");
    expect(next.partType).toBe("tailgates-trunks");
  });

  it("clears an unvalidatable part type when it is not the kept slug", () => {
    const start: Selection = { year: "", make: "", model: "", partType: "GRILLE" };
    const next = applyChange(ROWS, start, "make", "Toyota", "tailgates-trunks");
    expect(next.partType).toBe("");
  });
});
