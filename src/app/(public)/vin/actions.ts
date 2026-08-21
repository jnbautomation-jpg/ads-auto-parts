"use server";

import { prisma } from "@/lib/prisma";
import { ORG_SLUG } from "@/lib/site";
import { decodeVin, tidyMake, validateVin, type DecodedVehicle } from "@/lib/vin";
import { canonicalMake, canonicalModel } from "@/lib/normalize";

export type VinLookupState = {
  error?: string;
  warning?: string;
  vehicle?: DecodedVehicle & { catalogMake: string | null; catalogModel: string | null };
  matchCount?: number;
  catalogHref?: string;
};

export async function lookupVin(
  _prev: VinLookupState,
  formData: FormData,
): Promise<VinLookupState> {
  const raw = String(formData.get("vin") || "");

  // Validated before any network call — a mistyped VIN is caught here rather
  // than coming back as "vehicle not found", which reads to a customer as
  // "you don't stock my car".
  const validation = validateVin(raw);
  if (!validation.ok) return { error: validation.error };

  let decoded: DecodedVehicle | null = null;
  try {
    decoded = await decodeVin(validation.vin);
  } catch {
    return { error: "We couldn't reach the VIN service just now — try again, or call us." };
  }
  if (!decoded || (!decoded.make && !decoded.model)) {
    return { error: "We couldn't decode that VIN. Double-check it, or call and we'll look it up." };
  }

  // NHTSA gives makes in caps and its own model spellings; the catalog stores
  // canonical values. Both sides go through the same normalizer so "TESLA" and
  // "Tesla" don't miss each other.
  const catalogMake = decoded.make ? canonicalMake(tidyMake(decoded.make) ?? decoded.make) : null;
  const catalogModel = decoded.model ? canonicalModel(decoded.model) : null;

  let matchCount = 0;
  let catalogHref: string | undefined;

  const organization = await prisma.organization.findUnique({
    where: { slug: ORG_SLUG },
    select: { id: true },
  });

  if (organization && catalogMake) {
    // Match on make + year, and on model only when we have one — a fit whose
    // model spelling differs shouldn't hide the whole vehicle.
    matchCount = await prisma.product.count({
      where: {
        organizationId: organization.id,
        isPublic: true,
        vehicleFits: {
          some: {
            make: { equals: catalogMake, mode: "insensitive" },
            ...(catalogModel ? { model: { contains: catalogModel, mode: "insensitive" } } : {}),
            ...(decoded.year
              ? { yearStart: { lte: decoded.year }, yearEnd: { gte: decoded.year } }
              : {}),
          },
        },
      },
    });

    const params = new URLSearchParams();
    if (decoded.year) params.set("year", String(decoded.year));
    params.set("make", catalogMake);
    if (catalogModel) params.set("model", catalogModel);
    catalogHref = `/catalog?${params.toString()}`;
  }

  return {
    vehicle: { ...decoded, catalogMake, catalogModel },
    matchCount,
    catalogHref,
    // The spec says to always show the matched vehicle for confirmation
    // before adding to a cart. A failed check digit makes that doubly true.
    warning: !validation.checkDigitValid
      ? "That VIN's check digit doesn't add up, so this match may be wrong — please confirm the vehicle below."
      : undefined,
  };
}
