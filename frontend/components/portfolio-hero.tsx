"use client";

import Image from "next/image";
import { ArrowDownRight, ArrowUpRight, Sparkles } from "lucide-react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { PortfolioCopy } from "@/lib/portfolio-content";
import { portfolioProfile } from "@/lib/portfolio-profile";

export function PortfolioHero({ copy }: { copy: PortfolioCopy["hero"] }) {
  const reduceMotion = useReducedMotion();
  const itemVariants: Variants = {
    hidden: reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: reduceMotion ? 0 : 0.6, ease: "easeOut" } },
  };

  return (
    <section className="portfolio-hero" id="top" aria-labelledby="portfolio-title">
      <div className="portfolio-hero-grid portfolio-container">
        <motion.div
          className="portfolio-hero-copy"
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: reduceMotion ? 0 : 0.12 } } }}
        >
          <motion.p className="portfolio-eyebrow portfolio-hero-eyebrow" variants={itemVariants}>
            <span className="portfolio-live-dot" aria-hidden="true" />
            {copy.eyebrow}
          </motion.p>
          <motion.h1 id="portfolio-title" variants={itemVariants}>
            {copy.headline}
          </motion.h1>
          <motion.p className="portfolio-hero-description" variants={itemVariants}>
            {copy.description}
          </motion.p>
          <motion.div className="portfolio-hero-actions" variants={itemVariants}>
            <a className="portfolio-button portfolio-button-lime" href="#projects">
              {copy.projectsCta}
              <ArrowUpRight aria-hidden="true" />
            </a>
            <a className="portfolio-button portfolio-button-quiet" href="#about">
              {copy.aboutCta}
              <ArrowDownRight aria-hidden="true" />
            </a>
          </motion.div>
          <motion.div className="portfolio-hero-footnote" variants={itemVariants}>
            <span className="portfolio-hero-line" aria-hidden="true" />
            <span>{portfolioProfile.name}</span>
          </motion.div>
        </motion.div>

        <motion.div
          className="portfolio-hero-art"
          initial={reduceMotion ? false : { opacity: 0, scale: 0.97, y: 18 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.85, delay: reduceMotion ? 0 : 0.2, ease: "easeOut" }}
        >
          <div className="portfolio-hero-orbit portfolio-hero-orbit-one" aria-hidden="true" />
          <div className="portfolio-hero-orbit portfolio-hero-orbit-two" aria-hidden="true" />
          <div className="portfolio-hero-image-wrap">
            <Image
              src="/images/mirror-fitting-room-hero.png"
              alt={copy.previewAlt}
              fill
              loading="eager"
              sizes="(max-width: 760px) 90vw, 48vw"
              className="portfolio-hero-image"
            />
            <div className="portfolio-hero-image-shade" aria-hidden="true" />
            <div className="portfolio-hero-image-caption">
              <span className="portfolio-image-kicker">{copy.previewLabel}</span>
              <strong>{copy.previewTitle}</strong>
              <span>{copy.previewDescription}</span>
            </div>
          </div>
          <div className="portfolio-hero-image-badge">
            <Sparkles aria-hidden="true" />
            <span>{copy.previewStatus}</span>
          </div>
          <div className="portfolio-hero-art-index" aria-hidden="true">
            <span>01</span>
            <span className="portfolio-index-rule" />
            <span>05</span>
          </div>
        </motion.div>
      </div>
      <a className="portfolio-scroll-cue" href="#about">
        <span>{copy.scroll}</span>
        <span className="portfolio-scroll-cue-line" aria-hidden="true" />
      </a>
    </section>
  );
}
