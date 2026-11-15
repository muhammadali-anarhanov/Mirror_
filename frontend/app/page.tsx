import type { Metadata } from "next";
import { MarketingHome } from "@/components/marketing-home";

export const metadata: Metadata = {
  title: "MIRROR — Virtual fitting and retail management",
  description:
    "MIRROR helps fashion retailers connect virtual fitting experiences with product catalogs, branches, and in-store operations.",
};

export default function Home() {
  return <MarketingHome />;
}
