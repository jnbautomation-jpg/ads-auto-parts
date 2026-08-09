import type { UserRole } from "@/generated/prisma/enums";

// Single source of truth for "who can do what" — used identically to gate
// server actions (the real boundary) and to hide/disable buttons in the UI.
// ADMIN is shown to staff as "Manager"; the underlying enum is unchanged.
export const ROLE_LABEL: Record<UserRole, string> = {
  OWNER: "Owner",
  ADMIN: "Manager",
  STAFF: "Staff",
};

// "Add staff" role picker never offers OWNER — a second owner is a
// deliberate, out-of-band action via scripts/seed-owner.ts, not a UI click.
export const ASSIGNABLE_ROLES: UserRole[] = ["ADMIN", "STAFF"];

export function canManageStaff(role: UserRole): boolean {
  return role === "OWNER";
}

export function canBulkDelete(role: UserRole): boolean {
  return role === "OWNER";
}

// Products, suppliers, and inventory import — create/edit/delete/publish.
export function canEditCatalog(role: UserRole): boolean {
  return role === "OWNER" || role === "ADMIN";
}

// Recording stock in/out. Every authenticated role can do this today, but
// kept as a named predicate (not just "always true" inline) so call sites
// read the same way as every other check and stay correct if that changes.
export function canRecordStock(role: UserRole): boolean {
  void role;
  return true;
}
