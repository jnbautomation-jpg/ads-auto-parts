import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth";
import { ADDRESS, BUSINESS_NAME, PHONE_DISPLAY } from "@/lib/site";
import { buildLabelData, renderLabelPdf } from "@/lib/shipping-label";

// Serves a 4x6 shipping label as a PDF.
//
// A route handler rather than a page because the response IS the file. Note
// route handlers are not covered by (admin)/layout.tsx, so this checks auth
// itself — the middleware protects /orders, but the layout that normally
// enforces staff identity never runs here.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getAuthContext();
  if (!ctx) return new NextResponse("Not found", { status: 404 });

  const { id } = await params;

  const order = await prisma.order.findFirst({
    where: { id, organizationId: ctx.organization.id },
    include: { items: { select: { sku: true, description: true, quantity: true } } },
  });
  // 404 rather than 403: a staff member from another org shouldn't learn that
  // this order exists.
  if (!order) return new NextResponse("Not found", { status: 404 });

  const data = buildLabelData({
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    fulfillment: order.fulfillment,
    deliveryAddress: order.deliveryAddress,
    notes: order.notes,
    items: order.items,
  });

  const pdf = await renderLabelPdf(data, {
    name: BUSINESS_NAME,
    address: ADDRESS,
    phone: PHONE_DISPLAY,
  });

  return new NextResponse(pdf as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      // inline so it opens in the browser's viewer and can be sent straight
      // to a label printer, rather than landing in Downloads.
      "Content-Disposition": `inline; filename="ADS-${order.orderNumber}-label.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
