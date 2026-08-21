import { describe, expect, it } from "vitest";
import {
  buildColumnIndex,
  findHeaderRowIndex,
  matchPartTypeLoose,
  missingRequiredColumns,
  parseInventorySheet,
  resolveTabPartType,
} from "./inventory-import";

// The client's real workbooks look like this: a title row, a header row, make
// names as standalone section rows, and the year range glued into the MODEL
// cell. These tests encode the shapes actually seen in their files — a
// regression here silently corrupts inventory, which is far worse than a
// visible crash.
const HEADER = ["MODEL", "SIDE", "QTY", "COST", "SHOP", "LOCATION"];

/** A make section row: one recognized make token, rest blank. */
function makeRow(make: string): string[] {
  return [make, "", "", "", "", ""];
}

function dataRow(
  model: string,
  side = "",
  qty = "1",
  cost = "100",
  shop = "200",
  location = "",
): string[] {
  return [model, side, qty, cost, shop, location];
}

describe("column index", () => {
  it("maps headers case- and whitespace-insensitively", () => {
    const index = buildColumnIndex([" Model ", "QTY", "Cost"]);
    expect(index).toEqual({ model: 0, qty: 1, cost: 2 });
  });

  it("treats a SELL column as the SHOP price column", () => {
    // The hinges tab labels its sell-price column "sell".
    const index = buildColumnIndex(["MODEL", "QTY", "COST", "SELL"]);
    expect(index.shop).toBe(3);
    expect(missingRequiredColumns(index)).toEqual([]);
  });

  it("reports which required columns are missing", () => {
    expect(missingRequiredColumns(buildColumnIndex(["MODEL", "QTY"]))).toEqual(["cost", "shop"]);
  });

  it("ignores blank header cells", () => {
    expect(buildColumnIndex(["MODEL", "", "QTY"])).toEqual({ model: 0, qty: 2 });
  });
});

describe("findHeaderRowIndex", () => {
  it("finds the header when a title row sits above it", () => {
    const rows = [["DOORS", "", "", "", "", ""], HEADER, dataRow("18-24 Equinox")];
    expect(findHeaderRowIndex(rows)).toBe(1);
  });

  it("skips a blank spacer row between title and header", () => {
    const rows = [["DOORS"], [], HEADER];
    expect(findHeaderRowIndex(rows)).toBe(2);
  });

  it("returns null when no row looks like a header", () => {
    expect(findHeaderRowIndex([["a", "b"], ["c", "d"]])).toBeNull();
  });
});

describe("part type resolution", () => {
  it("resolves decorated tab names", () => {
    expect(resolveTabPartType("DOOR INV")).toBe("DOOR");
    expect(resolveTabPartType("TRUNK ETC")).toBe("TRUNK");
    expect(resolveTabPartType("REAR BODY PANELS")).toBe("REAR_BODY_PANEL");
    expect(resolveTabPartType("hinges")).toBe("HINGE");
    expect(resolveTabPartType("RADIATOR SUPPORT")).toBe("RADIATOR_SUPPORT");
  });

  it("strips a file extension and duplicate-download suffix", () => {
    expect(resolveTabPartType("bumpers (1).xlsx")).toBe("BUMPER");
  });

  it("accepts the GRILL spelling as GRILLE", () => {
    expect(matchPartTypeLoose("GRILL")).toBe("GRILLE");
  });

  it("returns null for unrecognized text", () => {
    expect(matchPartTypeLoose("SPOILERS")).toBeNull();
    expect(matchPartTypeLoose("")).toBeNull();
  });
});

describe("parseInventorySheet — happy path", () => {
  it("carries the make forward from a section row onto following rows", () => {
    const result = parseInventorySheet(
      [makeRow("CHEVY"), dataRow("18-24 EQUINOX", "LF", "3", "100", "200", "a1")],
      HEADER,
      [],
      "DOOR",
    );

    expect(result.failed).toEqual([]);
    expect(result.flagged).toEqual([]);
    expect(result.parsed).toHaveLength(1);
    expect(result.parsed[0]).toMatchObject({
      make: "Chevrolet",
      model: "Equinox",
      yearStart: 2018,
      yearEnd: 2024,
      position: "FRONT_LEFT",
      partType: "DOOR",
      quantity: 3,
      cost: 100,
      price: 200,
      binLocation: "A1",
    });
  });

  it("reads a part type from a lone title cell in any column", () => {
    const result = parseInventorySheet(
      [makeRow("KIA"), dataRow("20-23 K5", "", "1")],
      HEADER,
      ["", "", "DOORS", "", "", ""],
    );
    expect(result.detectedPartTypes).toEqual(["DOOR"]);
    expect(result.parsed[0].partType).toBe("DOOR");
  });

  it("lets a mid-sheet part-type section row switch the running type", () => {
    const result = parseInventorySheet(
      [
        makeRow("KIA"),
        dataRow("20-23 K5", "", "1"),
        ["LIFTGATES", "", "", "", "", ""],
        dataRow("18-22 SPORTAGE", "", "1"),
      ],
      HEADER,
      [],
      "TRUNK",
    );
    expect(result.parsed.map((r) => r.partType)).toEqual(["TRUNK", "LIFTGATE"]);
  });

  it("lets a per-row TYPE column override the tab fallback for that row only", () => {
    const header = [...HEADER, "TYPE"];
    const result = parseInventorySheet(
      [
        [...makeRow("KIA"), ""],
        [...dataRow("20-23 K5", "", "1"), "LIFTGATE"],
        [...dataRow("18-22 SPORTAGE", "", "1"), ""],
      ],
      header,
      [],
      "TRUNK",
    );
    expect(result.parsed.map((r) => r.partType)).toEqual(["LIFTGATE", "TRUNK"]);
  });
});

