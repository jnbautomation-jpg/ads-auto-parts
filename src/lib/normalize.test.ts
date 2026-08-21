import { describe, expect, it } from "vitest";
import { canonicalMake, canonicalModel, extractCapa, normalizeVehicle } from "./normalize";

// The dirty values below are taken verbatim from the Phase 2 spec's list of
// what is actually in the live database.
describe("canonicalMake", () => {
  it("merges VW into Volkswagen (spec 1.7)", () => {
    // These were two separate makes, splitting one manufacturer across two
    // filter entries.
    expect(canonicalMake("VW")).toBe("Volkswagen");
    expect(canonicalMake("vw")).toBe("Volkswagen");
    expect(canonicalMake("Volkswagen")).toBe("Volkswagen");
    expect(canonicalMake("VOLKSWAGEN")).toBe("Volkswagen");
  });

  it("folds shop abbreviations and misspellings", () => {
    expect(canonicalMake("CHEVY")).toBe("Chevrolet");
    expect(canonicalMake("HYUNDIA")).toBe("Hyundai");
  });

  it("preserves genuine acronym makes", () => {
    expect(canonicalMake("GMC")).toBe("GMC");
    expect(canonicalMake("RAM")).toBe("RAM");
  });

  it("title-cases an unknown make rather than dropping it", () => {
    expect(canonicalMake("SUBARU")).toBe("Subaru");
  });

  it("is idempotent", () => {
    for (const raw of ["VW", "CHEVY", "GMC", "SUBARU"]) {
      expect(canonicalMake(canonicalMake(raw))).toBe(canonicalMake(raw));
    }
  });
});

describe("extractCapa", () => {
  it("pulls CAPA out of every spelling seen in the data (spec 1.8)", () => {
    // "Camry (capa)", "Camry Capa", "Camry(capa)" were three separate models.
    for (const raw of ["Camry (capa)", "Camry Capa", "Camry(capa)", "CAMRY CAPA"]) {
      const result = extractCapa(raw);
      expect(result.capa, `${raw} should be detected as CAPA`).toBe(true);
      expect(result.model.toLowerCase()).toBe("camry");
    }
  });

  it("leaves a model without CAPA untouched", () => {
    expect(extractCapa("Camry")).toEqual({ model: "Camry", capa: false });
  });

  it("does not match CAPA inside a longer word", () => {
    expect(extractCapa("Capacity").capa).toBe(false);
  });
});

describe("canonicalModel", () => {
  it("collapses the three Cx-5 spellings into one", () => {
    // Spec 1.6 calls this out by name.
    for (const raw of ["Cx-5", "CX5", "cx 5"]) {
      expect(canonicalModel(raw)).toBe("CX-5");
    }
  });

  it("fixes the misspellings found in the live data", () => {
    expect(canonicalModel("Corrolla")).toBe("Corolla");
    expect(canonicalModel("Oddesey")).toBe("Odyssey");
    expect(canonicalModel("Challanger")).toBe("Challenger");
    expect(canonicalModel("Tuscon")).toBe("Tucson");
  });

  it("repairs unbalanced brackets rather than leaving punctuation debris", () => {
    // Real values: "Charger (capa", "B)(capa)", "Cpe)", "Civic (h".
    expect(canonicalModel("Charger (capa")).toBe("Charger");
    expect(canonicalModel("Cpe)")).toBe("Cpe");
    expect(canonicalModel("Civic (h")).toBe("Civic");
    expect(canonicalModel("Challanger(single Scoop)")).toBe("Challenger (Single Scoop)");
  });

  it("strips a CAPA marker out of the model name", () => {
    expect(canonicalModel("Camry (capa)")).toBe("Camry");
    expect(canonicalModel("Camry Capa")).toBe("Camry");
  });

  it("keeps genuine nameplate casing that title-casing would break", () => {
    expect(canonicalModel("crv")).toBe("CR-V");
    expect(canonicalModel("hr-v")).toBe("HR-V");
    expect(canonicalModel("c-hr")).toBe("C-HR");
    expect(canonicalModel("4runner")).toBe("4Runner");
    expect(canonicalModel("rav 4")).toBe("RAV4");
    expect(canonicalModel("f 150")).toBe("F-150");
  });

  it("normalizes casing for ordinary models", () => {
    expect(canonicalModel("CAMRY")).toBe("Camry");
    expect(canonicalModel("santa fe")).toBe("Santa Fe");
    expect(canonicalModel("  grand   cherokee ")).toBe("Grand Cherokee");
  });

  it("returns an empty string for empty input", () => {
    expect(canonicalModel("")).toBe("");
    expect(canonicalModel("   ")).toBe("");
  });

  it("is idempotent — safe to run repeatedly over the same rows", () => {
    // The repair script and the importer both apply this; running it twice
    // must not keep changing the value.
    const inputs = [
      "Cx-5",
      "Corrolla",
      "Camry (capa)",
      "Charger (capa",
      "crv",
      "4runner",
      "Rogue Sport",
      "Model Y",
    ];
    for (const raw of inputs) {
      const once = canonicalModel(raw);
      expect(canonicalModel(once), `${raw} -> ${once} was not stable`).toBe(once);
    }
  });
});

describe("normalizeVehicle", () => {
  it("normalizes make and model and reports embedded CAPA together", () => {
    expect(normalizeVehicle("VW", "jetta")).toEqual({
      make: "Volkswagen",
      model: "Jetta",
      capa: false,
    });
    expect(normalizeVehicle("toyota", "Camry (capa)")).toEqual({
      make: "Toyota",
      model: "Camry",
      capa: true,
    });
  });
});
