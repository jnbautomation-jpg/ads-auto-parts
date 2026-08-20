import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireCustomerContext } from "@/lib/customer-auth";
import { formatFit } from "@/lib/format";
import { RETAIL_MARKUP_USD } from "@/lib/pricing";
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

export default async function AccountPage() {
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
          <h1 className={h1Class}>Your account</h1>
          <p className={bodyClass}>{account.email}</p>
        </div>
        <form action={signOutCustomer}>
          <button
            type="submit"
            className="font-[family-name:var(--font-barlow)] text-[13px] font-semibold text-[#8A8A8A] underline transition-colors hover:text-white"
          >
            Sign out
          </button>
        </form>
      </header>

      {/* --- Pricing tier --- */}
      <section className="flex flex-col gap-3 border border-white/10 bg-[#111] p-5 lg:p-6">
        <span className={eyebrowClass}>Your pricing</span>
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`${badgeClass} ${
              isWholesale ? "border-[#E31E24] text-[#E31E24]" : "border-white/25 text-white"
            }`}
          >
            {isWholesale ? "Trade account" : "Retail"}
          </span>
          <p className={bodyClass}>
            {isWholesale
              ? "You're seeing wholesale pricing across the catalog."
              : `You're seeing retail pricing — that's wholesale plus $${RETAIL_MARKUP_USD} per part.`}
          </p>
        </div>
      </section>

      {/* --- Wholesale application --- */}
      {!isWholesale ? (
        <section className="flex flex-col gap-3 border border-white/10 bg-[#111] p-5 lg:p-6">
          <span className={eyebrowClass}>Trade pricing</span>

          {status === "PENDING" ? (
            <>
              <h2 className={subHeadingClass}>Application received</h2>
              <p className={bodyClass}>
                We&apos;re reviewing it. Applications are approved by a person, not automatically,
                so give us a little time — call{" "}
                <a href={`tel:${PHONE_HREF}`} className="text-white underline">
                  {PHONE_DISPLAY}
                </a>{" "}
                if it&apos;s urgent.
              </p>
            </>
          ) : status === "REJECTED" ? (
            <>
              <h2 className={subHeadingClass}>We couldn&apos;t approve that application</h2>
              {account.wholesaleNote ? <p className={bodyClass}>{account.wholesaleNote}</p> : null}
              <p className={bodyClass}>
                If something has changed, you can apply again below or call us.
              </p>
              <WholesaleApplicationForm defaultPhone={account.phone ?? ""} />
            </>
          ) : (
            <>
              <h2 className={subHeadingClass}>Are you a body shop?</h2>
              <p className={bodyClass}>
                Trade accounts get wholesale pricing on every part. Tell us who you are and
                we&apos;ll set it up — we approve these by hand.
              </p>
              <WholesaleApplicationForm defaultPhone={account.phone ?? ""} />
            </>
          )}
        </section>
      ) : null}

      {/* --- Orders --- */}
      <section className="flex flex-col gap-3 border border-white/10 bg-[#111] p-5 lg:p-6">
        <span className={eyebrowClass}>Orders</span>
        <p className={bodyClass}>
          Your order history, and one-click reordering of anything you&apos;ve bought before.
        </p>
        <Link href="/account/orders" className={`${secondaryButtonClass} self-start`}>
          View orders
        </Link>
      </section>

      {/* --- Saved vehicles --- */}
      <section className="flex flex-col gap-4 border border-white/10 bg-[#111] p-5 lg:p-6">
        <div className="flex flex-col gap-1.5">
          <span className={eyebrowClass}>Saved vehicles</span>
          <p className={bodyClass}>
            The cars you work on most. Saves retyping them every time you need a part.
          </p>
        </div>

        {vehicles.length > 0 ? (
          <ul className="flex flex-col divide-y divide-white/10 border-y border-white/10">
            {vehicles.map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-3 py-3">
                <Link
                  href={`/catalog?year=${v.year}&make=${encodeURIComponent(v.make)}&model=${encodeURIComponent(v.model)}`}
                  className="font-[family-name:var(--font-barlow)] text-[15px] font-medium text-white hover:text-[#E31E24]"
                >
                  {formatFit(v.make, v.model, v.year, v.year)}
                </Link>
                <form action={deleteVehicle}>
                  <input type="hidden" name="id" value={v.id} />
                  <button
                    type="submit"
                    aria-label={`Remove ${v.year} ${v.make} ${v.model}`}
                    className="font-[family-name:var(--font-barlow)] text-[13px] text-[#8A8A8A] transition-colors hover:text-[#f87171]"
                  >
                    Remove
                  </button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="font-[family-name:var(--font-barlow)] text-[14px] text-[#8A8A8A]">
            Nothing saved yet.
          </p>
        )}

        <SaveVehicleForm />
      </section>

      <Link
        href="/catalog"
        className="text-center font-[family-name:var(--font-barlow)] text-[12px] font-semibold tracking-[0.14em] text-[#777] transition-colors hover:text-[#ccc]"
      >
        ← BACK TO CATALOG
      </Link>
    </main>
  );
}