describe("parseInventorySheet — year and model normalization", () => {
  it("expands two-digit years into the 2000s", () => {
    const result = parseInventorySheet([makeRow("KIA"), dataRow("18-24 K5")], HEADER, [], "DOOR");
    expect(result.parsed[0]).toMatchObject({ yearStart: 2018, yearEnd: 2024 });
  });

  it("accepts a trailing year range", () => {
    const result = parseInventorySheet([makeRow("NISSAN"), dataRow("ALTIMA 13 - 18")], HEADER, [], "DOOR");
    expect(result.parsed[0]).toMatchObject({ model: "Altima", yearStart: 2013, yearEnd: 2018 });
  });

  it("splits a year glued onto the model with no space", () => {
    const result = parseInventorySheet(
      [makeRow("NISSAN"), dataRow("17 - 22ROGUE SPORT")],
      HEADER,
      [],
      "DOOR",
    );
    expect(result.parsed[0]).toMatchObject({ model: "Rogue Sport", yearStart: 2017, yearEnd: 2022 });
  });

  it("canonicalizes nameplates that appear with inconsistent spacing", () => {
    const result = parseInventorySheet(
      [
        makeRow("TOYOTA"),
        dataRow("19 -24RAV 4"),
        makeRow("HONDA"),
        dataRow("18-22 CRV"),
        makeRow("FORD"),
        dataRow("18-24 F 150"),
        makeRow("HYUNDAI"),
        dataRow("16-20 TUSCON"),
      ],
      HEADER,
      [],
      "DOOR",
    );
    expect(result.parsed.map((r) => r.model)).toEqual(["RAV4", "CR-V", "F-150", "Tucson"]);
  });

  it("strips a redundant make prefix already implied by the section row", () => {
    const result = parseInventorySheet([makeRow("FORD"), dataRow("FORD F 150 18-24")], HEADER, [], "DOOR");
    expect(result.parsed[0]).toMatchObject({ make: "Ford", model: "F-150" });
  });

  it("imports a VW section as Volkswagen, not a separate make (spec 1.7)", () => {
    const result = parseInventorySheet(
      [makeRow("VW"), dataRow("19-24 JETTA"), makeRow("VOLKSWAGEN"), dataRow("18-22 TIGUAN")],
      HEADER,
      [],
      "DOOR",
    );
    // Both section spellings must land on one canonical make, or the catalog
    // filter shows the same manufacturer twice.
    expect(result.parsed.map((r) => r.make)).toEqual(["Volkswagen", "Volkswagen"]);
  });

  it("normalizes the misspelled HYUNDIA section header", () => {
    const result = parseInventorySheet([makeRow("HYUNDIA"), dataRow("18-24 ELANTRA")], HEADER, [], "DOOR");
    expect(result.parsed[0].make).toBe("Hyundai");
  });
});

