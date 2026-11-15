import { ArrowDownRight } from "lucide-react";
import type { PortfolioCopy } from "@/lib/portfolio-content";
import { Reveal } from "@/components/portfolio-motion";

export function PortfolioJourney({ copy }: { copy: PortfolioCopy["journey"] }) {
  return (
    <section className="portfolio-section portfolio-journey" id="journey" aria-labelledby="journey-title">
      <div className="portfolio-container portfolio-journey-grid">
        <Reveal className="portfolio-journey-intro">
          <p className="portfolio-eyebrow">{copy.eyebrow}</p>
          <h2 id="journey-title">{copy.title}</h2>
          <p className="portfolio-section-intro">{copy.description}</p>
          <ArrowDownRight className="portfolio-journey-arrow" aria-hidden="true" />
        </Reveal>
        <div className="portfolio-timeline">
          {copy.items.map((item, index) => (
            <Reveal className="portfolio-timeline-item" key={item.title} delay={index * 0.04}>
              <span className="portfolio-timeline-marker" aria-hidden="true"><i /></span>
              <div className="portfolio-timeline-content">
                <span className="portfolio-timeline-index">0{index + 1}</span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
