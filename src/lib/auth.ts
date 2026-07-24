import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import type { Organization, User } from "@/generated/prisma/client";

export type AuthContext = {
  user: User;
  organization: Organization;
};

// Every authenticated page/action calls this (or requireAuthContext) to get
// the org-scoped identity — organization.id is what every Prisma query below
// must filter by.
export async function getAuthContext(): Promise<AuthContext | null> {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    include: { organization: true },
  });

  if (!user) return null;

  const { organization, ...rest } = user;
  return { user: rest, organization };
}

export async function requireAuthContext(): Promise<AuthContext> {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  return ctx;
}
