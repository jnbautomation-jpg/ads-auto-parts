// The cart — pure logic only. No React, no storage, no network, so all of it
// is unit-testable.
//
// A cart line is a product id and a quantity, and deliberately nothing else.
// No price, no name, no image. Two reasons:
//
//   1. Price is decided by the server at checkout, from the buyer's tier
//      (src/lib/pricing.ts). A price carried in the cart is a price the
//      browser could edit, and a wholesale figure stored client-side is the
//      leak CHANGELOG decision 1 exists to prevent.
//   2. The cart outlives the page it was filled on. A part can sell out, drop
//      in price, or be unpublished while it sits there — so everything except
//      identity is re-read at render.
//
// The cart lives in localStorage, which means its contents are attacker-
// controlled by definition: anyone can open a console and write nonsense into
// it. parseCart() below treats it that way.

/** One line of the cart. Identity and count, nothing else — see above. */
export type CartLine = { productId: string; quantity: number };

/**
 * Most a customer can put in one line from the UI.
 *
 * The real limit is stock, enforced under a row lock in createOrder(). This
 * only stops the quantity control being used to build an absurd cart, and
 * keeps the checkout summary readable.
 */
export const MAX_LINE_QUANTITY = 20;

/** Most distinct parts in one cart. Body panels are big; nobody orders 50. */
export const MAX_CART_LINES = 30;

export const CART_STORAGE_KEY = "ads-cart-v1";

/**
 * Collapse duplicate lines, drop anything malformed, and clamp.
 *
 * Everything entering the cart goes through here — adding, loading from
 * storage, and reading before checkout — so there is one place where a line
 * becomes trustworthy rather than three.
 */
export function normalizeCart(lines: readonly CartLine[]): CartLine[] {
  const totals = new Map<string, number>();

  for (const line of lines) {
    if (typeof line?.productId !== "string") continue;
    const productId = line.productId.trim();
    if (!productId || productId.length > 64) continue;
    if (!Number.isInteger(line.quantity) || line.quantity <= 0) continue;

    const running = (totals.get(productId) ?? 0) + line.quantity;
    totals.set(productId, Math.min(running, MAX_LINE_QUANTITY));
  }

  return [...totals.entries()]
    .slice(0, MAX_CART_LINES)
    .map(([productId, quantity]) => ({ productId, quantity }));
}

/** Add to an existing line, or start one. Returns a new cart. */
export function addToCart(
  cart: readonly CartLine[],
  productId: string,
  quantity = 1,
): CartLine[] {
  return normalizeCart([...cart, { productId, quantity }]);
}

/** Set a line to an exact quantity. Zero or less removes it. */
export function setLineQuantity(
  cart: readonly CartLine[],
  productId: string,
  quantity: number,
): CartLine[] {
  if (!Number.isInteger(quantity) || quantity <= 0) return removeFromCart(cart, productId);
  return normalizeCart(
    cart.map((line) =>
      line.productId === productId
        ? { productId, quantity: Math.min(quantity, MAX_LINE_QUANTITY) }
        : line,
    ),
  );
}

export function removeFromCart(cart: readonly CartLine[], productId: string): CartLine[] {
  return normalizeCart(cart.filter((line) => line.productId !== productId));
}

/** Total number of parts, for the header badge. */
export function cartCount(cart: readonly CartLine[]): number {
  return cart.reduce((sum, line) => sum + line.quantity, 0);
}

/**
 * Read a cart back out of localStorage.
 *
 * Never throws and never returns anything unvalidated. A cart that cannot be
 * understood becomes an empty cart, which is recoverable — a customer re-adds
 * a part. Throwing here would take down every page that renders the header.
 */
export function parseCart(raw: string | null): CartLine[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return normalizeCart(parsed as CartLine[]);
  } catch {
    return [];
  }
}

export function serializeCart(cart: readonly CartLine[]): string {
  return JSON.stringify(normalizeCart(cart));
}
