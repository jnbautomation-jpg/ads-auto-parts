"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cartActions, useCart } from "@/components/cart-store";
import { primaryButtonClass, secondaryButtonClass } from "@/lib/public-ui";
import { localePath, type Locale } from "@/lib/i18n";

/**
 * Add to cart, on the product page.
 *
 * Three states rather than two. Once a part is in the cart the button stops
 * being the useful thing on the page — the route to paying is — so it swaps
 * itself for a link to the cart. A button that says "Add to cart" after you
 * have added to it invites the same click twice.
 *
 * A sold-out part renders a disabled control rather than being hidden: the
 * customer needs to know the part exists and is out, which is what the
 * back-in-stock alert on the same page is for.
 */
export function AddToCartButton({
  productId,
  locale,
  soldOut,
  labels,
}: {
  productId: string;
  locale: Locale;
  soldOut: boolean;
  labels: { add: string; added: string; view: string; soldOut: string };
}) {
  const cart = useCart();
  const inCart = cart.some((line) => line.productId === productId);
  const [justAdded, setJustAdded] = useState(false);

  // The confirmation is a moment, not a state — it clears itself so the
  // button settles into "View cart" rather than staying green forever.
  useEffect(() => {
    if (!justAdded) return;
    const timer = setTimeout(() => setJustAdded(false), 1800);
    return () => clearTimeout(timer);
  }, [justAdded]);

  if (soldOut) {
    return (
      <span
        aria-disabled="true"
        className={`${secondaryButtonClass} cursor-not-allowed opacity-60`}
      >
        {labels.soldOut}
      </span>
    );
  }

  if (inCart) {
    return (
      <Link href={localePath(locale, "/cart")} className={primaryButtonClass}>
        {justAdded ? `${labels.added} — ${labels.view}` : labels.view}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        cartActions.add(productId);
        setJustAdded(true);
      }}
      className={primaryButtonClass}
    >
      {labels.add}
    </button>
  );
}
