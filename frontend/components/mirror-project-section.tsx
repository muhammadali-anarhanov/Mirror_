"use client";


import { useText } from "@/components/marketing-language";
import { useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ArrowUpRight, Check, CircleDashed, MoveUpRight } from "lucide-react";
import type { PortfolioCopy } from "@/lib/portfolio-content";
import { Reveal } from "@/components/portfolio-motion";

const slideImages = [
  { src: "/images/mirror-fitting-room-hero.png", fit: "cover" },
  { src: "/products/demo-full-body-cream.png", fit: "contain" },
  { src: "/images/admin/midi-dress.png", fit: "contain" },
];

export function MirrorProjectSection({ copy }: { copy: PortfolioCopy["mirror"] }) {
  const t = useText();

  const [activeSlide, setActiveSlide] = useState(0);
  const sectionRef = useRef<HTMLElement | null>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start end", "end start"] });
  const imageY = useTransform(scrollYProgress, [0, 1], [18, -18]);

  return (
    <>
      <section className="portfolio-section portfolio-mirror" id="projects" ref={sectionRef} aria-labelledby="mirror-title">
        <div className="portfolio-container">
          <Reveal className="portfolio-mirror-heading">
            <div>
              <p className="portfolio-eyebrow portfolio-eyebrow-lime">{t(copy.eyebrow)}</p>
              <h2 id="mirror-title">{t(copy.title)}</h2>
              <p className="portfolio-mirror-description">{t(copy.description)}</p>
            </div>
            <div className="portfolio-mirror-status">
              <span className="portfolio-mirror-status-dot" aria-hidden="true" />
              <span><small>{copy.statusLabel}</small><strong>{t(copy.status)}</strong></span>
            </div>
          </Reveal>

          <div className="portfolio-mirror-layout">
            <Reveal className="portfolio-mirror-visual" delay={0.07}>
              <motion.div className="portfolio-mirror-device" style={reduceMotion ? undefined : { y: imageY }}>
                <div className="portfolio-device-topbar">
                  <span className="portfolio-device-brand"><span className="portfolio-device-mark">{t("M")}</span>{t("MIRROR")}</span>
                  <span className="portfolio-device-indicator"><i aria-hidden="true" />{copy.previewLabel}</span>
                </div>
                <div className="portfolio-device-screen" id="mirror-preview-panel" aria-live="polite">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      className={`portfolio-device-image${slideImages[activeSlide]?.fit === "contain" ? " is-contained" : ""}`}
                      key={activeSlide}
                      initial={reduceMotion ? false : { opacity: 0, scale: 1.015 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={reduceMotion ? undefined : { opacity: 0, scale: 0.99 }}
                      transition={{ duration: reduceMotion ? 0 : 0.28, ease: "easeOut" }}
                    >
                      <Image
                        src={slideImages[activeSlide]?.src ?? slideImages[0].src}
                        alt={copy.slideAlts[activeSlide] ?? copy.slideAlts[0]}
                        fill
                        sizes="(max-width: 760px) 92vw, 54vw"
                        className="portfolio-device-photo"
                      />
                    </motion.div>
                  </AnimatePresence>
                  <div className="portfolio-device-screen-shade" aria-hidden="true" />
                  <div className="portfolio-device-overlay">
                    <span className="portfolio-device-pill"><CircleDashed aria-hidden="true" />{t(copy.status)}</span>
                    <span className="portfolio-device-caption">{copy.slidesLabel[activeSlide]}</span>
                  </div>
                  <div className="portfolio-device-product-card">
                    <span className="portfolio-device-product-dot" aria-hidden="true" />
                    <span><small>{t("MIRROR / PREVIEW")}</small><strong>{copy.slidesLabel[activeSlide]}</strong></span>
                    <MoveUpRight aria-hidden="true" />
                  </div>
                </div>
                <div className="portfolio-device-controls" role="group" aria-label={copy.overviewLabel}>
                  {copy.slidesLabel.map((label, index) => (
                    <button
                      key={label}
                      type="button"
                      aria-pressed={activeSlide === index}
                      aria-controls="mirror-preview-panel"
                      onClick={() => setActiveSlide(index)}
                    >
                      <span>0{index + 1}</span>{label}
                    </button>
                  ))}
                </div>
              </motion.div>
            </Reveal>

            <Reveal className="portfolio-mirror-overview" delay={0.12}>
              <div className="portfolio-overview-label"><span>01</span>{copy.overviewLabel}</div>
              <div className="portfolio-feature-list">
                <h3><Check aria-hidden="true" />{copy.workingTitle}</h3>
                {copy.workingItems.map((item) => <p key={item}><Check aria-hidden="true" />{item}</p>)}
              </div>
              <div className="portfolio-feature-list is-planned">
                <h3><CircleDashed aria-hidden="true" />{copy.plannedTitle}</h3>
                {copy.plannedItems.map((item) => <p key={item}><span className="portfolio-planned-dash" aria-hidden="true" />{item}</p>)}
              </div>
              <div className="portfolio-business-note">
                <span>{copy.businessLabel}</span>
                <p>{copy.businessText}</p>
              </div>
              <div className="portfolio-mirror-actions">
                <a className="portfolio-button portfolio-button-lime" href="#projects">{copy.exploreCta}<ArrowUpRight aria-hidden="true" /></a>
                <a className="portfolio-button portfolio-button-quiet" href="/mirror">{copy.demoCta}<ArrowUpRight aria-hidden="true" /></a>
                <a className="portfolio-text-link" href="#contact">{copy.contactCta}</a>
              </div>
            </Reveal>
          </div>

          <Reveal className="portfolio-problem-solution" delay={0.08}>
            <article className="portfolio-idea-panel">
              <span className="portfolio-eyebrow">{copy.problemLabel}</span>
              <h3>{copy.problemTitle}</h3>
              <p>{copy.problemText}</p>
            </article>
            <div className="portfolio-idea-bridge" aria-hidden="true"><span /><ArrowUpRight /></div>
            <article className="portfolio-idea-panel portfolio-idea-panel-solution">
              <span className="portfolio-eyebrow">{copy.solutionLabel}</span>
              <h3>{copy.solutionTitle}</h3>
              <p>{copy.solutionText}</p>
            </article>
          </Reveal>

          <Reveal className="portfolio-tech-strip">
            <div className="portfolio-tech-title"><span className="portfolio-eyebrow">{copy.techTitle}</span></div>
            {copy.tech.map((item, index) => (
              <div className="portfolio-tech-item" key={item.area}>
                <span className="portfolio-tech-index">0{index + 1}</span>
                <span className="portfolio-tech-area">{item.area}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </Reveal>
        </div>
      </section>
    </>
  );
}
