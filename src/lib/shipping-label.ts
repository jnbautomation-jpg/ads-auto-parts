// Shipping label generation — Phase 2B.
//
//   "Generate a PDF label from order + customer data. Currently manual entry."
//
// Sized 4x6 inches, the standard thermal shipping-label stock, so it prints
// on a Zebra/DYMO without scaling. It also prints acceptably on letter paper
// if the shop doesn't have a label printer yet.
//
// The layout logic is split from the PDF drawing: buildLabelData() is pure
// and testable, drawLabel() does the graphics. That matters because the parts
// most likely to be wrong — a missing address on a delivery, a name that
// overflows the label — are logic, not drawing.

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

/** 4x6in at 72dpi. */
export const LABEL_WIDTH = 288;
export const LABEL_HEIGHT = 432;

export type LabelOrder = {
  orderNumber: number;
  customerName: string;
  customerPhone: string;
  fulfillment: "PICKUP" | "DELIVERY";
  deliveryAddress: string | null;
  notes: string | null;
  items: { sku: string; description: string; quantity: number }[];
};

export type LabelData = {
  title: string;
  reference: string;
  recipientLines: string[];
  /** PICKUP labels carry no address — they're a shelf tag, not a shipment. */
  isPickup: boolean;
  itemLines: string[];
  totalPieces: number;
  warnings: string[];
};

/** Hard wrap for the label's width at the body font size. */
export function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if (!line) {
      line = word;
    } else if (`${line} ${word}`.length <= maxChars) {
      line = `${line} ${word}`;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  // A single word longer than the label still has to fit somewhere.
  return lines.flatMap((l) =>
    l.length <= maxChars ? [l] : (l.match(new RegExp(`.{1,${maxChars}}`, "g")) ?? [l]),
  );
}

export function buildLabelData(order: LabelOrder): LabelData {
  const isPickup = order.fulfillment === "PICKUP";
  const warnings: string[] = [];

  const recipientLines = [order.customerName, order.customerPhone];
  if (!isPickup) {
    if (order.deliveryAddress?.trim()) {
      recipientLines.push(...wrapText(order.deliveryAddress, 32));
    } else {
      // Printing a delivery label with no address is how a package gets
      // loaded onto a van and comes back at the end of the day.
      warnings.push("NO DELIVERY ADDRESS ON FILE — DO NOT SHIP");
    }
  }

  const itemLines = order.items.flatMap((i) =>
    wrapText(`${i.quantity}x ${i.description} [${i.sku}]`, 40),
  );

  return {
    title: isPickup ? "COLLECTION" : "DELIVERY",
    reference: `ADS-${order.orderNumber}`,
    recipientLines,
    isPickup,
    itemLines,
    totalPieces: order.items.reduce((sum, i) => sum + i.quantity, 0),
    warnings,
  };
}

/** Renders the label to PDF bytes. */
export async function renderLabelPdf(
  data: LabelData,
  shop: { name: string; address: string; phone: string },
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([LABEL_WIDTH, LABEL_HEIGHT]);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);

  const black = rgb(0, 0, 0);
  const margin = 16;
  let y = LABEL_HEIGHT - margin;

  const line = (text: string, size: number, font = regular, gap = 4) => {
    y -= size;
    page.drawText(text, { x: margin, y, size, font, color: black });
    y -= gap;
  };

  // Header band — shop identity, so a driver knows whose package it is.
  page.drawRectangle({
    x: 0,
    y: LABEL_HEIGHT - 46,
    width: LABEL_WIDTH,
    height: 46,
    color: black,
  });
  page.drawText(shop.name.toUpperCase(), {
    x: margin,
    y: LABEL_HEIGHT - 27,
    size: 13,
    font: bold,
    color: rgb(1, 1, 1),
  });
  page.drawText(shop.phone, {
    x: margin,
    y: LABEL_HEIGHT - 40,
    size: 9,
    font: regular,
    color: rgb(1, 1, 1),
  });
  y = LABEL_HEIGHT - 60;

  line(data.title, 20, bold, 2);
  line(data.reference, 26, bold, 10);

  page.drawLine({
    start: { x: margin, y },
    end: { x: LABEL_WIDTH - margin, y },
    thickness: 1,
    color: black,
  });
  y -= 12;

  line(data.isPickup ? "COLLECT — CUSTOMER" : "DELIVER TO", 8, bold, 4);
  for (const l of data.recipientLines) line(l, 12, bold, 2);
  y -= 8;

  for (const w of data.warnings) {
    // Boxed so it cannot be skimmed past on a printed label.
    y -= 14;
    page.drawRectangle({
      x: margin - 4,
      y: y - 3,
      width: LABEL_WIDTH - margin * 2 + 8,
      height: 16,
      borderColor: black,
      borderWidth: 1.5,
    });
    page.drawText(w, { x: margin, y, size: 7.5, font: bold, color: black });
    y -= 10;
  }

  y -= 4;
  page.drawLine({
    start: { x: margin, y },
    end: { x: LABEL_WIDTH - margin, y },
    thickness: 1,
    color: black,
  });
  y -= 12;

  line(`CONTENTS — ${data.totalPieces} PIECE${data.totalPieces === 1 ? "" : "S"}`, 8, bold, 5);
  for (const l of data.itemLines) {
    if (y < 70) break; // leave room for the return address
    line(l, 9, regular, 1);
  }

  // Return address at the foot.
  page.drawLine({
    start: { x: margin, y: 56 },
    end: { x: LABEL_WIDTH - margin, y: 56 },
    thickness: 0.5,
    color: black,
  });
  page.drawText("RETURN TO", { x: margin, y: 44, size: 7, font: bold, color: black });
  for (const [i, l] of wrapText(`${shop.name}, ${shop.address}`, 44).entries()) {
    page.drawText(l, { x: margin, y: 33 - i * 9, size: 7.5, font: regular, color: black });
  }

  return pdf.save();
}
