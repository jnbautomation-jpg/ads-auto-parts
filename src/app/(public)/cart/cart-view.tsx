"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { cartActions, useCart } from "@/components/cart-store";
import { resolveCart, type ResolvedCart } from "../checkout/actions";
import { getDictionary } from "@/lib/dictionaries";
import { formatMoneyIn } from "@/lib/format";
import { localePath, type Locale } from "@/lib/i18n";
import {
  bodyClass,
  eyebrowClass,
  h1Class,
  mutedClass,
  primaryButtonClass,
  secondaryButtonClass,
  subHeadingClass,
} from "@/lib/public-ui";

const EMPTY: ResolvedCart = { lines: [], subtotal: 0, changed: false };

/**
 * The cart.
 *
 * The browser holds product ids and quantities; everything shown here —
 * names, images, prices, whether the part is still on the shelf — is resolved
 * on the server on every render. A cart can sit open for days, so nothing in
 * it is trusted to still be true.
 */
export function CartView({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const cart = useCart();
  const [resolved, setResolved] = useState<ResolvedCart | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    // An empty cart needs no round trip, and setting state for it here would
    // be a synchronous setState in an effect — a cascading render for a value
    // that is already knowable. It is derived below instead.
    if (cart.length === 0) return;

    let current = true;
    startTransition(async () => {
      const next = await resolveCart([...cart], locale);
      if (current) setResolved(next);
    });
    return () => {
      current = false;
    };
  }, [cart, locale]);

  const resolvedCart = cart.length === 0 ? EMPTY : resolved;
  const buyable = resolvedCart?.lines.filter((line) => !line.soldOut) ?? [];
  const canCheckout = buyable.length > 0;

  return (
    <main className="mx-auto w-full max-w-[900px] px-4 py-10 lg:px-8 lg:py-16">
      <span className={eyebrowClass}>{dict.checkout.cartLabel}</span>
      <h1 className={`mt-2 ${h1Class}`}>{dict.checkout.cartTitle}</h1>

      {/* Null means the server hasn't answered yet. Rendering the empty state
          during that gap tells a customer with a full cart that it is empty,
          which is worse than a moment of nothing. */}
      {resolvedCart === null ? (
        <div className="mt-10 h-[120px] animate-pulse border border-[var(--line)] bg-[var(--surface-raised)]" />
      ) : resolvedCart.lines.length === 0 ? (
        <EmptyCart locale={locale} dict={dict} />
      ) : (
        <>
          {resolvedCart.changed ? (
            <p className="mt-6 border-l-2 border-[var(--accent)] bg-[var(--accent-soft)] px-4 py-3 text-[14px] text-[var(--ink)]">
              {dict.checkout.onlyLeft}
            </p>
          ) : null}

          <ul className="mt-8 flex flex-col border-t border-[var(--line)]">
            {resolvedCart.lines.map((line) => (
              <li
                key={line.productId}
                className="flex gap-4 border-b border-[var(--line)] py-5"
              >
                <div className="relative h-[76px] w-[100px] shrink-0 overflow-hidden bg-[var(--surface-sunken)]">
                  {line.image ? (
                    <Image
                      src={line.image}
                      alt=""
                      fill
                      sizes="100px"
                      className="object-cover"
                    />
                  ) : null}
                </div>

                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  {line.soldOut ? (
                    <>
                      <span className={subHeadingClass}>{dict.checkout.soldOut}</span>
                      <span className={mutedClass}>{dict.product.notFoundTitle}</span>
                    </>
                  ) : (
                    <>
                      <span className={subHeadingClass}>{line.title}</span>
                      <span className={mutedClass}>{line.fit}</span>
                      <span className="font-[family-name:var(--font-barlow-condensed)] text-[12px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">
                        {line.sku}
                      </span>
                    </>
                  )}

                  <div className="mt-2 flex items-center gap-4">
                    {line.soldOut ? null : (
                      <label className="flex items-center gap-2">
                        <span className="sr-only">{dict.checkout.quantityLabel}</span>
                        <QuantityStepper
                          value={line.quantity}
                          onChange={(next) => cartActions.setQuantity(line.productId, next)}
                          label={dict.checkout.quantityLabel}
                        />
                      </label>
                    )}
                    <button
                      type="button"
                      onClick={() => cartActions.remove(line.productId)}
                      className="font-[family-name:var(--font-barlow)] text-[13px] font-medium text-[var(--ink-faint)] underline underline-offset-2 transition-colors hover:text-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                    >
                      {dict.checkout.remove}
                    </button>
                  </div>
                </div>

                {line.soldOut ? null : (
                  <span className="shrink-0 self-start font-[family-name:var(--font-oswald)] text-[19px] font-semibold">
                    {formatMoneyIn(line.lineTotal, locale)}
                  </span>
                )}
              </li>
            ))}
          </ul>

          <div className="mt-6 flex flex-col items-end gap-4">
            <div className="flex w-full items-baseline justify-between border-t border-[var(--line-strong)] pt-4 lg:w-[320px]">
              <span className={bodyClass}>{dict.checkout.subtotal}</span>
              <span className="font-[family-name:var(--font-oswald)] text-[26px] font-semibold">
                {formatMoneyIn(resolvedCart.subtotal, locale)}
              </span>
            </div>

            <div className="flex w-full flex-col gap-2.5 sm:flex-row sm:justify-end">
              <Link href={localePath(locale, "/catalog")} className={secondaryButtonClass}>
                {dict.checkout.browseCatalog}
              </Link>
              {canCheckout ? (
                <Link href={localePath(locale, "/checkout")} className={primaryButtonClass}>
                  {dict.checkout.goToCheckout}
                </Link>
              ) : (
                <span aria-disabled="true" className={`${primaryButtonClass} cursor-not-allowed opacity-60`}>
                  {dict.checkout.goToCheckout}
                </span>
              )}
            </div>
          </div>
        </>
      )}
    </main>
  );
}

