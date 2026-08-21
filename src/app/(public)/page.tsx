import type { Metadata } from "next";
import { alternatesFor } from "@/lib/i18n";
import { LandingView } from "./landing-view";

export const metadata: Metadata = {
  alternates: alternatesFor("en", "/"),
};

export default async function LandingPage() {
  return <LandingView locale="en" />;
}
