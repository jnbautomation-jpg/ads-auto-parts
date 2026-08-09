"use client";

import { changeStaffRole, removeStaffUser } from "@/app/(admin)/staff/actions";
import { ASSIGNABLE_ROLES, ROLE_LABEL } from "@/lib/permissions";
import { inputClass, STAFF_COLS, tableRowClass } from "@/lib/admin-ui";
import type { UserRole } from "@/generated/prisma/enums";

export type StaffMember = {
  id: string;
  email: string;
  role: UserRole;
  isSelf: boolean;
};

export function StaffRow({ member }: { member: StaffMember }) {
  // The owner row (and, if this org somehow ever has two, any other OWNER)
  // is display-only here — no self-demote, no self-removal, no touching
  // another owner from this page.
  const locked = member.role === "OWNER" || member.isSelf;

  return (
    <div className={`${tableRowClass} ${STAFF_COLS} h-11 last:border-b-0 hover:bg-[#f7f7f7]`}>
      <div className="truncate font-semibold">
        {member.email}
        {member.isSelf ? <span className="ml-1.5 font-normal text-[#8a8a8a]">(you)</span> : null}
      </div>
      <div>
        {locked ? (
          <span className="text-[#555]">{ROLE_LABEL[member.role]}</span>
        ) : (
          <form action={changeStaffRole}>
            <input type="hidden" name="id" value={member.id} />
            <select
              name="role"
              defaultValue={member.role}
              onChange={(e) => e.currentTarget.form?.requestSubmit()}
              className={`${inputClass} h-8`}
            >
              {ASSIGNABLE_ROLES.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABEL[role]}
                </option>
              ))}
            </select>
          </form>
        )}
      </div>
      <div className="flex justify-end">
        {locked ? (
          <span className="text-[#bbb]">—</span>
        ) : (
          <form
            action={removeStaffUser}
            onSubmit={(e) => {
              if (!confirm(`Remove ${member.email}? They lose access immediately.`)) e.preventDefault();
            }}
          >
            <input type="hidden" name="id" value={member.id} />
            <button
              type="submit"
              className="font-[family-name:var(--font-barlow)] text-xs font-semibold text-[#8a8a8a] hover:text-[#E31E24]"
            >
              Remove
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
