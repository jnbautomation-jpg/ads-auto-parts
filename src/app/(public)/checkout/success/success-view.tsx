import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getDictionary } from "@/lib/dictionaries";
import { formatMoneyIn } from "@/lib/format";
import { localePath, type Locale } from "@/lib/i18n";
import { orderNumberLabel } from "@/lib/orders";
import { ADDRESS, PHONE_DISPLAY, PHONE_HREF } from "@/lib/site";
import {
  bodyClass,
  eyebrowClass,
  h1Class,
  mutedClass,
  primaryButtonClass,
  secondaryButtonClass,
  subHeadingClass,
} from "@/lib/public-ui";
import { AwaitConfirmation } from "./await-confirmation";

/**
 * The page a customer lands on after paying.
 *
 * It reports what the webhook has already decided; it never decides anything
 * itself. Stripe sends the browser back here with ?payment_intent=..., and
 * the browser saying "that worked" is not evidence — a forged request would
 * otherwise mark an order paid.
 *
 * Looked up by PaymentIntent id and nothing else. Order numbers come off a
 * sequence, so a page that accepted ?order=ADS-1042 would hand the next
 * customer's order to anyone who added one.
 */
export async function CheckoutSuccessView({
  locale,
  paymentIntentId,
}: {
  locale: Locale;
  paymentIntentId: string | null;
}) {
  const dict = getDictionary(locale);

  const order = paymentIntentId
    ? await prisma.order.findUnique({
        where: { stripePaymentIntentId: paymentIntentId },
        // Deliberately narrow. This page is reachable by anyone holding the
        // intent id, so it shows what the buyer needs to identify their order
        // and nothing that would matter if the URL were shared — no address,
        // no phone number, no email.
        select: {
          orderNumber: true,
          paymentStatus: true,
          total: true,
          fulfillment: true,
        },
      })
    : null;

  const paid = order?.paymentStatus === "PAID";

  return (
    <main className="mx-auto w-full max-w-[720px] px-4 py-14 lg:px-8 lg:py-20">
      {order === null ? (
        // No matching order. Either the link was mistyped or someone arrived
        // here directly — say so plainly rather than implying a payment
        // failed, because we have no evidence either way.
        <>
          <h1 className={h1Class}>{dict.errors.notFoundTitle}</h1>
          <p className={`mt-4 ${bodyClass}`}>{dict.errors.notFoundBody}</p>
          <div className="mt-8 flex flex-wrap gap-2.5">
            <Link href={localePath(locale, "/catalog")} className={primaryButtonClass}>
              {dict.checkout.browseCatalog}
            </Link>
            <a href={`tel:${PHONE_HREF}`} className={secondaryButtonClass}>
              {PHONE_DISPLAY}
            </a>
          </div>
        </>
      ) : (
        <>
          <span className={eyebrowClass}>{dict.checkout.cartLabel}</span>

          {paid ? (
            <>
              <div className="mt-3 flex items-center gap-3">
                <PaidMark />
                <h1 className={h1Class}>{dict.checkout.successTitle}</h1>
              </div>
              <p className={`mt-4 max-w-[520px] ${bodyClass}`}>{dict.checkout.successBody}</p>
            </>
          ) : (
            <>
              <h1 className={`mt-3 ${h1Class}`}>{dict.checkout.processingTitle}</h1>
              <p className={`mt-4 max-w-[520px] ${bodyClass}`}>{dict.checkout.processingBody}</p>
              {/* Polls until the webhook lands. Without it a customer whose
                  bank took four seconds sits on "confirming" forever. */}
              <AwaitConfirmation />
            </>
          )}

          <div className="mt-10 border border-[var(--line)] bg-[var(--surface-raised)] p-6">
            <span className={eyebrowClass}>{dict.checkout.orderNumberLabel}</span>
            <p className="mt-1 font-[family-name:var(--font-oswald)] text-[32px] font-semibold leading-none">
              {orderNumberLabel(order.orderNumber)}
            </p>
            <p className={`mt-3 ${mutedClass}`}>{dict.checkout.keepNumber}</p>

            <div className="mt-6 flex items-baseline justify-between border-t border-[var(--line)] pt-4">
              <span className={bodyClass}>{dict.checkout.orderTotal}</span>
              <span className="font-[family-name:var(--font-oswald)] text-[22px] font-semibold">
                {formatMoneyIn(order.total.toString(), locale)}
              </span>
            </div>
          </div>

          <div className="mt-6 border-l-2 border-[var(--line-strong)] pl-4">
            <p className={subHeadingClass}>
              {order.fulfillment === "DELIVERY" ? dict.checkout.delivery : dict.checkout.pickup}
            </p>
            <p className={`mt-1 ${bodyClass}`}>
              {order.fulfillment === "DELIVERY" ? dict.checkout.deliveryNote : ADDRESS}
            </p>
          </div>

          <div className="mt-10 flex flex-wrap gap-2.5">
            <Link href={localePath(locale, "/catalog")} className={secondaryButtonClass}>
              {dict.checkout.browseCatalog}
            </Link>
            <a href={`tel:${PHONE_HREF}`} className={secondaryButtonClass}>
              {PHONE_DISPLAY}
            </a>
          </div>
        </>
      )}
    </main>
  );
}

/** Green rather than the brand red — this is a confirmation, not an action. */
function PaidMark() {
  return (
    <span
      aria-hidden="true"
      className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-[var(--stock-in)]"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      </svg>
    </span>
  );
}