function EmptyCart({
  locale,
  dict,
}: {
  locale: Locale;
  dict: ReturnType<typeof getDictionary>;
}) {
  return (
    <div className="mt-10 border border-[var(--line)] bg-[var(--surface-raised)] px-6 py-14 text-center">
      <p className={subHeadingClass}>{dict.checkout.cartEmptyTitle}</p>
      <p className={`mx-auto mt-2 max-w-[420px] ${bodyClass}`}>{dict.checkout.cartEmptyBody}</p>
      <div className="mt-6 flex justify-center">
        <Link href={localePath(locale, "/catalog")} className={primaryButtonClass}>
          {dict.checkout.browseCatalog}
        </Link>
      </div>
    </div>
  );
}

/**
 * Quantity control.
 *
 * Stepper buttons rather than a number input: the whole row is a 44px touch
 * target on a phone, and a customer standing next to a car is not going to
 * fight a spinner. The value is still typeable for anyone using a keyboard.
 */
function QuantityStepper({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (next: number) => void;
  label: string;
}) {
  return (
    <span className="flex items-center border border-[var(--line-strong)] bg-[var(--surface-raised)]">
      <StepButton onClick={() => onChange(value - 1)} label={`${label} −`}>
        −
      </StepButton>
      <input
        type="number"
        inputMode="numeric"
        min={1}
        value={value}
        aria-label={label}
        onChange={(event) => {
          const next = Number.parseInt(event.target.value, 10);
          if (Number.isInteger(next)) onChange(next);
        }}
        className="h-[40px] w-[46px] border-x border-[var(--line)] bg-transparent text-center font-[family-name:var(--font-barlow)] text-[15px] font-semibold [appearance:textfield] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--accent)] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <StepButton onClick={() => onChange(value + 1)} label={`${label} +`}>
        +
      </StepButton>
    </span>
  );
}

function StepButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-[40px] w-[38px] items-center justify-center font-[family-name:var(--font-barlow)] text-[17px] leading-none text-[var(--ink-muted)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--accent)]"
    >
      {children}
    </button>
  );
}