describe("parseInventorySheet — multi-vehicle rows", () => {
  it("attaches a second vehicle when the quantity is unambiguous", () => {
    const result = parseInventorySheet(
      [makeRow("CHEVY"), dataRow("18-24 EQUINOX/GMC TERRAIN", "", "4")],
      HEADER,
      [],
      "DOOR",
    );
    expect(result.flagged).toEqual([]);
    expect(result.parsed).toHaveLength(1);
    expect(result.parsed[0]).toMatchObject({
      make: "Chevrolet",
      model: "Equinox",
      quantity: 4,
      additionalVehicles: [{ make: "GMC", model: "Terrain" }],
    });
  });

  it("inherits the section make when the second vehicle names no make", () => {
    const result = parseInventorySheet(
      [makeRow("KIA"), dataRow("20-23 K5/OPTIMA", "", "2")],
      HEADER,
      [],
      "DOOR",
    );
    expect(result.parsed[0].additionalVehicles).toEqual([{ make: "Kia", model: "Optima" }]);
  });

  it("flags rather than splits when the quantity cannot be divided", () => {
    const result = parseInventorySheet(
      [makeRow("CHEVY"), dataRow("18-24 EQUINOX/GMC TERRAIN", "", "out")],
      HEADER,
      [],
      "DOOR",
    );
    expect(result.parsed).toEqual([]);
    expect(result.flagged).toHaveLength(1);
    expect(result.flagged[0].vehicles).toHaveLength(2);
    expect(result.flagged[0].reason).toMatch(/doesn't say how it splits/);
  });

  it("does not treat a body-style abbreviation as a vehicle separator", () => {
    // "H/B" is hatchback, not a second vehicle — this row must still parse.
    const result = parseInventorySheet(
      [makeRow("HONDA"), dataRow("HD CVIC H/B 2022-2026")],
      HEADER,
      [],
      "DOOR",
    );
    expect(result.failed).toEqual([]);
    expect(result.parsed).toHaveLength(1);
    expect(result.parsed[0]).toMatchObject({ yearStart: 2022, yearEnd: 2026 });
    expect(result.parsed[0].additionalVehicles).toBeUndefined();
  });
});

describe("parseInventorySheet — position vocabulary", () => {
  it("maps door side codes to front/rear left/right", () => {
    const result = parseInventorySheet(
      [
        makeRow("KIA"),
        dataRow("20-23 K5", "LF"),
        dataRow("20-23 K5", "RF"),
        dataRow("20-23 K5", "LR"),
        dataRow("20-23 K5", "RR"),
      ],
      HEADER,
      [],
      "DOOR",
    );
    expect(result.parsed.map((r) => r.position)).toEqual([
      "FRONT_LEFT",
      "FRONT_RIGHT",
      "REAR_LEFT",
      "REAR_RIGHT",
    ]);
  });

  it("treats fenders and quarter panels as always front (client-confirmed)", () => {
    const fender = parseInventorySheet(
      [makeRow("KIA"), dataRow("20-23 K5", "LH"), dataRow("20-23 K5", "RH")],
      HEADER,
      [],
      "FENDER",
    );
    expect(fender.parsed.map((r) => r.position)).toEqual(["FRONT_LEFT", "FRONT_RIGHT"]);

    const quarter = parseInventorySheet(
      [makeRow("KIA"), dataRow("20-23 K5", "LH")],
      HEADER,
      [],
      "QUARTER_PANEL",
    );
    expect(quarter.parsed[0].position).toBe("FRONT_LEFT");
  });

  it("flags a side value that is not exact vocabulary rather than guessing", () => {
    const result = parseInventorySheet(
      [makeRow("KIA"), dataRow("20-23 K5", "frony")],
      HEADER,
      [],
      "DOOR",
    );
    expect(result.parsed).toEqual([]);
    expect(result.flagged[0].reason).toMatch(/Unrecognized SIDE/);
    expect(result.flagged[0].position).toBeNull();
  });

  it("never substring-matches a misaligned description cell", () => {
    // Contains "FR" but must not resolve to FRONT_RIGHT.
    const result = parseInventorySheet(
      [makeRow("HONDA"), dataRow("18-22 CRV", "COVER, FR (W/O SNSR HO)")],
      HEADER,
      [],
      "BUMPER",
    );
    expect(result.parsed).toEqual([]);
    expect(result.flagged[0].position).toBeNull();
  });

  it("flags a side value on a part type that carries no position", () => {
    const result = parseInventorySheet([makeRow("KIA"), dataRow("20-23 K5", "LF")], HEADER, [], "HOOD");
    expect(result.flagged[0].reason).toMatch(/not a known position for HOOD/);
  });

  it("keeps the base position but flags an upper/lower qualifier", () => {
    const result = parseInventorySheet(
      [makeRow("KIA"), dataRow("20-23 K5", "FRONT (upper)")],
      HEADER,
      [],
      "BUMPER",
    );
    expect(result.flagged).toHaveLength(1);
    expect(result.flagged[0].position).toBe("FRONT");
    expect(result.flagged[0].reason).toMatch(/UPPER qualifier/);
  });
});

describe("parseInventorySheet — price and quantity edge cases", () => {
  it("uses the first number of a dual price and records the second as a note", () => {
    const result = parseInventorySheet(
      [makeRow("KIA"), dataRow("20-23 K5", "", "1", "100", "399/375")],
      HEADER,
      [],
      "DOOR",
    );
    expect(result.flagged).toEqual([]);
    expect(result.parsed[0].price).toBe(399);
    expect(result.parsed[0].note).toMatch(/Alternate price "375"/);
  });

  it("strips currency symbols and thousands separators", () => {
    const result = parseInventorySheet(
      [makeRow("KIA"), dataRow("20-23 K5", "", "1", "$1,200", "$1,800")],
      HEADER,
      [],
      "DOOR",
    );
    expect(result.parsed[0]).toMatchObject({ cost: 1200, price: 1800 });
  });

  it("always flags a parenthetical annotation on a price", () => {
    const result = parseInventorySheet(
      [makeRow("KIA"), dataRow("20-23 K5", "", "1", "100", "346 (not in stock)")],
      HEADER,
      [],
      "DOOR",
    );
    expect(result.parsed).toEqual([]);
    expect(result.flagged[0].price).toBe(346);
    expect(result.flagged[0].reason).toMatch(/Source noted "not in stock"/);
  });

  it("flags a missing price instead of committing a zero", () => {
    const result = parseInventorySheet(
      [makeRow("KIA"), dataRow("20-23 K5", "", "1", "", "200")],
      HEADER,
      [],
      "DOOR",
    );
    expect(result.parsed).toEqual([]);
    expect(result.flagged[0].reason).toMatch(/Missing or invalid COST/);
  });

  it("treats non-numeric quantity text as zero but flags it", () => {
    const result = parseInventorySheet(
      [makeRow("KIA"), dataRow("20-23 K5", "", "out")],
      HEADER,
      [],
      "DOOR",
    );
    expect(result.flagged[0].quantity).toBe(0);
    expect(result.flagged[0].reason).toMatch(/isn't a number/);
  });

  it("flags a bare single year with no explicit range", () => {
    const result = parseInventorySheet([makeRow("TOYOTA"), dataRow("2025 CAMRY")], HEADER, [], "DOOR");
    expect(result.parsed).toEqual([]);
    expect(result.flagged[0]).toMatchObject({ yearStart: 2025, yearEnd: 2025 });
    expect(result.flagged[0].reason).toMatch(/Single year/);
  });
});

describe("parseInventorySheet — failures and conflicts", () => {
  it("fails a row that appears before any make section row", () => {
    const result = parseInventorySheet([dataRow("18-24 EQUINOX")], HEADER, [], "DOOR");
    expect(result.parsed).toEqual([]);
    expect(result.failed[0].reason).toMatch(/No make section row/);
  });

  it("fails a row whose MODEL cell is empty", () => {
    const result = parseInventorySheet([makeRow("KIA"), dataRow("", "LF", "2")], HEADER, [], "DOOR");
    expect(result.failed[0].reason).toMatch(/MODEL cell is empty/);
  });

  it("fails a row with no findable year range", () => {
    const result = parseInventorySheet([makeRow("KIA"), dataRow("SOME PART")], HEADER, [], "DOOR");
    expect(result.failed[0].reason).toMatch(/Could not find a year range/);
  });

  it("fails a row when no part type can be resolved at all", () => {
    const result = parseInventorySheet([makeRow("KIA"), dataRow("20-23 K5")], HEADER, [], null);
    expect(result.failed[0].reason).toMatch(/No part-type section row/);
  });

  it("skips fully blank rows without failing them", () => {
    const result = parseInventorySheet(
      [makeRow("KIA"), ["", "", "", "", "", ""], dataRow("20-23 K5")],
      HEADER,
      [],
      "DOOR",
    );
    expect(result.failed).toEqual([]);
    expect(result.parsed).toHaveLength(1);
  });

  it("flags an unrecognized TYPE value but keeps the fallback", () => {
    const header = [...HEADER, "TYPE"];
    const result = parseInventorySheet(
      [
        [...makeRow("KIA"), ""],
        [...dataRow("20-23 K5"), "SPOILER"],
      ],
      header,
      [],
      "DOOR",
    );
    expect(result.flagged[0].partType).toBe("DOOR");
    expect(result.flagged[0].reason).toMatch(/Unrecognized TYPE "SPOILER"/);
  });

  it("flags a partslink description that contradicts the resolved part type", () => {
    const header = [...HEADER, "Partslink number"];
    const result = parseInventorySheet(
      [
        [...makeRow("KIA"), ""],
        [...dataRow("20-23 K5"), "FRONT BUMPER COVER"],
      ],
      header,
      [],
      "DOOR",
    );
    expect(result.flagged[0].reason).toMatch(/needs manual review/);
  });

  it("numbers rows from the given data start row", () => {
    const result = parseInventorySheet(
      [makeRow("KIA"), dataRow("20-23 K5")],
      HEADER,
      [],
      "DOOR",
      3,
    );
    // Row 3 is the make section row, so the data row is Excel row 4.
    expect(result.parsed[0].rowNum).toBe(4);
  });
});
