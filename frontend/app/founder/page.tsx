import type { Metadata } from "next";
import "../portfolio.css";
import { PortfolioSite } from "@/components/portfolio-site";

export const metadata: Metadata = {
  title: "Founder introduction | MIRROR",
  description:
    "Meet Muhammad Ali Anarhanov, the founder building MIRROR for fashion retail and virtual fitting experiences.",
};

export default function FounderPage() {
  return <PortfolioSite />;
}
