"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuthContext } from "@/lib/auth";
import { canApproveWholesale } from "@/lib/permissions";

export type WholesaleReviewState = { error?: string };

// Approving a wholesale application is what grants someone trade pricing, so
// it is gated exactly like every other mutating action: auth first, then the
// role predicate, then an org-scoped write.
export async function reviewWholesaleApplication(
  _prev: WholesaleReviewState,
  formData: FormData,
): Promise<WholesaleReviewState> {
  const { organization, user } = await requireAuthContext();
  if (!canApproveWholesale(user.role)) {
    return { error: "You don't have permission to review trade applications." };
  }

  const id = String(formData.get("id") || "");
  const decision = String(formData.get("decision") || "");
  const note = String(formData.get("note") || "").trim().slice(0, 500) || null;

  if (decision !== "APPROVE" && decision !== "REJECT") return { error: "Invalid decision." };

  const approved = decision === "APPROVE";

  // updateMany, not update — the organizationId filter is enforced by the
  // database, so a forged id can't reach another org's customer.
  const result = await prisma.customerAccount.updateMany({
    where: { id, organizationId: organization.id },
    data: {
      // tier is the single field that decides what someone is charged.
      // Rejecting leaves them on RETAIL rather than inventing a third state.
      tier: approved ? "WHOLESALE" : "RETAIL",
      wholesaleStatus: approved ? "APPROVED" : "REJECTED",
      wholesaleNote: note,
      reviewedAt: new Date(),
      reviewedById: user.id,
    },
  });

  if (result.count === 0) return { error: "That customer was not found." };

  revalidatePath("/customers");
  return {};
}

// Revoking is separate from rejecting: this is for an account that WAS
// approved and shouldn't be any more (a shop that closed, or one that turned
// out to be a competitor). It drops them to retail pricing immediately.
export async function revokeWholesale(formData: FormData) {
  const { organization, user } = await requireAuthContext();
  if (!canApproveWholesale(user.role)) return;

  const id = String(formData.get("id") || "");
  if (!id) return;

  await prisma.customerAccount.updateMany({
    where: { id, organizationId: organization.id },
    data: {
      tier: "RETAIL",
      wholesaleStatus: "REJECTED",
      reviewedAt: new Date(),
      reviewedById: user.id,
    },
  });

  revalidatePath("/customers");
}
