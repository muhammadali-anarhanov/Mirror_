"use client";

import { LanguageSelector, useMarketingLanguage } from "@/components/marketing-language";
import { useEffect, useState, type MouseEvent as ReactMouseEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { PortfolioAbout } from "@/components/portfolio-about";
import { PortfolioContact } from "@/components/portfolio-contact";
import { PortfolioHero } from "@/components/portfolio-hero";
import { PortfolioJourney } from "@/components/portfolio-journey";
import { MirrorProjectSection } from "@/components/mirror-project-section";
import { PortfolioSkills } from "@/components/portfolio-skills";
import { portfolioContent, portfolioLocales, type PortfolioLocale } from "@/lib/portfolio-content";
import { portfolioProfile } from "@/lib/portfolio-profile";

type SectionId = "about" | "skills" | "projects" | "journey" | "contact";

export function PortfolioSite() {
  const {language} = useMarketingLanguage();
  const locale = language.toLowerCase() as PortfolioLocale;
  const [activeSection, setActiveSection] = useState<SectionId | "">("");
  const [menuOpen, setMenuOpen] = useState(false);
  const copy = portfolioContent[locale] ?? portfolioContent.en;
  const links: { id: SectionId; label: string }[] = [
    { id: "about", label: copy.nav.about },
    { id: "skills", label: copy.nav.skills },
    { id: "projects", label: copy.nav.project },
    { id: "journey", label: copy.nav.journey },
    { id: "contact", label: copy.nav.contact },
  ];

  useEffect(() => {
    const sections = links.map((link) => document.getElementById(link.id)).filter((section): section is HTMLElement => section !== null);
    if (!sections.length) return;

    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActiveSection(visible.target.id as SectionId);
    }, { rootMargin: "-18% 0px -63% 0px", threshold: [0, 0.15, 0.35, 0.6] });

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [locale]);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <main className="portfolio" lang={locale} dir={language === "AR" ? "rtl" : "ltr"}>
      <header className="portfolio-header">
        <div className="portfolio-header-inner portfolio-container">
          <a className="portfolio-brand" href="#top" aria-label={`${portfolioProfile.name} — ${copy.footer.top}`} onClick={closeMenu}>
            <span className="portfolio-brand-mark">{portfolioProfile.initials}</span>
            <span className="portfolio-brand-name">{portfolioProfile.name}</span>
          </a>

          <nav className="portfolio-desktop-nav" aria-label={copy.nav.about}>
            {links.map((link) => (
              <a className={activeSection === link.id ? "is-active" : ""} href={`#${link.id}`} key={link.id} aria-current={activeSection === link.id ? "location" : undefined}>
                {link.label}
                {activeSection === link.id && <motion.span className="portfolio-nav-indicator" layoutId="portfolio-nav-indicator" />}
              </a>
            ))}
          </nav>

          <div className="portfolio-header-actions">
            <label className="sr-only" htmlFor="portfolio-language">{copy.nav.language}</label>
            <LanguageSelector className="portfolio-language-select" />
            <a className="portfolio-header-cta" href="#contact">{copy.nav.connect}<ArrowUpRight aria-hidden="true" /></a>
            <button
              className="portfolio-menu-toggle"
              type="button"
              aria-label={menuOpen ? copy.nav.closeMenu : copy.nav.openMenu}
              aria-expanded={menuOpen}
              aria-controls="portfolio-mobile-nav"
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
            </button>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {menuOpen && (
            <motion.nav
              className="portfolio-mobile-nav"
              id="portfolio-mobile-nav"
              aria-label={copy.nav.about}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              <div className="portfolio-mobile-nav-inner portfolio-container">
                {links.map((link, index) => (
                  <a href={`#${link.id}`} key={link.id} onClick={closeMenu}>
                    <span>0{index + 1}</span>{link.label}<ArrowUpRight aria-hidden="true" />
                  </a>
                ))}
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      <PortfolioHero copy={copy.hero} />
      <PortfolioAbout copy={copy.about} />
      <PortfolioSkills copy={copy.skills} />
      <MirrorProjectSection copy={copy.mirror} />
      <PortfolioJourney copy={copy.journey} />
      <PortfolioContact copy={copy.contact} />

      <footer className="portfolio-footer">
        <div className="portfolio-container portfolio-footer-inner">
          <a className="portfolio-footer-brand" href="#top">{portfolioProfile.initials}<span>© {new Date().getFullYear()} {portfolioProfile.name}</span></a>
          <p>{copy.footer.note}</p>
          <a className="portfolio-footer-top" href="#top">{copy.footer.top}<ArrowUpRight aria-hidden="true" /></a>
        </div>
      </footer>
    </main>
  );
}
