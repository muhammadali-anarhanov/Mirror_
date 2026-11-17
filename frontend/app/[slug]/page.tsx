import { cookies } from "next/headers";
import { isLanguage, translateText } from "@/lib/i18n";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MarketingArticle, MarketingLeadPage } from "@/components/marketing-pages";
import { marketingPages } from "@/lib/marketing-content";
import type { ApplicationType } from "@/lib/database-schema";

const leadPages: Record<string, { applicationType: ApplicationType; title: string; description: string }> = {
  "request-demo": {
    applicationType: "DEMO",
    title: "Try MIRROR in your business",
    description:
      "Tell us about your catalog, branches and devices. Our team will arrange a demo and next steps with you.",
  },
  contact: {
    applicationType: "CONTACT",
    title: "Contact us",
    description:
      "Have a question, partnership idea or project request? Leave a short message and we will connect you with the right team.",
  },
  partnerships: {
    applicationType: "PARTNERSHIP",
    title: "Start a partnership with MIRROR",
    description:
      "Share your ideas for a brand, store network or technology partnership. We will review your information and agree on next steps together.",
  },
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const leadPage = leadPages[slug];
  const contentPage = marketingPages[slug];
  const title = leadPage?.title ?? contentPage?.title;
  const stored = (await cookies()).get("mirror_language")?.value;
  const language = isLanguage(stored) ? stored : "EN";

  return {
    title: title ? `${translateText(language, title)} | MIRROR` : "MIRROR — Virtual fitting & retail",
    description: translateText(language, leadPage?.description ?? contentPage?.description ?? ""),
  };
}

export default async function PublicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const leadPage = leadPages[slug];

  if (leadPage) {
    return <MarketingLeadPage {...leadPage} />;
  }

  const contentPage = marketingPages[slug];
  if (!contentPage) {
    notFound();
  }

  return <MarketingArticle page={contentPage} slug={slug} />;
}
