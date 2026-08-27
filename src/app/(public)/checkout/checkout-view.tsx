"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe, type Appearance, type StripeElementsOptions } from "@stripe/stripe-js";
import { cartActions, useCart } from "@/components/cart-store";
import { placeOrder, resolveCart, type ResolvedCart } from "./actions";
import { getDictionary } from "@/lib/dictionaries";
import { formatMoneyIn } from "@/lib/format";
import { localePath, type Locale } from "@/lib/i18n";
import { PHONE_DISPLAY, PHONE_HREF } from "@/lib/site";
import {
  bodyClass,
  eyebrowClass,
  h1Class,
  mutedClass,
  primaryButtonClass,
  secondaryButtonClass,
  subHeadingClass,
} from "@/lib/public-ui";

/**
 * loadStripe is memoised at module scope, as Stripe requires — calling it per
 * render would download and re-initialise the SDK on every keystroke.
 * Resolved lazily so a build with no publishable key never calls it at all.
 */
let stripePromise: ReturnType<typeof loadStripe> | null = null;
function getStripe(publishableKey: string) {
  if (!stripePromise) stripePromise = loadStripe(publishableKey);
  return stripePromise;
}

type Details = {
  name: string;
  phone: string;
  email: string;
  fulfillment: "PICKUP" | "DELIVERY";
  deliveryAddress: string;
  deliveryZip: string;
  notes: string;
};

const EMPTY_CART: ResolvedCart = { lines: [], subtotal: 0, changed: false };

const BLANK: Details = {
  name: "",
  phone: "",
  email: "",
  fulfillment: "PICKUP",
  deliveryAddress: "",
  deliveryZip: "",
  notes: "",
};

export function CheckoutView({
  locale,
  publishableKey,
}: {
  locale: Locale;
  publishableKey: string;
}) {
  const dict = getDictionary(locale);
  const cart = useCart();
  const [resolved, setResolved] = useState<ResolvedCart | null>(null);

  useEffect(() => {
    // See cart-view: the empty case is derived, not stored, so there is no
    // synchronous setState in this effect.
    if (cart.length === 0) return;

    let current = true;
    void resolveCart([...cart], locale).then((next) => {
      if (current) setResolved(next);
    });
    return () => {
      current = false;
    };
  }, [cart, locale]);

  const resolvedCart = cart.length === 0 ? EMPTY_CART : resolved;

  // Payments switched off — the site has to keep working, so this is a route
  // to the phone rather than a dead end.
  if (!publishableKey) {
    return (
      <Shell locale={locale} dict={dict}>
        <Notice title={dict.checkout.unavailableTitle} body={dict.checkout.unavailableBody}>
          <a href={`tel:${PHONE_HREF}`} className={primaryButtonClass}>
            {PHONE_DISPLAY}
          </a>
        </Notice>
      </Shell>
    );
  }

  if (resolvedCart === null) {
    return (
      <Shell locale={locale} dict={dict}>
        <div className="h-[200px] animate-pulse border border-[var(--line)] bg-[var(--surface-raised)]" />
      </Shell>
    );
  }

  const buyable = resolvedCart.lines.filter((line) => !line.soldOut);
  if (buyable.length === 0) {
    return (
      <Shell locale={locale} dict={dict}>
        <Notice title={dict.checkout.cartEmptyTitle} body={dict.checkout.cartEmptyBody}>
          <Link href={localePath(locale, "/catalog")} className={primaryButtonClass}>
            {dict.checkout.browseCatalog}
          </Link>
        </Notice>
      </Shell>
    );
  }

  return (
    <Shell locale={locale} dict={dict}>
      <StripeFrame
        locale={locale}
        publishableKey={publishableKey}
        subtotal={resolvedCart.subtotal}
        resolved={resolvedCart}
      />
    </Shell>
  );
}

/**
 * Mounts Elements in "deferred intent" mode.
 *
 * The alternative — create the order and the PaymentIntent up front so there
 * is a client secret to mount with — would reserve stock the moment the page
 * loads, and hold the shop's last door against every customer who opened
 * checkout and wandered off. Here the order is created at the instant the
 * customer commits, and the window where stock is held is the length of one
 * card authorisation.
 */
