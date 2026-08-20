import type { Metadata } from "next";
import { alternatesFor } from "@/lib/i18n";
import { SITE_URL } from "@/lib/site";
import { ReturnsView } from "./returns-view";

export const metadata: Metadata = {
  title: "Returns & warranty",
  description:
    "How returns, freight damage and warranty claims work on aftermarket body parts from ADS Auto Door Store, Orlando.",
  alternates: alternatesFor("en", "/returns"),
  openGraph: { url: `${SITE_URL}/returns`, title: "Returns & warranty" },
};

export default function ReturnsPage() {
  return <ReturnsView locale="en" />;
}
