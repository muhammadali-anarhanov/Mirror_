"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { BrainCircuit, Code2, Database, PanelsTopLeft, Server, Wrench } from "lucide-react";
import type { PortfolioCopy } from "@/lib/portfolio-content";
import { Reveal } from "@/components/portfolio-motion";

const categoryIcons = [Code2, PanelsTopLeft, Server, Database, BrainCircuit, Wrench];

export function PortfolioSkills({ copy }: { copy: PortfolioCopy["skills"] }) {
  const [activeCategory, setActiveCategory] = useState(0);

  return (
    <section className="portfolio-section portfolio-skills" id="skills" aria-labelledby="skills-title">
      <div className="portfolio-container">
        <Reveal className="portfolio-section-heading portfolio-skills-heading">
          <p className="portfolio-eyebrow">{copy.eyebrow}</p>
          <h2 id="skills-title">{copy.title}</h2>
          <p className="portfolio-section-intro">{copy.description}</p>
        </Reveal>

        <div className="portfolio-skills-grid">
          {copy.categories.map((category, index) => {
            const Icon = categoryIcons[index] ?? Code2;
            const isActive = activeCategory === index;

            return (
              <Reveal key={category.title} delay={index * 0.045}>
                <motion.button
                  className={`portfolio-skill-card${isActive ? " is-active" : ""}`}
                  type="button"
                  aria-expanded={isActive}
                  onClick={() => setActiveCategory(index)}
                  whileHover={{ y: -4 }}
                  whileTap={{ scale: 0.99 }}
                  transition={{ duration: 0.18 }}
                >
                  <span className="portfolio-skill-card-top">
                    <span className="portfolio-skill-icon"><Icon aria-hidden="true" /></span>
                    <span className="portfolio-skill-number">0{index + 1}</span>
                  </span>
                  <strong>{category.title}</strong>
                  <span className="portfolio-skill-tags">
                    {category.items.map((item) => <span key={item}>{item}</span>)}
                  </span>
                  <span className="portfolio-skill-note">{category.note}</span>
                  {isActive && <motion.span layoutId="portfolio-skill-indicator" className="portfolio-skill-indicator" />}
                </motion.button>
              </Reveal>
            );
          })}
        </div>
        <p className="portfolio-skills-note"><span aria-hidden="true">↗</span>{copy.note}</p>
      </div>
    </section>
  );
}