function StripeFrame({
  locale,
  publishableKey,
  subtotal,
  resolved,
}: {
  locale: Locale;
  publishableKey: string;
  subtotal: number;
  resolved: ResolvedCart;
}) {
  const appearance = useStripeAppearance();

  const options = useMemo<StripeElementsOptions>(
    () => ({
      mode: "payment",
      amount: Math.round(subtotal * 100),
      currency: "usd",
      // Stripe's own strings — the card form's labels and errors — follow the
      // page, so a Spanish customer is not handed an English card form.
      locale,
      appearance,
    }),
    [subtotal, locale, appearance],
  );

  return (
    <Elements stripe={getStripe(publishableKey)} options={options}>
      <CheckoutForm locale={locale} resolved={resolved} />
    </Elements>
  );
}

function useStripeAppearance(): Appearance {
  // Computed once, during the first client render, rather than in an effect:
  // an effect would set state synchronously and re-render the Elements
  // provider, which remounts the card iframe. The server has no
  // document — it returns the base theme, and nothing about `appearance`
  // reaches the HTML, so there is nothing to mismatch on hydration.
  const [appearance] = useState<Appearance>(() =>
    typeof document === "undefined" ? { theme: "flat" } : buildAppearance(),
  );
  return appearance;
}

/**
 * Style the Payment Element from the site's own tokens.
 *
 * Read off :root at runtime rather than restated as hex here, so the card
 * form cannot drift away from the rest of the page — the colour rule
 * (CLAUDE.md) keeps one source of truth in globals.css, and an iframe handed
 * literals would quietly become a second one. The fallbacks exist only for
 * the case where the stylesheet has not applied yet.
 */
function buildAppearance(): Appearance {
  const root = getComputedStyle(document.documentElement);
  const token = (name: string, fallback: string) =>
    root.getPropertyValue(name).trim() || fallback;

  return {
    theme: "flat",
    variables: {
      colorPrimary: token("--accent", "#E31E24"),
      colorBackground: token("--surface-raised", "#FFFFFF"),
      colorText: token("--ink", "#15171A"),
      colorTextSecondary: token("--ink-muted", "#545B63"),
      colorTextPlaceholder: token("--ink-faint", "#666D75"),
      colorDanger: token("--danger", "#C0272D"),
      fontFamily: "Barlow, system-ui, sans-serif",
      fontSizeBase: "15px",
      // The site has no rounded corners anywhere — square is the whole
      // industrial read of it, and a pill-shaped card field would look
      // pasted in.
      borderRadius: "0px",
      spacingUnit: "4px",
    },
    rules: {
      ".Input": {
        border: `1px solid ${token("--line-strong", "#B7BDC4")}`,
        boxShadow: "none",
        padding: "12px",
      },
      ".Input:focus": {
        border: `1px solid ${token("--accent", "#E31E24")}`,
        outline: `2px solid ${token("--accent", "#E31E24")}`,
        outlineOffset: "1px",
        boxShadow: "none",
      },
      ".Label": {
        fontWeight: "600",
        fontSize: "13px",
      },
      ".Tab, .Block": {
        border: `1px solid ${token("--line-strong", "#B7BDC4")}`,
        boxShadow: "none",
      },
      ".Tab--selected": {
        border: `1px solid ${token("--accent", "#E31E24")}`,
        color: token("--accent", "#E31E24"),
      },
    },
  };
}

