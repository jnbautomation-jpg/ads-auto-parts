import { describe, expect, it } from "vitest";
import { fitmentRows, hasFitmentDetail } from "./fitment";

describe("fitmentRows", () => {
  it("omits a field that was never recorded", () => {
    // The governing rule: null means unrecorded, not "no".
    expect(fitmentRows({})).toEqual([]);
    expect(hasFitmentDetail({})).toBe(false);
  });

  it("distinguishes 'not cut' from 'unrecorded'", () => {
    // Telling a shop a door has no mirror hole when nobody checked is worse
    // than telling them nothing — they order on it and it comes back.
    const unknown = fitmentRows({ hasMirrorHole: null });
    expect(unknown).toEqual([]);

    const known = fitmentRows({ hasMirrorHole: false });
    expect(known).toHaveLength(1);
    expect(known[0].value).toBe("Not cut");
  });

  it("renders a pre-cut hole as pre-cut", () => {
    expect(fitmentRows({ hasHandleHole: true })[0]).toEqual({
      label: "Handle hole",
      value: "Pre-cut",
    });
  });

  it("explains shell vs skin in words a shop uses", () => {
    // Ordering the wrong one is a wasted trip.
    expect(fitmentRows({ construction: "SHELL" })[0].value).toBe("Full shell");
    expect(fitmentRows({ construction: "SKIN" })[0].value).toBe("Skin only");
  });

  it("shows material, which changes how the panel is welded", () => {
    expect(fitmentRows({ material: "ALUMINUM" })[0].value).toBe("Aluminum");
    expect(fitmentRows({ material: "STEEL" })[0].value).toBe("Steel");
  });

  it("shows every paint prep state", () => {
    expect(fitmentRows({ paintPrep: "BARE" })[0].value).toBe("Bare");
    expect(fitmentRows({ paintPrep: "PRIMED" })[0].value).toBe("Primed");
    expect(fitmentRows({ paintPrep: "EDP_COATED" })[0].value).toBe("EDP coated");
  });

  it("ignores an OEM number that is only whitespace", () => {
    expect(fitmentRows({ oemPartNumber: "   " })).toEqual([]);
    expect(fitmentRows({ oemPartNumber: " 12345 " })[0].value).toBe("12345");
  });

  it("lists everything known, in a stable order", () => {
    const rows = fitmentRows({
      oemPartNumber: "68170",
      construction: "SHELL",
      material: "STEEL",
      paintPrep: "PRIMED",
      hasMirrorHole: true,
      hasHandleHole: false,
    });
    expect(rows.map((r) => r.label)).toEqual([
      "OEM reference",
      "Construction",
      "Material",
      "Paint prep",
      "Mirror hole",
      "Handle hole",
    ]);
    expect(hasFitmentDetail({ oemPartNumber: "68170" })).toBe(true);
  });

  it("translates into Spanish", () => {
    const rows = fitmentRows({ construction: "SKIN", hasMirrorHole: false }, "es");
    expect(rows[0]).toEqual({ label: "Construcción", value: "Solo lámina exterior" });
    expect(rows[1].value).toBe("Sin cortar");
  });
});
