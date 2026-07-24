import { prisma } from "@/lib/prisma";
import { requireAuthContext } from "@/lib/auth";
import { parseQuoteMessage, formatReceivedDate } from "@/lib/inquiry";
import { cardClass, mutedClass, pageHeadingClass, tableHeaderRowClass, tableRowClass } from "@/lib/admin-ui";

const ROW_COLS = "grid-cols-[100px_1fr_130px_1.2fr_1fr_90px]";

const STATUS_COLOR: Record<string, string> = {
  NEW: "#E31E24",
  CONTACTED: "#555",
  CLOSED: "#aaa",
};

export default async function InquiriesPage() {
  const { organization } = await requireAuthContext();

  const inquiries = await prisma.inquiry.findMany({
    where: { organizationId: organization.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col items-start gap-1 md:flex-row md:items-baseline md:justify-between md:gap-0">
        <h1 className={pageHeadingClass}>Inquiries</h1>
        <p className={mutedClass}>Quote requests from the public site</p>
      </div>

      <div className={cardClass}>
        {/* Desktop dense table */}
        <div className="hidden md:block">
          <div className={`${tableHeaderRowClass} ${ROW_COLS}`}>
            <div>RECEIVED</div>
            <div>NAME</div>
            <div>PHONE</div>
            <div>VEHICLE</div>
            <div>PART</div>
            <div>STATUS</div>
          </div>
          {inquiries.length === 0 ? (
            <p className="px-3.5 py-8 text-center text-sm text-[#8a8a8a]">No inquiries yet.</p>
          ) : (
            inquiries.map((inquiry) => {
              const { vehicle, part } = parseQuoteMessage(inquiry.message);
              return (
                <div key={inquiry.id} className={`${tableRowClass} ${ROW_COLS} last:border-b-0 hover:bg-[#f7f7f7]`}>
                  <div className="text-[#8a8a8a]">{formatReceivedDate(inquiry.createdAt)}</div>
                  <div className="truncate font-semibold">{inquiry.name}</div>
                  <div className="truncate text-[#555]">{inquiry.phone ?? "—"}</div>
                  <div className="truncate">{vehicle}</div>
                  <div className="truncate text-[#555]">{part}</div>
                  <div
                    className="font-[family-name:var(--font-oswald)] text-[10.5px] font-bold tracking-[0.14em]"
                    style={{ color: STATUS_COLOR[inquiry.status] ?? "#555" }}
                  >
                    {inquiry.status}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Mobile stacked cards */}
        <div className="flex flex-col md:hidden">
          {inquiries.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-[#8a8a8a]">No inquiries yet.</p>
          ) : (
            inquiries.map((inquiry) => {
              const { vehicle, part } = parseQuoteMessage(inquiry.message);
              return (
                <div key={inquiry.id} className="flex flex-col gap-1 border-b border-black/5 px-4 py-3 last:border-b-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-semibold">{inquiry.name}</div>
                    <div
                      className="shrink-0 font-[family-name:var(--font-oswald)] text-[10.5px] font-bold tracking-[0.14em]"
                      style={{ color: STATUS_COLOR[inquiry.status] ?? "#555" }}
                    >
                      {inquiry.status}
                    </div>
                  </div>
                  <div className="text-[13px] text-[#555]">{inquiry.phone ?? "—"}</div>
                  <div className="text-[13px]">{vehicle}</div>
                  <div className="text-[13px] text-[#555]">{part}</div>
                  <div className="text-[12px] text-[#8a8a8a]">{formatReceivedDate(inquiry.createdAt)}</div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
