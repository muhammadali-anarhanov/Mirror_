import Link from "next/link";
import { ArrowRight, Check, ShieldCheck } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { ApplicationForm } from "@/components/application-form";
import { MarketingSiteShell } from "@/components/marketing-site";
import { faqItems, type MarketingPageContent } from "@/lib/marketing-content";
import type { ApplicationType } from "@/lib/database-schema";

export function MarketingArticle({ page, slug }: { page: MarketingPageContent; slug: string }) {
  return (
    <MarketingSiteShell>
      <article className="mx-auto max-w-7xl px-5 pb-20 pt-12 sm:px-8 sm:pt-16">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{page.eyebrow}</p>
          <h1 className="mt-5 font-sans text-4xl leading-[1.02] tracking-[-0.045em] sm:text-6xl">{page.title}</h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">{page.description}</p>
        </div>

        {slug === "faq" ? (
          <div className="mt-12 grid gap-3">
            {faqItems.map((item) => (
              <details className="group rounded-2xl border border-border bg-card px-5 py-4 sm:px-6" key={item.question}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
                  {item.question}
                  <span aria-hidden="true" className="text-primary transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="max-w-3xl pt-3 text-sm leading-6 text-muted-foreground">{item.answer}</p>
              </details>
            ))}
          </div>
        ) : (
          <div className="mt-12 grid gap-4 md:grid-cols-2">
            {page.sections.map((section, index) => (
              <section className="rounded-3xl border border-border bg-card p-6 sm:p-8" key={section.title}>
                <div className="flex size-10 items-center justify-center rounded-2xl bg-accent text-primary">
                  {slug === "privacy-security" ? <ShieldCheck aria-hidden="true" className="size-5" /> : <span className="font-sans text-lg">0{index + 1}</span>}
                </div>
                <h2 className="mt-6 font-sans text-2xl tracking-[-0.025em] sm:text-3xl">{section.title}</h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{section.body}</p>
                {section.bullets && (
                  <ul className="mt-5 flex flex-col gap-3">
                    {section.bullets.map((item) => (
                      <li className="flex items-start gap-3 text-sm leading-6" key={item}>
                        <Check aria-hidden="true" className="mt-1 size-4 shrink-0 text-primary" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        )}

        <div className="mt-12 flex flex-col gap-5 rounded-3xl bg-primary px-6 py-8 text-primary-foreground sm:flex-row sm:items-center sm:justify-between sm:px-9">
          <div>
            <h2 className="font-sans text-2xl tracking-[-0.03em] sm:text-3xl">MIRROR haqida batafsil suhbatlashamiz.</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-primary-foreground/80">Jamoamizga biznesingiz va kerakli jarayonlar haqida yozing.</p>
          </div>
          <Link className={buttonVariants({ variant: "secondary", size: "lg", className: "h-12 shrink-0 rounded-full px-6" })} href={slug === "pricing" ? "/request-demo" : slug === "for-brands" ? "/partnerships" : "/contact"}>
            {slug === "pricing" ? "Demo so‘rash" : slug === "for-brands" ? "Hamkorlik haqida" : "Bog‘lanish"}
            <ArrowRight aria-hidden="true" data-icon="inline-end" />
          </Link>
        </div>
      </article>
    </MarketingSiteShell>
  );
}

export function MarketingLeadPage({
  applicationType,
  title,
  description,
}: {
  applicationType: ApplicationType;
  title: string;
  description: string;
}) {
  return (
    <MarketingSiteShell>
      <section className="mx-auto grid max-w-7xl gap-10 px-5 pb-20 pt-12 sm:px-8 sm:pt-16 lg:grid-cols-[0.78fr_1.22fr] lg:gap-16">
        <div className="max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            {applicationType === "CONTACT" ? "Bog‘lanish" : "Demo va hamkorlik"}
          </p>
          <h1 className="mt-5 font-sans text-4xl leading-[1.02] tracking-[-0.045em] sm:text-6xl">{title}</h1>
          <p className="mt-6 text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">{description}</p>
          <div className="mt-8 flex flex-col gap-4 border-t border-border pt-6">
            <p className="flex items-start gap-3 text-sm leading-6 text-muted-foreground">
              <Check aria-hidden="true" className="mt-1 size-4 shrink-0 text-primary" />
              {"So‘rovingiz MIRROR jamoasiga yuboriladi."}
            </p>
            <p className="flex items-start gap-3 text-sm leading-6 text-muted-foreground">
              <Check aria-hidden="true" className="mt-1 size-4 shrink-0 text-primary" />
              Tariflar va imkoniyatlar real ehtiyojingiz asosida muhokama qilinadi.
            </p>
            <Link className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline" href="/privacy-security">
              {"Ma’lumotlar qanday ishlatiladi"}
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>
        </div>
        <div className="rounded-[1.75rem] border border-border bg-card p-5 shadow-[0_20px_70px_rgba(40,36,27,0.07)] sm:rounded-[2rem] sm:p-8">
          <ApplicationForm applicationType={applicationType} />
        </div>
      </section>
    </MarketingSiteShell>
  );
}
