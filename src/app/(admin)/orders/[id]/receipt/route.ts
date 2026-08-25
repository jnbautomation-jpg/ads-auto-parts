import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth";
import { ADDRESS, BUSINESS_NAME, EMAIL, PHONE_DISPLAY } from "@/lib/site";
import { buildReceiptData, renderReceiptPdf } from "@/lib/receipt";

// Serves an order receipt as a PDF, for the customer to keep and for the shop
// to reprint when they are asked for it months later.
//
// A route handler rather than a page because the response IS the file. Route
// handlers are not covered by (admin)/layout.tsx, so this checks auth itself —
// the proxy protects /orders, but the layout that normally enforces staff
// identity never runs here.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getAuthContext();
  if (!ctx) return new NextResponse("Not found", { status: 404 });

  const { id } = await params;

  const order = await prisma.order.findFirst({
    where: { id, organizationId: ctx.organization.id },
    include: {
      items: { select: { sku: true, description: true, quantity: true, unitPrice: true } },
    },
  });
  // 404 rather than 403: a staff member from another org shouldn't learn that
  // this order exists.
  if (!order) return new NextResponse("Not found", { status: 404 });

  const data = buildReceiptData({
    orderNumber: order.orderNumber,
    createdAt: order.createdAt,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone,
    fulfillment: order.fulfillment,
    deliveryAddress: order.deliveryAddress,
    pricedAsTier: order.pricedAsTier,
    paymentStatus: order.paymentStatus,
    subtotal: order.subtotal.toString(),
    total: order.total.toString(),
    items: order.items.map((i) => ({
      sku: i.sku,
      description: i.description,
      quantity: i.quantity,
      unitPrice: i.unitPrice.toString(),
    })),
  });

  const pdf = await renderReceiptPdf(data, {
    name: BUSINESS_NAME,
    address: ADDRESS,
    phone: PHONE_DISPLAY,
    email: EMAIL,
  });

  return new NextResponse(pdf as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      // inline so it opens in the browser's viewer and can be printed or
      // emailed straight from there, rather than landing in Downloads.
      "Content-Disposition": `inline; filename="ADS-${order.orderNumber}-receipt.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
