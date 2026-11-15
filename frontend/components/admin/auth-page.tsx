"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"
import { ArrowLeft, LockKeyhole, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { apiFetch } from "@/lib/api"
import { dashboardPathForRole, type PlatformRole } from "@/lib/admin/access"

type AuthMode = "login" | "forgot" | "reset"

const content: Record<AuthMode, { eyebrow: string; title: string; description: string; submit: string }> = {
  login: {
    eyebrow: "ADMIN ACCESS",
    title: "Welcome back",
    description: "Sign in to manage your MIRROR workspace.",
    submit: "Sign in",
  },
  forgot: {
    eyebrow: "ACCOUNT RECOVERY",
    title: "Reset your password",
    description: "Enter the email attached to your administrator account.",
    submit: "Send recovery link",
  },
  reset: {
    eyebrow: "SECURE YOUR ACCOUNT",
    title: "Create a new password",
    description: "Choose a strong password for your MIRROR account.",
    submit: "Update password",
  },
}

export function AuthPage({ mode }: { mode: AuthMode }) {
  const [feedback, setFeedback] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const copy = content[mode]

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (mode === "reset" && password !== confirmPassword) {
      setFeedback("The passwords do not match. Check both fields and try again.")
      return
    }
    if (mode !== "login") { setFeedback("Account recovery requires a configured email provider. Contact your administrator."); return }
    const form = new FormData(event.currentTarget)
    try {
      const response = await apiFetch("/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: form.get("email"), password }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Sign-in failed")
      setFeedback("Signed in. Your session is ready; admin modules that still show sample data remain previews.")
      // Keep preview consoles gated in production until their sample modules are migrated.
      const liveCatalog = process.env.NEXT_PUBLIC_ENABLE_LIVE_CATALOG === "true" && data.user.role === "BRAND_ADMIN"
      window.location.assign(liveCatalog ? "/brand/products" : process.env.NODE_ENV === "production" ? "/mirror" : dashboardPathForRole(data.user.role as PlatformRole))
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Sign-in failed") }
  }

  return (
    <main className="mirror-auth-page" data-auth-mode={mode}>
      <section className="mirror-auth-panel" aria-labelledby="auth-title">
        <header className="mirror-auth-brand-row">
          <Link href="/" className="mirror-auth-brand" aria-label="MIRROR platform home">
            <span className="mirror-auth-brand-mark" aria-hidden="true"><span /></span>
            <span>MIRROR <small>/ PLATFORM</small></span>
          </Link>
          <span className="mirror-auth-secure"><ShieldCheck aria-hidden="true" /> Admin portal</span>
        </header>
        <div className="mirror-auth-form-wrap">
          <Link href="/mirror" className="mirror-auth-back"><ArrowLeft aria-hidden="true" /> Back to fitting room</Link>
          <div className="mirror-auth-form-heading">
            <span className="mirror-auth-eyebrow">{copy.eyebrow}</span>
            <h1 id="auth-title">{copy.title}</h1>
            <p>{copy.description}</p>
          </div>
          <div className="mirror-auth-api-note" role="status">
            <LockKeyhole aria-hidden="true" />
            <span>{mode === "login" ? "Sign in securely through the MIRROR backend." : "Account recovery requires a configured email provider."}</span>
          </div>

          <form className="mirror-auth-form" onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="auth-email">Email address</FieldLabel>
                <Input id="auth-email" type="email" name="email" autoComplete="email" placeholder="you@company.com" required disabled={mode !== "login"} />
              </Field>
              {mode !== "forgot" && (
                <Field>
                  <FieldLabel htmlFor="auth-password">{mode === "reset" ? "New password" : "Password"}</FieldLabel>
                  <div className="mirror-auth-password-field">
                    <Input
                      id="auth-password"
                      type="password"
                      name="password"
                      autoComplete={mode === "reset" ? "new-password" : "current-password"}
                      placeholder={mode === "reset" ? "At least 12 characters" : "Enter your password"}
                      minLength={mode === "reset" ? 12 : undefined}
                      required
                      disabled={mode !== "login"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                    />
                  </div>
                </Field>
              )}
              {mode === "reset" && (
                <Field>
                  <FieldLabel htmlFor="confirm-password">Confirm new password</FieldLabel>
                  <Input
                    id="confirm-password"
                    type="password"
                    name="confirmPassword"
                    autoComplete="new-password"
                    placeholder="Re-enter your password"
                    minLength={12}
                    required
                    disabled
                    aria-invalid={Boolean(confirmPassword && password !== confirmPassword)}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                  />
                  {confirmPassword && password !== confirmPassword && <FieldDescription className="mirror-auth-error">Passwords do not match.</FieldDescription>}
                </Field>
              )}
            </FieldGroup>

            <Button type="submit" className="mirror-auth-submit" disabled={mode !== "login"}>{mode === "login" ? copy.submit : "Service unavailable"}</Button>
            {feedback && <p className="mirror-auth-feedback" role="alert">{feedback}</p>}
          </form>

          <p className="mirror-auth-security"><LockKeyhole aria-hidden="true" /> Sessions use secure server-managed cookies.</p>
          {mode !== "login" && <Link href="/login" className="mirror-auth-back-link">Return to sign in</Link>}
        </div>
        <footer className="mirror-auth-footer"><span>Need access? Contact your platform administrator.</span><span>Privacy&nbsp;&nbsp; · &nbsp;&nbsp;Terms</span></footer>
      </section>
    </main>
  )
}
