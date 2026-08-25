// Receipt generation.
//
// A receipt is what the customer keeps and what the shop is asked for when
// something goes wrong three months later, so it has to carry the order
// number, what was bought, what was paid, and who to call — on one page that
// prints on ordinary letter paper without scaling.
//
// Split the same way as shipping-label.ts: buildReceiptData() is pure and
// tested, drawReceipt() does the graphics. The parts most likely to be wrong
// are arithmetic and missing fields, not drawing.

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

/** US Letter at 72dpi. */
export const PAGE_WIDTH = 612;
export const PAGE_HEIGHT = 792;

export type ReceiptOrderItem = {
  sku: string;
  description: string;
  quantity: number;
  /** Unit price actually charged, as a decimal string. */
  unitPrice: string;
};

export type ReceiptOrder = {
  orderNumber: number;
  createdAt: Date;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string;
  fulfillment: string;
  deliveryAddress: string | null;
  /** The tier the order was priced at, so trade orders can show the saving. */
  pricedAsTier: string;
  paymentStatus: string;
  subtotal: string;
  total: string;
  items: ReceiptOrderItem[];
};

export type ReceiptLine = {
  sku: string;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type ReceiptData = {
  orderNumber: string;
  dated: string;
  customerName: string;
  /** Contact lines, blanks already dropped. */
  contact: string[];
  /** "Delivery" plus the address, or "Pickup" — never an empty heading. */
  fulfilment: string[];
  lines: ReceiptLine[];
  subtotal: number;
  total: number;
  /** Set only for trade orders: what this customer saved against retail. */
  tradeSaving: number | null;
  paid: boolean;
};

/**
 * Public price is wholesale plus a flat amount, so a trade order's saving is
 * that amount per unit. Imported rather than redeclared — if Matthew ever
 * moves off a flat markup, this follows automatically.
 */
import { RETAIL_MARKUP_USD } from "@/lib/pricing";

function money(value: string | number): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function buildReceiptData(order: ReceiptOrder): ReceiptData {
  const lines: ReceiptLine[] = order.items.map((item) => {
    const unitPrice = money(item.unitPrice);
    return {
      sku: item.sku,
      description: item.description,
      quantity: item.quantity,
      unitPrice,
      lineTotal: unitPrice * item.quantity,
    };
  });

  const contact = [order.customerPhone, order.customerEmail ?? ""].filter(
    (line) => line.trim().length > 0,
  );

  // A delivery with no address on file is a real state — the order can be
  // taken over the phone before the address is confirmed. Say so rather than
  // printing a heading with nothing under it.
  const isDelivery = order.fulfillment === "DELIVERY";
  const fulfilment = isDelivery
    ? ["Delivery", order.deliveryAddress?.trim() || "Address to be confirmed"]
    : ["Pickup", "Collect at the warehouse"];

  const unitsOrdered = lines.reduce((sum, line) => sum + line.quantity, 0);

  return {
    orderNumber: `#${order.orderNumber}`,
    dated: order.createdAt.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    customerName: order.customerName,
    contact,
    fulfilment,
    lines,
    subtotal: money(order.subtotal),
    total: money(order.total),
    tradeSaving:
      order.pricedAsTier === "WHOLESALE" && unitsOrdered > 0
        ? RETAIL_MARKUP_USD * unitsOrdered
        : null,
    paid: order.paymentStatus === "PAID",
  };
}

function usd(value: number): string {
  return `$${value.toFixed(2)}`;
}

export async function renderReceiptPdf(
  data: ReceiptData,
  shop: { name: string; address: string; phone: string; email: string },
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);

  const black = rgb(0, 0, 0);
  const grey = rgb(0.42, 0.45, 0.48);
  const red = rgb(0.89, 0.12, 0.14);
  const M = 54;
  let y = PAGE_HEIGHT - M;

  const text = (
    s: string,
    x: number,
    yy: number,
    size: number,
    font = regular,
    color = black,
  ) => page.drawText(s, { x, y: yy, size, font, color });

  const rule = (yy: number, color = rgb(0.85, 0.86, 0.88), thickness = 1) =>
    page.drawLine({
      start: { x: M, y: yy },
      end: { x: PAGE_WIDTH - M, y: yy },
      thickness,
      color,
    });

  // Masthead
  text(shop.name.toUpperCase(), M, y, 18, bold);
  text("RECEIPT", PAGE_WIDTH - M - regular.widthOfTextAtSize("RECEIPT", 18) - 4, y, 18, bold, red);
  y -= 16;
  text(shop.address, M, y, 9, regular, grey);
  y -= 12;
  text(`${shop.phone}   ${shop.email}`, M, y, 9, regular, grey);

  y -= 22;
  rule(y, black, 1.5);
  y -= 20;

  // Order identity
  text(`Order ${data.orderNumber}`, M, y, 13, bold);
  const dated = data.dated;
  text(dated, PAGE_WIDTH - M - regular.widthOfTextAtSize(dated, 10), y + 2, 10, regular, grey);
  y -= 26;

  // Two columns: who, and how they get it.
  const colRight = M + 280;
  text("BILL TO", M, y, 8, bold, grey);
  text(data.fulfilment[0].toUpperCase(), colRight, y, 8, bold, grey);
  y -= 14;
  text(data.customerName, M, y, 11, bold);
  text(data.fulfilment[1], colRight, y, 10);
  y -= 13;
  for (const line of data.contact) {
    text(line, M, y, 10, regular, grey);
    y -= 13;
  }

  y -= 12;
  rule(y);
  y -= 16;

  // Items
  const qtyX = PAGE_WIDTH - M - 210;
  const priceX = PAGE_WIDTH - M - 140;
  const totalX = PAGE_WIDTH - M - 60;
  text("ITEM", M, y, 8, bold, grey);
  text("QTY", qtyX, y, 8, bold, grey);
  text("UNIT", priceX, y, 8, bold, grey);
  text("TOTAL", totalX, y, 8, bold, grey);
  y -= 8;
  rule(y);
  y -= 16;

  for (const line of data.lines) {
    const desc =
      line.description.length > 46 ? `${line.description.slice(0, 45)}…` : line.description;
    text(desc, M, y, 10.5);
    text(String(line.quantity), qtyX, y, 10.5);
    text(usd(line.unitPrice), priceX, y, 10.5);
    text(usd(line.lineTotal), totalX, y, 10.5);
    y -= 13;
    text(line.sku, M, y, 8.5, regular, grey);
    y -= 18;
  }

  rule(y);
  y -= 20;

  // Totals
  const label = (s: string, value: string, size: number, font = regular, color = black) => {
    text(s, priceX - 20, y, size, font, color);
    text(value, totalX, y, size, font, color);
  };
  label("Subtotal", usd(data.subtotal), 10.5);
  y -= 16;

  if (data.tradeSaving !== null) {
    // The whole point of a trade account is that it visibly saved them money.
    label("Trade discount", `-${usd(data.tradeSaving)}`, 10.5, regular, red);
    y -= 16;
  }

  label("TOTAL", usd(data.total), 13, bold);
  y -= 22;

  if (data.paid) {
    text("PAID", M, y, 11, bold, rgb(0.1, 0.48, 0.23));
  } else {
    text("BALANCE DUE", M, y, 11, bold, red);
  }

  // Footer
  const footer = `Questions about this order? Call ${shop.phone} and quote ${data.orderNumber}.`;
  text(footer, M, M + 18, 9, regular, grey);

  return pdf.save();
}
