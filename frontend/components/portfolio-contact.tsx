"use client";

import { useState, type FormEvent } from "react";
import { ArrowUpRight, Code2, Mail, Send } from "lucide-react";
import type { PortfolioCopy } from "@/lib/portfolio-content";
import { portfolioProfile } from "@/lib/portfolio-profile";
import { Reveal } from "@/components/portfolio-motion";

type ContactKey = "email" | "telegram" | "github" | "linkedin";

export function PortfolioContact({ copy }: { copy: PortfolioCopy["contact"] }) {
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const contactItems: { key: ContactKey; label: string; value: string; href?: string; icon: typeof Mail }[] = [
    { key: "email", label: copy.labels.email, value: portfolioProfile.contact.email || copy.placeholders.email, href: portfolioProfile.contact.email ? `mailto:${portfolioProfile.contact.email}` : undefined, icon: Mail },
    { key: "telegram", label: copy.labels.telegram, value: portfolioProfile.contact.telegramUrl || copy.placeholders.telegram, href: portfolioProfile.contact.telegramUrl || undefined, icon: Send },
    { key: "github", label: copy.labels.github, value: portfolioProfile.contact.githubUrl || copy.placeholders.github, href: portfolioProfile.contact.githubUrl || undefined, icon: Code2 },
    { key: "linkedin", label: copy.labels.linkedin, value: portfolioProfile.contact.linkedinUrl || copy.placeholders.linkedin, href: portfolioProfile.contact.linkedinUrl || undefined, icon: ArrowUpRight },
  ];

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity() || sending) return;

    const formData = new FormData(form);
    setSending(true);
    setStatus("idle");

    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationType: "CONTACT",
          companyName: "Personal portfolio",
          contactName: String(formData.get("name") ?? "").trim(),
          email: String(formData.get("email") ?? "").trim(),
          message: `Subject: ${String(formData.get("subject") ?? "").trim()}\n\n${String(formData.get("message") ?? "").trim()}`,
          consent: formData.get("consent") === "on",
          fax: String(formData.get("fax") ?? ""),
        }),
      });

      if (!response.ok) throw new Error("Contact submission failed");
      form.reset();
      setStatus("success");
    } catch {
      setStatus("error");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="portfolio-section portfolio-contact" id="contact" aria-labelledby="contact-title">
      <div className="portfolio-contact-glow" aria-hidden="true" />
      <div className="portfolio-container">
        <Reveal className="portfolio-contact-heading">
          <p className="portfolio-eyebrow portfolio-eyebrow-lime">{copy.eyebrow}</p>
          <h2 id="contact-title">{copy.title}</h2>
          <p>{copy.description}</p>
        </Reveal>

        <div className="portfolio-contact-grid">
          <Reveal className="portfolio-contact-details">
            <h3>{copy.detailsTitle}</h3>
            <div className="portfolio-contact-links">
              {contactItems.map(({ key, label, value, href, icon: Icon }) => (
                href ? (
                  <a className="portfolio-contact-link" href={href} key={key} target={key === "email" ? undefined : "_blank"} rel={key === "email" ? undefined : "noreferrer"}>
                    <span className="portfolio-contact-link-icon"><Icon aria-hidden="true" /></span>
                    <span><small>{label}</small><strong>{value}</strong></span>
                    <ArrowUpRight aria-hidden="true" className="portfolio-contact-link-arrow" />
                  </a>
                ) : (
                  <div className="portfolio-contact-link is-placeholder" key={key}>
                    <span className="portfolio-contact-link-icon"><Icon aria-hidden="true" /></span>
                    <span><small>{label}</small><strong>{value}</strong></span>
                  </div>
                )
              ))}
            </div>
          </Reveal>

          <Reveal className="portfolio-contact-form-wrap" delay={0.1}>
            <h3>{copy.formTitle}</h3>
            <form className="portfolio-contact-form" onSubmit={handleSubmit}>
              <div className="portfolio-form-row">
                <label>
                  <span>{copy.name}</span>
                  <input name="name" type="text" autoComplete="name" minLength={2} maxLength={120} required />
                </label>
                <label>
                  <span>{copy.email}</span>
                  <input name="email" type="email" autoComplete="email" maxLength={254} required />
                </label>
              </div>
              <label>
                <span>{copy.subject}</span>
                <input name="subject" type="text" minLength={2} maxLength={120} required />
              </label>
              <label>
                <span>{copy.message}</span>
                <textarea name="message" rows={4} minLength={8} maxLength={1800} required />
              </label>
              <div className="portfolio-honeypot" aria-hidden="true">
                <label htmlFor="portfolio-fax">Fax</label>
                <input id="portfolio-fax" name="fax" type="text" tabIndex={-1} autoComplete="off" />
              </div>
              <label className="portfolio-consent">
                <input name="consent" type="checkbox" required />
                <span>{copy.consent}</span>
              </label>
              <div className="portfolio-form-footer">
                <button className="portfolio-button portfolio-button-lime" type="submit" disabled={sending}>
                  {sending ? copy.sending : copy.send}
                  {!sending && <ArrowUpRight aria-hidden="true" />}
                </button>
                <p className="portfolio-form-status" role="status" aria-live="polite">
                  {status === "success" ? copy.success : status === "error" ? copy.error : ""}
                </p>
              </div>
              <p className="portfolio-form-note">{copy.integrationNote}</p>
            </form>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