function CheckoutForm({ locale, resolved }: { locale: Locale; resolved: ResolvedCart }) {
  const dict = getDictionary(locale);
  const router = useRouter();
  const stripe = useStripe();
  const elements = useElements();
  const cart = useCart();

  const [details, setDetails] = useState<Details>(BLANK);
  const [error, setError] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const errorRef = useRef<HTMLParagraphElement>(null);

  const set = useCallback(
    <K extends keyof Details>(key: K, value: Details[K]) =>
      setDetails((current) => ({ ...current, [key]: value })),
    [],
  );

  // Move focus to the problem rather than leaving the customer to find it —
  // on a phone the message can be well off-screen from the button they hit.
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!stripe || !elements || paying) return;

    setError(null);
    setErrorField(null);
    setPaying(true);

    try {
      // Validates the card fields before we create anything server-side. An
      // order created for a payment that the form itself would have rejected
      // is an order that holds stock for nothing.
      const ready = await elements.submit();
      if (ready.error) {
        setError(ready.error.message ?? dict.checkout.errors.paymentFailed);
        return;
      }

      const placed = await placeOrder({
        lines: [...cart],
        ...details,
        locale,
      });

      if (!placed.ok) {
        setError(placed.error);
        setErrorField(placed.field ?? null);
        // Stock moved under us — the cart page will re-resolve and show what
        // changed, so send them back to look rather than leaving them on a
        // total that is no longer true.
        if (placed.cartChanged) router.push(localePath(locale, "/cart"));
        return;
      }

      const { error: stripeError } = await stripe.confirmPayment({
        elements,
        clientSecret: placed.clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}${localePath(locale, "/checkout/success")}`,
        },
        // Cards that need no 3-D Secure step never leave the page; the ones
        // that do get redirected out and back to the same return_url.
        redirect: "if_required",
      });

      if (stripeError) {
        setError(stripeError.message ?? dict.checkout.errors.paymentFailed);
        return;
      }

      // Paid without a redirect. The webhook is what actually marks the order
      // paid, so the success page reads the order rather than trusting this.
      cartActions.clear();
      router.push(
        `${localePath(locale, "/checkout/success")}?payment_intent=${encodeURIComponent(placed.paymentIntentId)}`,
      );
    } catch (cause) {
      console.error("Checkout failed:", cause);
      setError(dict.checkout.errors.paymentFailed);
    } finally {
      setPaying(false);
    }
  }

  const delivering = details.fulfillment === "DELIVERY";

  return (
    <form onSubmit={onSubmit} className="grid gap-10 lg:grid-cols-[1fr_340px] lg:gap-12">
      <div className="flex flex-col gap-9">
        <Section heading={dict.checkout.contactHeading}>
          <Field
            label={dict.checkout.name}
            value={details.name}
            onChange={(v) => set("name", v)}
            autoComplete="name"
            invalid={errorField === "name"}
            required
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={dict.checkout.phone}
              value={details.phone}
              onChange={(v) => set("phone", v)}
              type="tel"
              autoComplete="tel"
              invalid={errorField === "phone"}
              required
            />
            <Field
              label={dict.checkout.email}
              value={details.email}
              onChange={(v) => set("email", v)}
              type="email"
              autoComplete="email"
              hint={dict.checkout.emailHelper}
              invalid={errorField === "email"}
              required
            />
          </div>
        </Section>

        <Section heading={dict.checkout.fulfillmentHeading}>
          <div className="grid gap-3 sm:grid-cols-2">
            <FulfillmentOption
              selected={!delivering}
              onSelect={() => set("fulfillment", "PICKUP")}
              title={dict.checkout.pickup}
              note={dict.checkout.pickupNote}
            />
            <FulfillmentOption
              selected={delivering}
              onSelect={() => set("fulfillment", "DELIVERY")}
              title={dict.checkout.delivery}
              note={dict.checkout.deliveryNote}
            />
          </div>

          {delivering ? (
            <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
              <Field
                label={dict.checkout.address}
                value={details.deliveryAddress}
                onChange={(v) => set("deliveryAddress", v)}
                autoComplete="street-address"
                invalid={errorField === "deliveryAddress"}
                required
              />
              <Field
                label={dict.checkout.zip}
                value={details.deliveryZip}
                onChange={(v) => set("deliveryZip", v)}
                autoComplete="postal-code"
                inputMode="numeric"
                invalid={errorField === "deliveryZip"}
                required
              />
            </div>
          ) : null}

          <Field
            label={dict.checkout.notes}
            value={details.notes}
            onChange={(v) => set("notes", v)}
            placeholder={dict.checkout.notesPlaceholder}
            multiline
          />
        </Section>

        <Section heading={dict.checkout.paymentHeading}>
          <PaymentElement options={{ layout: "tabs" }} />
          <p className={mutedClass}>{dict.checkout.cardSafety}</p>
        </Section>
      </div>

      <aside className="flex flex-col gap-5 lg:sticky lg:top-8 lg:self-start">
        <div className="border border-[var(--line)] bg-[var(--surface-raised)] p-5">
          <span className={eyebrowClass}>{dict.checkout.itemsHeading}</span>

          <ul className="mt-4 flex flex-col gap-4">
            {resolved.lines
              .filter((line) => !line.soldOut)
              .map((line) => (
                <li key={line.productId} className="flex gap-3">
                  <div className="relative h-[48px] w-[64px] shrink-0 overflow-hidden bg-[var(--surface-sunken)]">
                    {line.image ? (
                      <Image src={line.image} alt="" fill sizes="64px" className="object-cover" />
                    ) : null}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="font-[family-name:var(--font-barlow)] text-[14px] font-semibold leading-tight">
                      {line.title}
                    </span>
                    <span className="text-[13px] text-[var(--ink-faint)]">{line.fit}</span>
                    <span className="text-[13px] text-[var(--ink-faint)]">
                      {dict.checkout.quantityLabel} {line.quantity}
                    </span>
                  </div>
                  <span className="shrink-0 font-[family-name:var(--font-barlow)] text-[14px] font-semibold">
                    {formatMoneyIn(line.lineTotal, locale)}
                  </span>
                </li>
              ))}
          </ul>

          <div className="mt-5 flex items-baseline justify-between border-t border-[var(--line-strong)] pt-4">
            <span className="font-[family-name:var(--font-barlow)] text-[15px] font-semibold">
              {dict.checkout.orderTotal}
            </span>
            <span className="font-[family-name:var(--font-oswald)] text-[24px] font-semibold">
              {formatMoneyIn(resolved.subtotal, locale)}
            </span>
          </div>
        </div>

        {error ? (
          <p
            ref={errorRef}
            tabIndex={-1}
            role="alert"
            className="border-l-2 border-[var(--danger)] bg-[var(--accent-soft)] px-4 py-3 font-[family-name:var(--font-barlow)] text-[14px] text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--danger)]"
          >
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={!stripe || paying}
          className={`${primaryButtonClass} w-full disabled:cursor-not-allowed disabled:opacity-70`}
        >
          {paying
            ? dict.checkout.paying
            : `${dict.checkout.pay} ${formatMoneyIn(resolved.subtotal, locale)}`}
        </button>

        <Link
          href={localePath(locale, "/cart")}
          className={`${secondaryButtonClass} w-full`}
        >
          {dict.checkout.cartTitle}
        </Link>
      </aside>
    </form>
  );
}

// --- small pieces ---------------------------------------------------------

function Shell({
  locale,
  dict,
  children,
}: {
  locale: Locale;
  dict: ReturnType<typeof getDictionary>;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-[1100px] px-4 py-10 lg:px-8 lg:py-14">
      <span className={eyebrowClass}>{dict.checkout.cartLabel}</span>
      <h1 className={`mt-2 ${h1Class}`}>{dict.checkout.title}</h1>
      <p className={`mt-3 max-w-[560px] ${bodyClass}`}>{dict.checkout.intro}</p>
      <div className="mt-10">{children}</div>
      <p className="sr-only">{localePath(locale, "/checkout")}</p>
    </main>
  );
}

function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className={subHeadingClass}>{heading}</h2>
      {children}
    </section>
  );
}

function Notice({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-[var(--line)] bg-[var(--surface-raised)] px-6 py-14 text-center">
      <p className={subHeadingClass}>{title}</p>
      <p className={`mx-auto mt-2 max-w-[420px] ${bodyClass}`}>{body}</p>
      <div className="mt-6 flex justify-center">{children}</div>
    </div>
  );
}

function FulfillmentOption({
  selected,
  onSelect,
  title,
  note,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  note: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex flex-col gap-1 border p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
        selected
          ? "border-[var(--accent)] bg-[var(--accent-soft)]"
          : "border-[var(--line-strong)] bg-[var(--surface-raised)] hover:border-[var(--ink-faint)]"
      }`}
    >
      <span className="font-[family-name:var(--font-barlow)] text-[15px] font-semibold">
        {title}
      </span>
      <span className="text-[13px] leading-snug text-[var(--ink-muted)]">{note}</span>
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  inputMode,
  placeholder,
  hint,
  required,
  multiline,
  invalid,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
  inputMode?: "numeric" | "text";
  placeholder?: string;
  hint?: string;
  required?: boolean;
  multiline?: boolean;
  invalid?: boolean;
}) {
  const base = `w-full border bg-[var(--surface-raised)] px-3 py-3 font-[family-name:var(--font-barlow)] text-[15px] text-[var(--ink)] transition-colors placeholder:text-[var(--ink-faint)] focus-visible:outline-2 focus-visible:outline-offset-[-1px] focus-visible:outline-[var(--accent)] ${
    invalid ? "border-[var(--danger)]" : "border-[var(--line-strong)]"
  }`;

  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-[family-name:var(--font-barlow)] text-[13px] font-semibold text-[var(--ink)]">
        {label}
      </span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          rows={3}
          className={`${base} resize-y`}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          inputMode={inputMode}
          placeholder={placeholder}
          required={required}
          aria-invalid={invalid || undefined}
          className={base}
        />
      )}
      {hint ? <span className="text-[12.5px] text-[var(--ink-faint)]">{hint}</span> : null}
    </label>
  );
}
