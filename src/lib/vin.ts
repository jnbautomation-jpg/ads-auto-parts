// VIN decoding — Phase 2B "AI VIN lookup".
//
// Deliberately NOT an LLM call. A VIN is a checksummed, government-standardised
// identifier, and NHTSA (the US federal vehicle safety agency) publishes a free
// decoder with no API key. That is faster, free, authoritative, and — crucially —
// cannot hallucinate. The spec's goal here is to CUT the return rate from
// wrong-part orders; a model that occasionally invents a trim would push it the
// wrong way.
//
// This file holds the pure parts (validation, check digit, catalog matching);
// decodeVin() performs the network call.

/** Characters a VIN may contain. I, O and Q are excluded to avoid 1/0 confusion. */
const VIN_ALPHABET = /^[A-HJ-NPR-Z0-9]{17}$/;

export function normalizeVin(raw: string): string {
  return raw.replace(/[\s-]/g, "").toUpperCase();
}

export function hasValidVinFormat(vin: string): boolean {
  return VIN_ALPHABET.test(vin);
}

// ISO 3779 transliteration for the check-digit calculation.
const TRANSLITERATION: Record<string, number> = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8,
  J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9,
  S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
};
const WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

/**
 * Validates the 9th character, which is a checksum over the other 16.
 *
 * Worth doing client-side before any network call: it catches a mistyped or
 * misread VIN immediately instead of returning "vehicle not found", which a
 * customer reads as "you don't stock my car".
 *
 * Note this is only mandatory for North American vehicles. A VIN that fails
 * the check digit is reported as suspicious, not rejected outright.
 */
export function hasValidVinCheckDigit(vin: string): boolean {
  if (!hasValidVinFormat(vin)) return false;

  let sum = 0;
  for (let i = 0; i < 17; i++) {
    const char = vin[i];
    const value = /\d/.test(char) ? Number(char) : TRANSLITERATION[char];
    if (value === undefined) return false;
    sum += value * WEIGHTS[i];
  }

  const remainder = sum % 11;
  const expected = remainder === 10 ? "X" : String(remainder);
  return vin[8] === expected;
}

export type VinValidation =
  | { ok: true; vin: string; checkDigitValid: boolean }
  | { ok: false; error: string };

export function validateVin(raw: string): VinValidation {
  const vin = normalizeVin(raw);
  if (!vin) return { ok: false, error: "Enter a VIN." };
  if (vin.length !== 17) {
    return { ok: false, error: `A VIN is 17 characters — that one has ${vin.length}.` };
  }
  if (!hasValidVinFormat(vin)) {
    // The excluded letters are the most common transcription mistake.
    return {
      ok: false,
      error: "That VIN contains a letter VINs never use (I, O or Q). Check for a 1 or 0.",
    };
  }
  return { ok: true, vin, checkDigitValid: hasValidVinCheckDigit(vin) };
}

export type DecodedVehicle = {
  vin: string;
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  bodyClass: string | null;
  /**
   * NHTSA's own verdict. "0" means decoded clean; anything else means it
   * decoded with reservations — most often "1", the check digit failing.
   * Surfaced so the UI can say "we think this is your car, confirm it"
   * rather than presenting a guess as fact.
   */
  errorCode: string | null;
  errorText: string | null;
};

type NhtsaRow = Record<string, string>;

/** Blank-ish values NHTSA returns for fields it has no data for. */
function clean(value: string | undefined): string | null {
  const v = (value ?? "").trim();
  if (!v || v === "Not Applicable" || v === "0") return null;
  return v;
}

/**
 * Decodes a VIN via NHTSA's free vPIC API. No key, no cost, no rate limit
 * published — but network failures are normal, so callers must handle null.
 */
export async function decodeVin(vin: string, signal?: AbortSignal): Promise<DecodedVehicle | null> {
  const url = `https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/${encodeURIComponent(vin)}?format=json`;

  const res = await fetch(url, {
    signal,
    // Decodes for a given VIN never change, so this is safe to cache hard.
    next: { revalidate: 60 * 60 * 24 * 30 },
  });
  if (!res.ok) return null;

  const json = (await res.json()) as { Results?: NhtsaRow[] };
  const row = json.Results?.[0];
  if (!row) return null;

  const year = clean(row.ModelYear);

  return {
    vin,
    // NOT clean(): "0" is a meaningful value here (decoded clean), and
    // clean() treats "0" as empty. Trimmed directly instead.
    errorCode: (row.ErrorCode ?? "").trim() || null,
    errorText: (row.ErrorText ?? "").trim() || null,
    year: year ? Number(year) : null,
    make: clean(row.Make),
    model: clean(row.Model),
    // Trim matters — the spec notes GT line vs sport line take different
    // parts. NHTSA fills Trim for some manufacturers and Series for others.
    trim: clean(row.Trim) ?? clean(row.Series),
    bodyClass: clean(row.BodyClass),
  };
}

/**
 * Title-cases NHTSA's SHOUTED make ("TESLA" -> "Tesla") so it can be compared
 * with the catalog, which stores canonical casing.
 */
export function tidyMake(make: string | null): string | null {
  if (!make) return null;
  return make
    .toLowerCase()
    .replace(/\b[a-z]/g, (c) => c.toUpperCase());
}
