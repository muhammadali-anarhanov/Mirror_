"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { ApplicationType } from "@/lib/database-schema";

export function ApplicationForm({ applicationType }: { applicationType: ApplicationType }) {
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const branchValue = formData.get("requestedBranches");

    setStatus("submitting");

    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationType,
          companyName: formData.get("companyName"),
          contactName: formData.get("contactName"),
          email: formData.get("email"),
          phone: formData.get("phone"),
          country: formData.get("country"),
          website: formData.get("website"),
          requestedBranches: branchValue ? Number(branchValue) : undefined,
          message: formData.get("message"),
          consent: formData.get("consent") === "on",
          fax: formData.get("fax"),
        }),
      });

      if (!response.ok) {
        throw new Error("Application submission failed");
      }

      form.reset();
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  return (
    <form className="marketing-form" onSubmit={handleSubmit}>
      <div className="mb-6">
        <h2 className="font-sans text-2xl tracking-[-0.025em] sm:text-3xl">{"So‘rov ma’lumotlari"}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{"Maydonlarni to‘ldiring — jamoamiz siz bilan bog‘lanadi."}</p>
      </div>
      <FieldGroup className="gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="companyName">Tashkilot nomi</FieldLabel>
            <Input id="companyName" name="companyName" autoComplete="organization" minLength={2} maxLength={120} placeholder="Masalan, MIRROR Retail" required />
          </Field>
          <Field>
            <FieldLabel htmlFor="contactName">Ism-familiya</FieldLabel>
            <Input id="contactName" name="contactName" autoComplete="name" minLength={2} maxLength={120} placeholder="Ismingiz" required />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="email">Ish elektron pochtasi</FieldLabel>
            <Input id="email" name="email" type="email" autoComplete="email" maxLength={254} placeholder="name@company.com" required />
          </Field>
          <Field>
            <FieldLabel htmlFor="phone">Telefon raqami</FieldLabel>
            <Input id="phone" name="phone" type="tel" autoComplete="tel" maxLength={40} placeholder="+998 ..." />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="country">Mamlakat</FieldLabel>
            <Input id="country" name="country" autoComplete="country-name" maxLength={80} placeholder="O‘zbekiston" />
          </Field>
          <Field>
            <FieldLabel htmlFor="requestedBranches">Filiallar soni</FieldLabel>
            <Input id="requestedBranches" name="requestedBranches" type="number" min={1} max={10000} step={1} inputMode="numeric" placeholder="Masalan, 5" />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="website">Tashkilot veb-sayti</FieldLabel>
          <Input id="website" name="website" type="url" autoComplete="url" maxLength={500} placeholder="https://example.com" />
          <FieldDescription>Ixtiyoriy. Havolani https:// bilan kiriting.</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="message">Sizga qanday yordam bera olamiz?</FieldLabel>
          <textarea
            className="min-h-32 w-full resize-y rounded-2xl border border-input bg-background px-4 py-3 text-base text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
            id="message"
            name="message"
            maxLength={2000}
            placeholder="Katalog, filiallar yoki rejalashtirayotgan tajribangiz haqida yozing."
          />
        </Field>
      </FieldGroup>

      <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden">
        <label htmlFor="fax">Fax</label>
        <input id="fax" name="fax" tabIndex={-1} autoComplete="off" />
      </div>

      <Field className="mt-5" orientation="horizontal">
        <input
          className="mt-1 size-4 shrink-0 accent-primary"
          id="consent"
          name="consent"
          required
          type="checkbox"
        />
        <FieldLabel className="text-xs leading-5 text-muted-foreground" htmlFor="consent">
          {"MIRROR so‘rovimga javob berishi uchun yuborgan ma’lumotlarimdan foydalanishiga roziman."}
        </FieldLabel>
      </Field>

      {status === "success" && (
        <p className="mt-5 rounded-2xl border border-primary/20 bg-accent px-4 py-3 text-sm leading-6 text-foreground" role="status" aria-live="polite">
          {"So‘rovingiz qabul qilindi. MIRROR jamoasi siz bilan bog‘lanadi."}
        </p>
      )}
      {status === "error" && (
        <p className="mt-5 rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm leading-6 text-destructive" role="alert">
          {"So‘rov yuborilmadi. Iltimos, birozdan so‘ng qayta urinib ko‘ring."}
        </p>
      )}

      <Button className="mt-6 h-12 w-full rounded-full" disabled={status === "submitting"} size="lg" type="submit">
        {status === "submitting" ? (
          <>
            <LoaderCircle aria-hidden="true" className="animate-spin" data-icon="inline-start" />
            Yuborilmoqda
          </>
        ) : (
          <>
            {"So‘rovni yuborish"}
            <ArrowRight aria-hidden="true" data-icon="inline-end" />
          </>
        )}
      </Button>
      <p className="mt-3 text-center text-xs leading-5 text-muted-foreground">
        {"Ushbu shakl faqat demo, hamkorlik yoki aloqa so‘rovini yuborish uchun ishlatiladi."}
      </p>
    </form>
  );
}
