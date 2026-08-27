"use client";

// The cart's client-side home.
//
// A module-level store read through useSyncExternalStore rather than a React
// context, for one practical reason: the cart badge lives in the header and
// the add button lives deep inside a product page, and those two are rendered
// by different server components with no shared client ancestor. A context
// would mean wrapping the whole (public) layout in a client provider — which
// would opt the entire public site out of server rendering to keep a number
// in a badge up to date.
//
// All the actual cart logic is in src/lib/cart.ts, which is pure and tested.
// This file is only the plumbing: storage, subscription, and cross-tab sync.

import { useSyncExternalStore } from "react";
import {
  CART_STORAGE_KEY,
  addToCart,
  parseCart,
  removeFromCart,
  serializeCart,
  setLineQuantity,
  type CartLine,
} from "@/lib/cart";

/**
 * Snapshot the hook returns before anything has been read from storage, and
 * on the server.
 *
 * A single frozen instance, not a fresh `[]` per call: useSyncExternalStore
 * compares snapshots by identity, and returning a new array every time is an
 * infinite render loop.
 */
const EMPTY: readonly CartLine[] = Object.freeze([]);

let snapshot: readonly CartLine[] = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function read(): readonly CartLine[] {
  try {
    return Object.freeze(parseCart(window.localStorage.getItem(CART_STORAGE_KEY)));
  } catch {
    // Private browsing, or a browser set to block site data. A cart that
    // cannot persist is still usable for this page view.
    return EMPTY;
  }
}

function emit(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  if (!loaded) {
    loaded = true;
    snapshot = read();
  }

  listeners.add(listener);

  // Another tab changed the cart. Without this, a customer with the catalog
  // open in two tabs adds a part in one and checks out from the other with a
  // stale cart.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== CART_STORAGE_KEY) return;
    snapshot = read();
    emit();
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot(): readonly CartLine[] {
  if (!loaded) {
    loaded = true;
    snapshot = read();
  }
  return snapshot;
}

/** The server has no localStorage, so it always renders the empty cart. */
function getServerSnapshot(): readonly CartLine[] {
  return EMPTY;
}

function write(next: CartLine[]): void {
  snapshot = Object.freeze(next);
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, serializeCart(next));
  } catch {
    // Storage is full or blocked. The in-memory cart still works for this
    // session, which is better than throwing inside a click handler.
  }
  emit();
}

export function useCart(): readonly CartLine[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export const cartActions = {
  add(productId: string, quantity = 1): void {
    write(addToCart(getSnapshot(), productId, quantity));
  },
  setQuantity(productId: string, quantity: number): void {
    write(setLineQuantity(getSnapshot(), productId, quantity));
  },
  remove(productId: string): void {
    write(removeFromCart(getSnapshot(), productId));
  },
  clear(): void {
    write([]);
  },
};
