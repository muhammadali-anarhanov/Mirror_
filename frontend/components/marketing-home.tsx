"use client";


import { useText } from "@/components/marketing-language";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Camera,
  Check,
  Layers3,
  ScanLine,
  ShieldCheck,
  Store,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { MarketingSiteShell } from "@/components/marketing-site";
import { useMarketingLanguage } from "@/components/marketing-language";
import { marketingHomeCopy } from "@/lib/marketing-home-copy";

const featureIcons = [ScanLine, Layers3, Store] as const;

export function MarketingHome() {
  const t = useText();

  const { language } = useMarketingLanguage();
  const copy = marketingHomeCopy[language];

  return (
    <MarketingSiteShell>
      <section className="marketing-hero mx-auto grid max-w-7xl items-center gap-10 px-5 pb-16 pt-10 sm:px-8 sm:pt-14 lg:min-h-[690px] lg:grid-cols-[0.9fr_1.1fr] lg:gap-14 lg:py-14">
        <div className="max-w-xl">
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3.5 py-2 text-xs font-medium text-muted-foreground shadow-sm">
            <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
            {t(copy.hero.eyebrow)}
          </p>
          <h1 className="max-w-[12ch] font-sans text-[clamp(3.25rem,8vw,5.8rem)] leading-[0.96] tracking-[-0.055em]">
            {copy.hero.titleStart}
            <span className="italic text-primary">{copy.hero.titleAccent}</span>
            {copy.hero.titleEnd}
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
            {t(copy.hero.description)}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              className={buttonVariants({ size: "lg", className: "h-12 rounded-full px-6 text-sm" })}
              href="/request-demo"
            >
              {copy.navigation.requestDemo}
              <ArrowRight aria-hidden="true" data-icon="inline-end" />
            </Link>
            <Link
              className={buttonVariants({ variant: "outline", size: "lg", className: "h-12 rounded-full px-6 text-sm" })}
              href="/mirror"
            >
              {copy.navigation.virtualMirror}
              <ArrowUpRight aria-hidden="true" data-icon="inline-end" />
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-2"><Check aria-hidden="true" className="size-3.5 text-primary" /> {copy.hero.noAccount}</span>
            <span className="inline-flex items-center gap-2"><Camera aria-hidden="true" className="size-3.5 text-primary" /> {copy.hero.cameraPermission}</span>
          </div>
        </div>

        <div className="relative mx-auto aspect-square w-full max-w-2xl overflow-hidden rounded-[1.75rem] border border-white/70 bg-muted shadow-[0_28px_80px_rgba(15,23,42,0.14)] sm:rounded-[2rem]">
          <Image
            src="/images/mirror-fitting-room-hero.png"
            alt={copy.hero.imageAlt}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 55vw"
            className="object-cover"
          />
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-black/10" />
          <div className="absolute left-4 right-4 top-4 flex justify-center sm:left-6 sm:right-6 sm:top-6">
            <div className="flex max-w-full gap-1 overflow-x-auto rounded-full border border-white/35 bg-[#0F172A]/35 p-1.5 text-[10px] text-white shadow-lg backdrop-blur-xl sm:text-xs">
              {copy.categories.map((category, index) => (
                <span
                  className={`shrink-0 rounded-full px-3 py-2 ${index === 1 ? "bg-white/25 font-semibold" : "text-white/85"}`}
                  key={category}
                >
                  {category}
                </span>
              ))}
            </div>
          </div>
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3 rounded-2xl border border-white/40 bg-white/90 p-4 shadow-xl backdrop-blur-xl sm:bottom-6 sm:left-6 sm:right-6 sm:p-5">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{copy.hero.fittingLabel}</p>
              <p className="mt-1 truncate font-sans text-lg sm:text-xl">{copy.hero.fittingTitle}</p>
              <p className="mt-1 text-xs text-muted-foreground">{copy.hero.fittingDescription}</p>
            </div>
            <Link
              className={buttonVariants({ size: "sm", className: "shrink-0 rounded-full px-4" })}
              href="/mirror"
            >
              {copy.hero.tryOn}
              <ArrowUpRight aria-hidden="true" data-icon="inline-end" />
            </Link>
          </div>
          <div className="absolute bottom-28 right-5 hidden items-center gap-2 rounded-full border border-white/40 bg-[#302b25]/35 px-3 py-2 text-xs text-white backdrop-blur-lg sm:flex">
            <ShieldCheck aria-hidden="true" className="size-4" />
            {copy.hero.privacyNote}
          </div>
        </div>
      </section>

      <section className="border-y border-border/80 bg-card/55">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{t(copy.features.eyebrow)}</p>
            <h2 className="mt-4 font-sans text-3xl leading-tight tracking-[-0.035em] sm:text-5xl">
              {t(copy.features.title)}
            </h2>
            <p className="mt-5 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
              {t(copy.features.description)}
            </p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {copy.features.cards.map((feature, index) => {
              const Icon = featureIcons[index] ?? ScanLine;
              return (
                <article className="rounded-3xl border border-border bg-card p-6 sm:p-7" key={feature.title}>
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-accent text-primary">
                    <Icon aria-hidden="true" className="size-5" />
                  </div>
                  <p className="mt-7 text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">0{index + 1}</p>
                  <h3 className="mt-2 font-sans text-2xl tracking-[-0.025em]">{t(feature.title)}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{t(feature.body)}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        <div className="relative mx-auto aspect-[1.2] w-full max-w-xl overflow-hidden rounded-[1.75rem] bg-[#e8e2d7] sm:rounded-[2rem]">
          <Image
            src="/products/demo-full-body-cream.png"
            alt={copy.catalog.imageAlt}
            fill
            sizes="(max-width: 1024px) 100vw, 45vw"
            className="object-contain p-5 sm:p-8"
          />
          <div className="absolute bottom-4 left-4 rounded-full border border-white/60 bg-white/80 px-4 py-2 text-xs font-medium shadow-sm backdrop-blur">
            {copy.catalog.badge}
          </div>
        </div>
        <div className="max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{t(copy.catalog.eyebrow)}</p>
          <h2 className="mt-4 font-sans text-3xl leading-tight tracking-[-0.04em] sm:text-5xl">
            {t(copy.catalog.title)}
          </h2>
          <p className="mt-5 text-sm leading-7 text-muted-foreground sm:text-base">
            {t(copy.catalog.description)}
          </p>
          <ul className="mt-7 flex flex-col gap-3 text-sm text-foreground">
            {copy.catalog.bullets.map((item) => (
              <li className="flex items-start gap-3" key={item}>
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-primary"><Check aria-hidden="true" className="size-3.5" /></span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <Link className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline" href="/features">
            {copy.catalog.allFeatures}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      </section>

      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-14 sm:px-8 sm:py-16 md:grid-cols-[1fr_auto] md:items-center">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-foreground/75">{t(copy.privacy.eyebrow)}</p>
            <h2 className="mt-3 font-sans text-3xl leading-tight tracking-[-0.035em] sm:text-4xl">
              {t(copy.privacy.title)}
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-6 text-primary-foreground/80">
              {t(copy.privacy.description)}
            </p>
          </div>
          <Link
            className={buttonVariants({ variant: "secondary", size: "lg", className: "h-12 rounded-full px-6" })}
            href="/privacy-security"
          >
            {copy.privacy.link}
            <ArrowRight aria-hidden="true" data-icon="inline-end" />
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
        <div className="flex flex-col gap-6 rounded-[2rem] border border-border bg-card p-7 sm:p-10 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{t(copy.cta.eyebrow)}</p>
            <h2 className="mt-3 font-sans text-3xl tracking-[-0.035em] sm:text-4xl">{t(copy.cta.title)}</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{t(copy.cta.description)}</p>
          </div>
          <Link className={buttonVariants({ size: "lg", className: "h-12 shrink-0 rounded-full px-6" })} href="/request-demo">
            {copy.navigation.requestDemo}
            <ArrowRight aria-hidden="true" data-icon="inline-end" />
          </Link>
        </div>
      </section>
    </MarketingSiteShell>
  );
}
