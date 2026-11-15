import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MarketingArticle, MarketingLeadPage } from "@/components/marketing-pages";
import { marketingPages } from "@/lib/marketing-content";
import type { ApplicationType } from "@/lib/database-schema";

const leadPages: Record<string, { applicationType: ApplicationType; title: string; description: string }> = {
  "request-demo": {
    applicationType: "DEMO",
    title: "MIRROR’ni biznesingizda sinab ko‘ring",
    description:
      "Mahsulot katalogingiz, filiallar va kerakli qurilmalar haqida yozing. Jamoamiz siz bilan demo va keyingi qadamlarni kelishadi.",
  },
  contact: {
    applicationType: "CONTACT",
    title: "Biz bilan bog‘laning",
    description:
      "Savolingiz, hamkorlik g‘oyangiz yoki loyiha talabi bormi? Qisqa ma’lumot qoldiring — so‘rovingizni tegishli jamoaga yo‘naltiramiz.",
  },
  partnerships: {
    applicationType: "PARTNERSHIP",
    title: "MIRROR bilan hamkorlikni boshlang",
    description:
      "Brend, do‘kon tarmog‘i yoki texnologik hamkorlik bo‘yicha g‘oyangizni yuboring. Kerakli ma’lumotlarni ko‘rib chiqib, keyingi qadamlarni birga belgilaymiz.",
  },
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const leadPage = leadPages[slug];
  const contentPage = marketingPages[slug];
  const title = leadPage?.title ?? contentPage?.title;

  return {
    title: title ? `${title} | MIRROR` : "MIRROR — Virtual fitting & retail",
    description: leadPage?.description ?? contentPage?.description,
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
