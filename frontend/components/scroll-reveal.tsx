"use client";

import { useEffect } from "react";

/**
 * Fades sections of the public site in as they scroll into view. Content stays
 * visible without JavaScript and for visitors who prefer reduced motion.
 */
export function ScrollReveal({ selector = "main section, main article, main [data-reveal]" }: { selector?: string }) {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    const nodes = Array.from(document.querySelectorAll<HTMLElement>(selector)).filter((node) => node.getBoundingClientRect().top > window.innerHeight * 0.9);
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-revealed");
        observer.unobserve(entry.target);
      }
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    nodes.forEach((node, index) => {
      node.classList.add("mk-reveal");
      node.style.setProperty("--mk-delay", `${(index % 3) * 70}ms`);
      observer.observe(node);
    });
    return () => observer.disconnect();
  }, [selector]);
  return null;
}
