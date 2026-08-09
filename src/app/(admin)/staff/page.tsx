import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAuthContext } from "@/lib/auth";
import { canManageStaff } from "@/lib/permissions";
import { cardClass, mutedClass, pageHeadingClass, STAFF_COLS, tableHeaderRowClass } from "@/lib/admin-ui";
import { StaffAddForm } from "@/components/staff-add-form";
import { StaffRow } from "@/components/staff-row";

export default async function StaffPage() {
  const { organization, user } = await requireAuthContext();
  if (!canManageStaff(user.role)) notFound();

  const staff = await prisma.user.findMany({
    where: { organizationId: organization.id },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col items-start gap-1 md:flex-row md:items-baseline md:justify-between md:gap-0">
        <h1 className={pageHeadingClass}>Staff</h1>
        <p className={mutedClass}>Who can sign in and what they can do</p>
      </div>

      <div className={`${cardClass} p-3.5`}>
        <StaffAddForm />
      </div>

      <div className={cardClass}>
        <div className={`${tableHeaderRowClass} ${STAFF_COLS}`}>
          <div>EMAIL</div>
          <div>ROLE</div>
          <div />
        </div>
        {staff.map((member) => (
          <StaffRow
            key={member.id}
            member={{ id: member.id, email: member.email, role: member.role, isSelf: member.id === user.id }}
          />
        ))}
      </div>
    </div>
  );
}
