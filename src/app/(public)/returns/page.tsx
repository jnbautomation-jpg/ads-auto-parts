import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import { ReturnsView } from "./returns-view";

export const metadata: Metadata = pageMetadata("en", "/returns", {
  title: "Returns & warranty",
  description:
    "How returns, freight damage and warranty claims work on aftermarket body parts from ADS Auto Door Store, Orlando.",
});

export default function ReturnsPage() {
  return <ReturnsView locale="en" />;
}
