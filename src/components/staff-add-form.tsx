"use client";

import { useActionState, useRef } from "react";
import { createStaffUser, type StaffFormState } from "@/app/(admin)/staff/actions";
import { ASSIGNABLE_ROLES, ROLE_LABEL } from "@/lib/permissions";
import { buttonPrimaryClass, inputClass, labelClass } from "@/lib/admin-ui";

const initialState: StaffFormState = {};

export function StaffAddForm() {
  const formRef = useRef<HTMLFormElement>(null);

  const [state, formAction, pending] = useActionState<StaffFormState, FormData>(async (prev, formData) => {
    const result = await createStaffUser(prev, formData);
    if (!result.error) formRef.current?.reset();
    return result;
  }, initialState);

  return (
    <form ref={formRef} action={formAction} className="flex flex-wrap items-end gap-2">
      <label className={`${labelClass} w-full md:w-auto`}>
        EMAIL
        <input name="email" type="email" required disabled={pending} className={inputClass} />
      </label>
      <label className={`${labelClass} w-full md:w-auto`}>
        TEMP PASSWORD
        <input name="password" type="text" required minLength={8} disabled={pending} className={inputClass} />
      </label>
      <label className={`${labelClass} w-full md:w-auto`}>
        ROLE
        <select name="role" defaultValue={ASSIGNABLE_ROLES[1]} disabled={pending} className={inputClass}>
          {ASSIGNABLE_ROLES.map((role) => (
            <option key={role} value={role}>
              {ROLE_LABEL[role]}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" disabled={pending} className={`${buttonPrimaryClass} w-full md:w-auto`}>
        {pending ? "ADDING…" : "+ ADD STAFF"}
      </button>
      {state.error ? <p className="w-full text-xs font-semibold text-[#E31E24]">{state.error}</p> : null}
      <p className="w-full text-xs text-[#8a8a8a]">
        Give the temp password to the staff member directly — they&apos;ll be forced to set a new one on first login.
      </p>
    </form>
  );
}
