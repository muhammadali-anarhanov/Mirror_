import { ArrowUpRight } from "lucide-react";
import type { PortfolioCopy } from "@/lib/portfolio-content";
import { portfolioProfile } from "@/lib/portfolio-profile";
import { Reveal } from "@/components/portfolio-motion";

export function PortfolioAbout({ copy }: { copy: PortfolioCopy["about"] }) {
  return (
    <section className="portfolio-section portfolio-about" id="about" aria-labelledby="about-title">
      <div className="portfolio-container">
        <Reveal className="portfolio-section-heading portfolio-about-heading">
          <p className="portfolio-eyebrow">{copy.eyebrow}</p>
          <h2 id="about-title">{copy.title}</h2>
          <p className="portfolio-section-intro">{copy.description}</p>
        </Reveal>

        <div className="portfolio-about-grid">
          <Reveal className="portfolio-profile-card">
            <div className="portfolio-profile-art" aria-hidden="true">
              <div className="portfolio-profile-ring portfolio-profile-ring-one" />
              <div className="portfolio-profile-ring portfolio-profile-ring-two" />
              <span className="portfolio-profile-initials">{portfolioProfile.initials}</span>
              <span className="portfolio-profile-coordinate">IT / 01</span>
            </div>
            <div className="portfolio-profile-card-copy">
              <span className="portfolio-eyebrow">{copy.cardLabel}</span>
              <h3>{copy.cardTitle}</h3>
              <p>{copy.cardText}</p>
            </div>
          </Reveal>

          <Reveal className="portfolio-about-details" delay={0.08}>
            <div className="portfolio-focus-block">
              <div className="portfolio-subheading-row">
                <h3>{copy.focusTitle}</h3>
                <ArrowUpRight aria-hidden="true" />
              </div>
              <div className="portfolio-focus-tags">
                {copy.focusTags.map((tag) => <span key={tag}>{tag}</span>)}
              </div>
            </div>
            <div className="portfolio-about-details-block">
              <h3>{copy.detailsTitle}</h3>
              <dl>
                {copy.details.map((detail, index) => (
                  <div className="portfolio-detail-row" key={detail.label}>
                    <dt><span>0{index + 1}</span>{detail.label}</dt>
                    <dd>{detail.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
