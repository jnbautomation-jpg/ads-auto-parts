"use server";

import { extractText, getDocumentProxy } from "unpdf";
import { prisma } from "@/lib/prisma";
import { ORG_SLUG } from "@/lib/site";
import { ESTIMATE_LIMITS, parseEstimateText } from "@/lib/estimate";
import { decodeVin, tidyMake, validateVin } from "@/lib/vin";
import { canonicalMake, canonicalModel } from "@/lib/normalize";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import type { PartType } from "@/generated/prisma/enums";

export type EstimateMatch = {
  id: string;
  sku: string;
  label: string;
  partType: string;
  price: string;
  availability: string;
};

export type EstimateState = {
  error?: string;
  result?: {
    vehicle: { year: number | null; make: string | null; model: string | null; trim: string | null } | null;
    vin: string | null;
    vinWarning: string | null;
    partTypes: string[];
    matches: EstimateMatch[];
    unmatchedPartTypes: string[];
    scanned: boolean;
  };
};

export async function analyzeEstimate(
  _prev: EstimateState,
  formData: FormData,
): Promise<EstimateState> {
  // The page that submitted says which language to answer in. Anything else
  // falls back to English rather than throwing — a tampered field must not be
  // able to break an upload.
  const submitted = String(formData.get("locale") || "");
  const locale = isLocale(submitted) ? submitted : DEFAULT_LOCALE;
  const dict = getDictionary(locale);

  const file = formData.get("estimate");
  if (!(file instanceof File) || file.size === 0) {
    return { error: dict.estimate.chooseFile };
  }
  if (file.size > ESTIMATE_LIMITS.maxBytes) {
    return { error: dict.estimate.tooLarge };
  }
  if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
    return { error: dict.estimate.notPdf };
  }

  // Parsed in memory and never written anywhere. An insurance estimate carries
  // the customer's name, address and claim number; the shop only needs the
  // vehicle and the parts.
  let text = "";
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const pdf = await getDocumentProxy(bytes);
    const extracted = await extractText(pdf, { mergePages: true });
    text = String(extracted.text ?? "");
  } catch {
    return { error: dict.estimate.unreadable };
  }

  const parsed = parseEstimateText(text);

  if (parsed.looksScanned) {
    return {
      result: {
        vehicle: null,
        vin: null,
        vinWarning: null,
        partTypes: [],
        matches: [],
        unmatchedPartTypes: [],
        scanned: true,
      },
    };
  }

  // Decode the VIN for the exact vehicle — trim included, which is what makes
  // the match trustworthy.
  let decoded = null;
  let vinWarning: string | null = null;
  if (parsed.vin) {
    const check = validateVin(parsed.vin);
    if (check.ok && !parsed.vinCheckDigitValid) {
      vinWarning = dict.estimate.vinCheckDigit;
    }
    try {
      decoded = await decodeVin(parsed.vin);
    } catch {
      decoded = null;
    }
  }
  const organization = await prisma.organization.findUnique({
    where: { slug: ORG_SLUG },
    select: { id: true },
  });

  const make = decoded?.make ? canonicalMake(tidyMake(decoded.make) ?? "") : null;
  const model = decoded?.model ? canonicalModel(decoded.model) : null;
  const year = decoded?.year ?? null;

  let matches: EstimateMatch[] = [];
  const matchedTypes = new Set<string>();

  if (organization && make && model && parsed.partTypes.length > 0) {
    const products = await prisma.product.findMany({
      where: {
        organizationId: organization.id,
        isPublic: true,
        quantity: { gt: 0 },
        partType: { in: parsed.partTypes as PartType[] },
        vehicleFits: {
          some: {
            make: { equals: make, mode: "insensitive" },
            model: { contains: model, mode: "insensitive" },
            ...(year ? { yearStart: { lte: year }, yearEnd: { gte: year } } : {}),
          },
        },
      },
      select: {
        id: true,
        sku: true,
        partType: true,
        position: true,
        make: true,
        model: true,
        yearStart: true,
        yearEnd: true,
        retailPrice: true,
        quantity: true,
        reorderPoint: true,
      },
      take: 24,
    });

    const { formatFit, formatMoneyIn, formatPartTypeIn, formatPositionIn, getAvailabilityIn } =
      await import("@/lib/format");

    matches = products.map((p) => {
      matchedTypes.add(p.partType);
      return {
        id: p.id,
        sku: p.sku,
        label: `${formatFit(p.make, p.model, p.yearStart, p.yearEnd)} — ${formatPartTypeIn(
          p.partType,
          locale,
        )}${p.position ? ` (${formatPositionIn(p.position, locale)})` : ""}`,
        partType: formatPartTypeIn(p.partType, locale),
        // Retail price only — `productSelectFor` is not used here, so the
        // wholesale column is deliberately never selected above.
        price: formatMoneyIn(p.retailPrice.toString(), locale),
        availability: getAvailabilityIn(p.quantity, p.reorderPoint, locale).label,
      };
    });
  }

  const { formatPartTypeIn } = await import("@/lib/format");

  return {
    result: {
      vehicle: decoded
        ? { year, make, model, trim: decoded.trim }
        : null,
      vin: parsed.vin,
      vinWarning,
      partTypes: parsed.partTypes.map((t) => formatPartTypeIn(t, locale)),
      matches,
      // Named on the estimate but not in stock for this vehicle — the shop
      // should see these rather than assume we quoted everything.
      unmatchedPartTypes: parsed.partTypes
        .filter((t) => !matchedTypes.has(t))
        .map((t) => formatPartTypeIn(t, locale)),
      scanned: false,
    },
  };
}
