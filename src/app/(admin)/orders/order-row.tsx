"use client";

import { useState } from "react";
import { updateOrderStatus, updatePaymentStatus } from "./actions";
import { codeClass } from "@/lib/admin-ui";

export type OrderRowData = {
  id: string;
  label: string;
  customerName: string;
  customerPhone: string;
  status: string;
  statusLabel: string;
  paymentStatus: string;
  paymentLabel: string;
  fulfillment: string;
  fulfillmentLabel: string;
  /** Null for a pickup, and null for a delivery whose address isn't set yet. */
  deliveryAddress: string | null;
  customerEmail: string | null;
  total: string;
  placed: string;
  items: string[];
};

const NEXT_STATUS: Record<string, { value: string; label: string }[]> = {
  NEW: [
    { value: "READY", label: "MARK READY" },
    { value: "CANCELLED", label: "CANCEL" },
  ],
  READY: [
    { value: "PICKED_UP", label: "PICKED UP" },
    { value: "DELIVERED", label: "DELIVERED" },
    { value: "CANCELLED", label: "CANCEL" },
  ],
  DELIVERED: [],
  PICKED_UP: [],
  CANCELLED: [],
};

function statusColor(status: string): string {
  if (status === "NEW") return "border-[#B45309] text-[#B45309]";
  if (status === "READY") return "border-[#1d4ed8] text-[#1d4ed8]";
  if (status === "CANCELLED") return "border-black/25 text-[#999]";
  return "border-[#15803d] text-[#15803d]";
}

// One row per order, expandable. Built as a stacked card rather than a dense
// table because the spec says warehouse staff work off phones — a 10-column
// grid is unusable at that width.
export function OrderRow({
  order,
  canEditPayment,
}: {
  order: OrderRowData;
  canEditPayment: boolean;
}) {
  const [open, setOpen] = useState(false);
  const transitions = NEXT_STATUS[order.status] ?? [];

  return (
    <div className="flex flex-col gap-2 border-b border-black/5 px-3.5 py-3 last:border-b-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className={`${codeClass} text-left hover:underline`}
        >
          {order.label}
        </button>
        <span className="font-[family-name:var(--font-barlow)] text-[14px] font-medium">
          {order.customerName}
        </span>
        <a
          href={`tel:${order.customerPhone.replace(/\D/g, "")}`}
          className="font-[family-name:var(--font-barlow)] text-[13px] text-[#555] underline"
        >
          {order.customerPhone}
        </a>
        <span className="font-[family-name:var(--font-barlow)] text-[12px] text-[#8a8a8a]">
          {order.fulfillment === "DELIVERY" ? "Delivery" : "Pickup"} · {order.placed}
        </span>

        <span className="ml-auto flex items-center gap-2">
          <span className="font-[family-name:var(--font-oswald)] text-[14px] font-semibold">
            {order.total}
          </span>
          <span
            className={`inline-block border px-[6px] py-[2px] font-[family-name:var(--font-oswald)] text-[9.5px] font-semibold tracking-[0.12em] ${statusColor(order.status)}`}
          >
            {order.statusLabel.toUpperCase()}
          </span>
          <span
            className={`inline-block border px-[6px] py-[2px] font-[family-name:var(--font-oswald)] text-[9.5px] font-semibold tracking-[0.12em] ${
              order.paymentStatus === "PAID"
                ? "border-[#15803d] text-[#15803d]"
                : "border-black/20 text-[#777]"
            }`}
          >
            {order.paymentLabel.toUpperCase()}
          </span>
        </span>
      </div>

      {open ? (
        <div className="flex flex-col gap-2.5 border-l-2 border-black/10 pl-3">
          {/* Where it's going. The order carried a delivery address all along
              and staff could not see it — they were reading it off the label
              PDF or phoning the customer back. */}
          <div className="flex flex-col gap-0.5">
            <span className="font-[family-name:var(--font-oswald)] text-[10.5px] font-semibold tracking-[0.14em] text-[#8a8a8a]">
              {order.fulfillmentLabel.toUpperCase()}
            </span>
            <span className="font-[family-name:var(--font-barlow)] text-[13px] text-[#333]">
              {order.fulfillment === "DELIVERY"
                ? order.deliveryAddress?.trim() || "Address not set — call the customer"
                : "Collecting at the warehouse"}
            </span>
            {order.customerEmail ? (
              <a
                href={`mailto:${order.customerEmail}`}
                className="font-[family-name:var(--font-barlow)] text-[13px] text-[#333] underline"
              >
                {order.customerEmail}
              </a>
            ) : null}
          </div>

          <ul className="flex flex-col gap-1">
            {order.items.map((item) => (
              <li key={item} className="font-[family-name:var(--font-barlow)] text-[13px] text-[#333]">
                {item}
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap gap-2">
            {transitions.map((t) => (
              <form key={t.value} action={updateOrderStatus}>
                <input type="hidden" name="id" value={order.id} />
                <input type="hidden" name="status" value={t.value} />
                <button
                  type="submit"
                  className={`inline-flex h-9 items-center border px-3 font-[family-name:var(--font-oswald)] text-[11px] font-semibold tracking-[0.12em] transition-colors ${
                    t.value === "CANCELLED"
                      ? "border-black/20 text-[#999] hover:border-[#B4231F] hover:text-[#B4231F]"
                      : "border-black bg-black text-white hover:bg-[#333]"
                  }`}
                >
                  {t.label}
                </button>
              </form>
            ))}

            {/* Spec 2B: label PDF from order data, replacing manual entry. */}
            <a
              href={`/orders/${order.id}/label`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center border border-black/20 px-3 font-[family-name:var(--font-oswald)] text-[11px] font-semibold tracking-[0.12em] text-black transition-colors hover:bg-[#f2f2f2]"
            >
              PRINT LABEL
            </a>

            {/* Opens in the browser's PDF viewer, so it can be printed for the
                counter or emailed to the customer without downloading it. */}
            <a
              href={`/orders/${order.id}/receipt`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center border border-black/20 px-3 font-[family-name:var(--font-oswald)] text-[11px] font-semibold tracking-[0.12em] text-black transition-colors hover:bg-[#f2f2f2]"
            >
              RECEIPT
            </a>

            {canEditPayment && order.paymentStatus !== "PAID" ? (
              <form action={updatePaymentStatus}>
                <input type="hidden" name="id" value={order.id} />
                <input type="hidden" name="paymentStatus" value="PAID" />
                <button
                  type="submit"
                  className="inline-flex h-9 items-center border border-[#15803d] px-3 font-[family-name:var(--font-oswald)] text-[11px] font-semibold tracking-[0.12em] text-[#15803d] transition-colors hover:bg-[#15803d] hover:text-white"
                >
                  MARK PAID
                </button>
              </form>
            ) : null}
          </div>

          {order.status === "CANCELLED" ? (
            <p className="font-[family-name:var(--font-barlow)] text-[12px] text-[#8a8a8a]">
              Cancelled — these parts were returned to stock.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
