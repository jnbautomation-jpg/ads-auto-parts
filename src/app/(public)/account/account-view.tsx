import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireCustomerContext } from "@/lib/customer-auth";
import { formatFit } from "@/lib/format";
import { PHONE_DISPLAY, PHONE_HREF } from "@/lib/site";
import {
  badgeClass,
  bodyClass,
  eyebrowClass,
  h1Class,
  secondaryButtonClass,
  subHeadingClass,
} from "@/lib/public-ui";
import { SaveVehicleForm, WholesaleApplicationForm } from "./account-forms";
import { deleteVehicle, signOutCustomer } from "./actions";
import { localePath, type Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";

export async function AccountView({ locale }: { locale: Locale }) {
  const a = getDictionary(locale).account;
  const { account } = await requireCustomerContext();

  const vehicles = await prisma.savedVehicle.findMany({
    where: { customerAccountId: account.id },
    orderBy: [{ make: "asc" }, { model: "asc" }, { year: "desc" }],
  });

  const isWholesale = account.tier === "WHOLESALE";
  const status = account.wholesaleStatus;

  return (
    <main className="mx-auto flex min-h-screen max-w-[860px] flex-col gap-9 px-5 py-12 lg:py-16">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className={h1Class}>{a.title}</h1>
          <p className={bodyClass}>{account.email}</p>
        </div>
        <form action={signOutCustomer}>
          <button
            type="submit"
            className="font-[family-name:var(--font-barlow)] text-[13px] font-semibold text-[var(--ink-faint)] underline transition-colors hover:text-[var(--ink)]"
          >
            {a.signOut}
          </button>
        </form>
      </header>

      {/* --- Pricing tier --- */}
      <section className="flex flex-col gap-3 border border-[var(--line)] bg-[var(--surface-raised)] p-5 lg:p-6">
        <span className={eyebrowClass}>{a.yourPricing}</span>
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`${badgeClass} ${
              isWholesale ? "border-[var(--accent)] text-[var(--accent)]" : "border-[var(--line-strong)] text-[var(--ink)]"
            }`}
          >
            {isWholesale ? a.tradeAccount : a.retail}
          </span>
          <p className={bodyClass}>
            {isWholesale ? a.wholesaleActive : a.retailExplain}
          </p>
        </div>
      </section>

      {/* --- Wholesale application --- */}
      {!isWholesale ? (
        <section className="flex flex-col gap-3 border border-[var(--line)] bg-[var(--surface-raised)] p-5 lg:p-6">
          <span className={eyebrowClass}>{a.tradeHeading}</span>

          {status === "PENDING" ? (
            <>
              <h2 className={subHeadingClass}>{a.applicationReceived}</h2>
              <p className={bodyClass}>
                We&apos;re reviewing it. Applications are approved by a person, not automatically,
                so give us a little time — call{" "}
                <a href={`tel:${PHONE_HREF}`} className="text-[var(--ink)] underline">
                  {PHONE_DISPLAY}
                </a>{" "}
                if it&apos;s urgent.
              </p>
            </>
          ) : status === "REJECTED" ? (
            <>
              <h2 className={subHeadingClass}>{a.applicationRejected}</h2>
              {account.wholesaleNote ? <p className={bodyClass}>{account.wholesaleNote}</p> : null}
              <p className={bodyClass}>{a.applyAgain}</p>
              <WholesaleApplicationForm defaultPhone={account.phone ?? ""} locale={locale} />
            </>
          ) : (
            <>
              <h2 className={subHeadingClass}>{a.areYouAShop}</h2>
              <p className={bodyClass}>{a.applyIntro}</p>
              <WholesaleApplicationForm defaultPhone={account.phone ?? ""} />
            </>
          )}
        </section>
      ) : null}

      {/* --- Orders --- */}
      <section className="flex flex-col gap-3 border border-[var(--line)] bg-[var(--surface-raised)] p-5 lg:p-6">
        <span className={eyebrowClass}>{a.ordersHeading}</span>
        <p className={bodyClass}>
{a.ordersIntro}
        </p>
        <Link href={localePath(locale, "/account/orders")} className={`${secondaryButtonClass} self-start`}>
          {a.viewOrders}
        </Link>
      </section>

      {/* --- Saved vehicles --- */}
      <section className="flex flex-col gap-4 border border-[var(--line)] bg-[var(--surface-raised)] p-5 lg:p-6">
        <div className="flex flex-col gap-1.5">
          <span className={eyebrowClass}>{a.savedVehicles}</span>
          <p className={bodyClass}>
{a.savedVehiclesIntro}
          </p>
        </div>

        {vehicles.length > 0 ? (
          <ul className="flex flex-col divide-y divide-[var(--line)] border-y border-[var(--line)]">
            {vehicles.map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-3 py-3">
                <Link
                  href={`${localePath(locale, "/catalog")}?year=${v.year}&make=${encodeURIComponent(v.make)}&model=${encodeURIComponent(v.model)}`}
                  className="font-[family-name:var(--font-barlow)] text-[15px] font-medium text-[var(--ink)] hover:text-[var(--accent)]"
                >
                  {formatFit(v.make, v.model, v.year, v.year)}
                </Link>
                <form action={deleteVehicle}>
                  <input type="hidden" name="id" value={v.id} />
                  <button
                    type="submit"
                    aria-label={`Remove ${v.year} ${v.make} ${v.model}`}
                    className="font-[family-name:var(--font-barlow)] text-[13px] text-[var(--ink-faint)] transition-colors hover:text-[var(--danger)]"
                  >
                    {a.remove}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="font-[family-name:var(--font-barlow)] text-[14px] text-[var(--ink-faint)]">
            {a.nothingSaved}
          </p>
        )}

        <SaveVehicleForm locale={locale} />
      </section>

      <Link
        href={localePath(locale, "/catalog")}
        className="text-center font-[family-name:var(--font-barlow)] text-[12px] font-semibold tracking-[0.14em] text-[var(--ink-faint)] transition-colors hover:text-[var(--ink-muted)]"
      >
        {getDictionary(locale).nav.backToCatalog.toUpperCase()}
      </Link>
    </main>
  );
}
