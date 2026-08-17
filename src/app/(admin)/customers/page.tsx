import { prisma } from "@/lib/prisma";
import { requireAuthContext } from "@/lib/auth";
import { canApproveWholesale } from "@/lib/permissions";
import { formatReceivedDate } from "@/lib/inquiry";
import { cardClass, mutedClass, pageHeadingClass, sectionLabelClass } from "@/lib/admin-ui";
import { CustomerRow } from "./customer-row";

export default async function CustomersPage() {
  const { organization, user } = await requireAuthContext();
  const canReview = canApproveWholesale(user.role);

  const [pending, others] = await Promise.all([
    // The review queue — oldest first, because a shop waiting on trade
    // pricing is a shop not ordering.
    prisma.customerAccount.findMany({
      where: { organizationId: organization.id, wholesaleStatus: "PENDING" },
      orderBy: { appliedAt: "asc" },
    }),
    prisma.customerAccount.findMany({
      where: { organizationId: organization.id, NOT: { wholesaleStatus: "PENDING" } },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

  return (
    <div className="flex max-w-5xl flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className={pageHeadingClass}>Customers</h1>
        <span className={mutedClass}>
          {pending.length} awaiting review · {others.length} other{others.length === 1 ? "" : "s"}
        </span>
      </div>

      {!canReview ? (
        <p className="border border-black/10 bg-white px-3.5 py-2.5 text-sm text-[#8a8a8a]">
          You can view customer accounts, but only an owner or manager can approve trade pricing.
        </p>
      ) : null}

      <section className="flex flex-col gap-2">
        <h2 className={sectionLabelClass}>AWAITING REVIEW</h2>
        <div className={`${cardClass} flex flex-col`}>
          {pending.length === 0 ? (
            <p className="px-3.5 py-8 text-center text-sm text-[#8a8a8a]">
              No trade applications waiting.
            </p>
          ) : (
            pending.map((c) => (
              <CustomerRow
                key={c.id}
                customer={{
                  id: c.id,
                  email: c.email,
                  name: c.name,
                  phone: c.phone,
                  companyName: c.companyName,
                  tier: c.tier,
                  wholesaleStatus: c.wholesaleStatus,
                  appliedLabel: c.appliedAt ? formatReceivedDate(c.appliedAt) : "—",
                }}
                canReview={canReview}
              />
            ))
          )}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className={sectionLabelClass}>ALL ACCOUNTS</h2>
        <div className={`${cardClass} flex flex-col`}>
          {others.length === 0 ? (
            <p className="px-3.5 py-8 text-center text-sm text-[#8a8a8a]">No customer accounts yet.</p>
          ) : (
            others.map((c) => (
              <CustomerRow
                key={c.id}
                customer={{
                  id: c.id,
                  email: c.email,
                  name: c.name,
                  phone: c.phone,
                  companyName: c.companyName,
                  tier: c.tier,
                  wholesaleStatus: c.wholesaleStatus,
                  appliedLabel: c.appliedAt ? formatReceivedDate(c.appliedAt) : "—",
                }}
                canReview={canReview}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
}
