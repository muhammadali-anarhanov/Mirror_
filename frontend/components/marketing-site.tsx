"use client";


import { ScrollReveal } from "@/components/scroll-reveal";
import { useText } from "@/components/marketing-language";
import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { marketingLanguages, useMarketingLanguage } from "@/components/marketing-language";
import { marketingHomeCopy } from "@/lib/marketing-home-copy";

const navigationHrefs = ["/how-it-works", "/features", "/for-brands", "/pricing", "/faq"];
const displayLanguageCodes = { UZ: "UZ", EN: "EN", RU: "RU", KK: "KK", AR: "AR", TR: "TR" } as const;

function LanguageSelect({ id, className = "" }: { id: string; className?: string }) {
  const { language, setLanguage } = useMarketingLanguage();
  const labels = marketingHomeCopy[language].navigation;

  return (
    <label className={className}>
      <span className="sr-only">{labels.chooseLanguage}</span>
      <select
        aria-label={labels.chooseLanguage}
        className="min-h-9 rounded-full border border-border bg-card px-3 text-xs font-semibold text-foreground outline-none transition-colors hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring"
        id={id}
        onChange={(event) => setLanguage(event.target.value as (typeof marketingLanguages)[number])}
        value={language}
      >
        {marketingLanguages.map((item) => (
          <option key={item} value={item}>{displayLanguageCodes[item]}</option>
        ))}
      </select>
    </label>
  );
}

export function MarketingSiteShell({ children }: { children: ReactNode }) {
  const t = useText();

  const { language } = useMarketingLanguage();
  const copy = marketingHomeCopy[language];

  return (
    <div className="marketing-shell min-h-screen" dir={language === "AR" ? "rtl" : "ltr"}>
      <ScrollReveal />
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-background focus:px-4 focus:py-3 focus:text-foreground focus:shadow-lg"
        href="#main-content"
      >
        {copy.navigation.skip}
      </a>
      <div className="flex min-h-screen flex-col">
        <header className="marketing-header sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-xl">
          <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
            <Link className="flex shrink-0 flex-col leading-none" href="/" aria-label={copy.navigation.homeLabel}>
              <span className="font-sans text-xl font-semibold tracking-[0.16em]">{t("MIRROR")}</span>
              <span className="mt-1 text-[9px] font-medium tracking-[0.11em] text-muted-foreground">{t("VIRTUAL FITTING · RETAIL")}</span>
            </Link>
            <nav aria-label={copy.navigation.mainLabel} className="hidden items-center gap-6 lg:flex">
              {navigationHrefs.map((href, index) => (
                <Link
                  key={href}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  href={href}
                >
                  {copy.navigation.items[index]}
                </Link>
              ))}
            </nav>
            <div className="flex shrink-0 items-center gap-3">
              <LanguageSelect className="hidden lg:block" id="marketing-language-desktop" />
              <Link
                className="hidden text-sm font-medium text-foreground transition-colors hover:text-primary sm:inline-flex"
                href="/mirror"
              >
                {copy.navigation.virtualMirror}
              </Link>
              <Link
                className={buttonVariants({ size: "sm", className: "hidden rounded-full px-4 sm:inline-flex sm:px-5" })}
                href="/request-demo"
              >
                {copy.navigation.requestDemo}
              </Link>
              <details className="group relative lg:hidden">
                <summary className="flex min-h-9 cursor-pointer list-none items-center gap-2 rounded-full border border-border bg-card px-3 text-sm font-medium text-foreground [&::-webkit-details-marker]:hidden">
                  {copy.navigation.menu}
                  <ChevronDown aria-hidden="true" className="size-4 transition-transform group-open:rotate-180" />
                </summary>
                <nav
                  aria-label={copy.navigation.mobileLabel}
                  className="absolute right-0 top-[calc(100%+0.6rem)] flex w-60 flex-col gap-1 rounded-2xl border border-border bg-card p-2 shadow-xl"
                >
                  {navigationHrefs.map((href, index) => (
                    <Link
                      key={href}
                      className="rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      href={href}
                    >
                      {copy.navigation.items[index]}
                    </Link>
                  ))}
                  <Link
                    className="rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    href="/mirror"
                  >
                    {copy.navigation.virtualMirror}
                  </Link>
                  <Link
                    className="rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    href="/request-demo"
                  >
                    {copy.navigation.requestDemo}
                  </Link>
                  <div className="px-3 py-2">
                    <LanguageSelect id="marketing-language-mobile" />
                  </div>
                </nav>
              </details>
            </div>
          </div>
        </header>
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <footer className="border-t border-border/80 bg-card/70">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 py-10 sm:px-8 md:grid-cols-[1fr_auto] md:items-end">
            <div className="max-w-md">
              <Link className="font-sans text-lg font-semibold tracking-[0.16em]" href="/">{t("MIRROR")}</Link>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{t(copy.footer.description)}</p>
            </div>
            <nav aria-label={copy.footer.moreLabel} className="flex flex-wrap gap-x-5 gap-y-3 text-sm text-muted-foreground">
              <Link className="hover:text-foreground" href="/about">{copy.footer.about}</Link>
              <Link className="hover:text-foreground" href="/founder">{copy.footer.founder}</Link>
              <Link className="hover:text-foreground" href="/privacy-security">{copy.footer.privacy}</Link>
              <Link className="hover:text-foreground" href="/contact">{copy.footer.contact}</Link>
              <Link className="hover:text-foreground" href="/mirror">{copy.footer.mirror}</Link>
            </nav>
            <p className="text-xs text-muted-foreground md:col-span-2">
              © {new Date().getFullYear()}{t("MIRROR.")}{copy.footer.rights}
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
