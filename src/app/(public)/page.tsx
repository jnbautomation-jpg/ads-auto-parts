import type { Metadata } from "next";
import { alternatesFor } from "@/lib/i18n";
import { getViewerTier } from "@/lib/customer-auth";
import { LandingView } from "./landing-view";

export const metadata: Metadata = {
  alternates: alternatesFor("en", "/"),
};

export default async function LandingPage() {
  // Same predicate the catalog header uses, so "Sign in" versus "My account"
  // cannot disagree between the homepage and the catalog.
  const signedIn = (await getViewerTier()) !== "GUEST";
  return <LandingView locale="en" signedIn={signedIn} />;
}
