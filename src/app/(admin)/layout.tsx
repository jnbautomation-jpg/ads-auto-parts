import type { Metadata } from "next";
import { Oswald, Barlow } from "next/font/google";
import Link from "next/link";
import { requireAuthContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canEditCatalog, canManageStaff } from "@/lib/permissions";
import { AdminSidebar } from "@/components/admin-sidebar";
import { signOut } from "./sign-out-action";

// Applies to every page under (admin) — none of them define their own
// `metadata`, so nothing here overrides this.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

const oswald = Oswald({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-oswald",
});

const barlow = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-barlow",
});

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { organization, user } = await requireAuthContext();

  const [newInquiries, pendingWholesale, newOrders] = await Promise.all([
    prisma.inquiry.count({ where: { organizationId: organization.id, status: "NEW" } }),
    // Badged like inquiries: a trade application sitting unreviewed is a
    // shop that can't order at its price yet.
    prisma.customerAccount.count({
      where: { organizationId: organization.id, wholesaleStatus: "PENDING" },
    }),
    // Unfulfilled orders are the most time-sensitive thing on the dashboard.
    prisma.order.count({ where: { organizationId: organization.id, status: "NEW" } }),
  ]);

  const NAV = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/products", label: "Products" },
    { href: "/suppliers", label: "Suppliers" },
    ...(canEditCatalog(user.role) ? [{ href: "/import", label: "Import" }] : []),
    { href: "/orders", label: "Orders", badge: newOrders },
    { href: "/inquiries", label: "Inquiries", badge: newInquiries },
    { href: "/customers", label: "Customers", badge: pendingWholesale },
    ...(canManageStaff(user.role) ? [{ href: "/staff", label: "Staff" }] : []),
  ];

  return (
    <div
      className={`${oswald.variable} ${barlow.variable} flex min-h-screen bg-[#FAFAFA] font-[family-name:var(--font-barlow)] text-black`}
    >
      <AdminSidebar
        nav={NAV}
        userEmail={user.email}
        footer={
          <>
            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-[family-name:var(--font-barlow)] text-xs font-semibold tracking-[0.08em] text-[#555] transition-colors hover:text-black"
            >
              VIEW SITE ↗
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="font-[family-name:var(--font-barlow)] text-xs font-medium text-[#999] transition-colors hover:text-black"
              >
                Sign out
              </button>
            </form>
          </>
        }
      />
      <main className="min-w-0 flex-1 px-4 pb-5 pt-[72px] md:px-6 md:py-5">{children}</main>
    </div>
  );
}
