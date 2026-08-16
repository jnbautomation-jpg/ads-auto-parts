import { describe, expect, it } from "vitest";
import type { UserRole } from "@/generated/prisma/enums";
import {
  ASSIGNABLE_ROLES,
  ROLE_LABEL,
  canBulkDelete,
  canEditCatalog,
  canManageStaff,
  canRecordStock,
} from "./permissions";

const ALL_ROLES: UserRole[] = ["OWNER", "ADMIN", "STAFF"];

// These predicates gate every mutating server action, so the table below is
// the authoritative statement of who can do what. A change here should be a
// deliberate product decision, not an accident.
describe("role predicates", () => {
  it("restricts staff management to the owner", () => {
    expect(canManageStaff("OWNER")).toBe(true);
    expect(canManageStaff("ADMIN")).toBe(false);
    expect(canManageStaff("STAFF")).toBe(false);
  });

  it("restricts bulk delete to the owner", () => {
    expect(canBulkDelete("OWNER")).toBe(true);
    expect(canBulkDelete("ADMIN")).toBe(false);
    expect(canBulkDelete("STAFF")).toBe(false);
  });

  it("allows owner and manager to edit the catalog, but not staff", () => {
    expect(canEditCatalog("OWNER")).toBe(true);
    expect(canEditCatalog("ADMIN")).toBe(true);
    expect(canEditCatalog("STAFF")).toBe(false);
  });

  it("allows every authenticated role to record stock", () => {
    for (const role of ALL_ROLES) {
      expect(canRecordStock(role)).toBe(true);
    }
  });
});

describe("role labels", () => {
  // The client calls this role "Manager"; the enum value stays ADMIN. This
  // test exists so a rename in the UI can't silently drift from the enum.
  it("displays ADMIN as Manager", () => {
    expect(ROLE_LABEL.ADMIN).toBe("Manager");
  });

  it("labels every role in the enum", () => {
    for (const role of ALL_ROLES) {
      expect(ROLE_LABEL[role]).toBeTruthy();
    }
  });

  it("never offers OWNER in the add-staff picker", () => {
    // A second owner is a deliberate out-of-band action via
    // scripts/seed-owner.ts — never a UI click.
    expect(ASSIGNABLE_ROLES).not.toContain("OWNER");
    expect(ASSIGNABLE_ROLES).toEqual(["ADMIN", "STAFF"]);
  });
});
