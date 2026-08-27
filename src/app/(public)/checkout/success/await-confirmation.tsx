"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { cartActions } from "@/components/cart-store";

/** How long to keep asking before leaving the page as it is. */
const MAX_ATTEMPTS = 20;
const INTERVAL_MS = 1500;

/**
 * Waits for the webhook.
 *
 * Payment is confirmed by Stripe calling our server, which usually lands
 * within a second or two of the customer arriving here — but not always, and
 * not in a fixed order. Rather than have the page assert something it cannot
 * know, it re-reads the order until the server says paid.
 *
 * Gives up after about thirty seconds. A page that polls forever is a page
 * that quietly burns a phone battery in someone's pocket; by then the receipt
 * email is the better channel anyway, and the order number on screen is
 * enough to call about.
 */
export function AwaitConfirmation() {
  const router = useRouter();
  const [attempts, setAttempts] = useState(0);

  // The payment went through — whatever the webhook has recorded so far, the
  // cart is spent and must not follow the customer back to the catalog.
  useEffect(() => {
    cartActions.clear();
  }, []);

  useEffect(() => {
    if (attempts >= MAX_ATTEMPTS) return;
    const timer = setTimeout(() => {
      setAttempts((n) => n + 1);
      router.refresh();
    }, INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [attempts, router]);

  return (
    <span
      role="status"
      aria-live="polite"
      className="mt-6 flex items-center gap-2.5 text-[14px] text-[var(--ink-faint)]"
    >
      <span className="flex h-[14px] w-[14px] animate-spin items-center justify-center rounded-full border-2 border-[var(--line-strong)] border-t-[var(--accent)]" />
    </span>
  );
}
