"use client"

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react"
import { AlertCircle, CheckCircle2, Inbox, X } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useMarketingLanguage, useText } from "@/components/marketing-language"
import { LANGUAGE_LOCALES } from "@/lib/i18n"

export function useLocale() {
  const { language } = useMarketingLanguage()
  return LANGUAGE_LOCALES[language]
}

export function PageHeader({ eyebrow, title, description, children }: { eyebrow?: string; title: string; description?: string; children?: ReactNode }) {
  return (
    <header className="cx-head">
      <div>
        {eyebrow && <span className="cx-eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {children && <div className="cx-head-actions">{children}</div>}
    </header>
  )
}

/** Counts up to the value once; respects reduced motion. */
export function CountUp({ value, format }: { value: number; format?: (n: number) => string }) {
  const [shown, setShown] = useState(0)
  const from = useRef(0)
  useEffect(() => {
    if (typeof window === "undefined") return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setShown(value); return }
    const start = performance.now(), origin = from.current
    let frame = 0
    const tick = (now: number) => {
      const p = Math.min((now - start) / 900, 1)
      const eased = 1 - (1 - p) ** 3
      setShown(origin + (value - origin) * eased)
      if (p < 1) frame = requestAnimationFrame(tick)
      else from.current = value
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value])
  const locale = useLocale()
  const rounded = Number.isInteger(value) ? Math.round(shown) : Math.round(shown * 100) / 100
  return <>{format ? format(rounded) : new Intl.NumberFormat(locale).format(rounded)}</>
}

export function Stat({ label, value, note, icon: Icon, tone, format, index = 0 }: { label: string; value: number | undefined; note?: string; icon: LucideIcon; tone?: "hero" | "warn" | "good"; format?: (n: number) => string; index?: number }) {
  return (
    <div className={`cx-stat${tone ? ` is-${tone}` : ""}`} style={{ animationDelay: `${index * 60}ms` }}>
      <div className="cx-stat-top"><span>{label}</span><span className="cx-stat-icon"><Icon aria-hidden="true" /></span></div>
      <div className="cx-stat-value">{value === undefined ? "—" : <CountUp value={value} format={format} />}</div>
      {note && <div className="cx-stat-note">{note}</div>}
    </div>
  )
}

export function Card({ title, description, actions, children, className = "" }: { title?: string; description?: string; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`cx-card ${className}`}>
      {(title || actions) && <div className="cx-card-head"><div>{title && <h2>{title}</h2>}{description && <p>{description}</p>}</div>{actions}</div>}
      <div className="cx-card-body">{children}</div>
    </section>
  )
}

const tones: Record<string, string> = {
  ACTIVE: "good", Published: "good", COMPLETED: "good", APPROVED: "good", ONLINE: "good",
  NEW: "", REVIEWING: "", SENT_TO_CASHIER: "", Draft: "muted", INACTIVE: "muted", PENDING: "warn", OFFLINE: "muted", CLOSED: "muted",
  MORE_INFORMATION_REQUIRED: "warn", Blocked: "warn", EXPIRED: "warn",
  SUSPENDED: "bad", REJECTED: "bad", CANCELLED: "bad", Archived: "muted",
}
const statusLabels: Record<string, string> = {
  ACTIVE: "Active", INACTIVE: "Inactive", SUSPENDED: "Suspended", PENDING: "Pending", NEW: "New", REVIEWING: "Reviewing",
  MORE_INFORMATION_REQUIRED: "Needs information", APPROVED: "Approved", REJECTED: "Rejected", CLOSED: "Closed",
  SENT_TO_CASHIER: "At cashier", COMPLETED: "Sold", CANCELLED: "Cancelled", EXPIRED: "Expired", ONLINE: "Online", OFFLINE: "Offline",
  Published: "Published", Draft: "Draft", Blocked: "Blocked", Archived: "Archived",
}
export function Status({ value }: { value: string }) {
  const t = useText()
  const tone = tones[value] ?? ""
  return <span className={`cx-badge${tone ? ` is-${tone}` : ""}`}>{t(statusLabels[value] ?? value)}</span>
}

export function Empty({ title, text, icon: Icon = Inbox, children }: { title: string; text?: string; icon?: LucideIcon; children?: ReactNode }) {
  return <div className="cx-empty"><Icon aria-hidden="true" /><strong>{title}</strong>{text && <span>{text}</span>}{children}</div>
}

export function ErrorNote({ error }: { error: unknown }) {
  const t = useText()
  if (!error) return null
  const message = error instanceof Error ? error.message : String(error)
  return <div className="cx-error" role="alert"><AlertCircle aria-hidden="true" /><span>{t(message)}</span></div>
}

export function Skeletons({ count = 4 }: { count?: number }) {
  return <div className="cx-stats" aria-busy="true">{Array.from({ length: count }, (_, i) => <div key={i} className="cx-skeleton" />)}</div>
}

export function Modal({ title, onClose, children, footer, wide, drawer }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean; drawer?: boolean }) {
  const t = useText()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = overflow }
  }, [onClose])
  return (
    <div className={`cx-overlay${drawer ? " is-drawer" : ""}`} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className={`cx-modal${wide ? " is-wide" : ""}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="cx-modal-head"><h2>{title}</h2><button type="button" className="cx-btn is-ghost is-icon" onClick={onClose} aria-label={t("Close")}><X aria-hidden="true" /></button></div>
        <div className="cx-modal-body">{children}</div>
        {footer && <div className="cx-modal-foot">{footer}</div>}
      </div>
    </div>
  )
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="cx-field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>
}

export function Segment<T extends string | number>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return <div className="cx-segment" role="group" aria-label={label}>{options.map((o) => <button key={String(o.value)} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>{o.label}</button>)}</div>
}

type Toast = { id: number; text: string; bad?: boolean }
const ToastContext = createContext<(text: string, bad?: boolean) => void>(() => {})
export function ToastProvider({ children }: { children: ReactNode }) {
  const t = useText()
  const [toasts, setToasts] = useState<Toast[]>([])
  const push = useCallback((text: string, bad = false) => {
    const id = Date.now() + Math.random()
    setToasts((all) => [...all, { id, text, bad }])
    setTimeout(() => setToasts((all) => all.filter((x) => x.id !== id)), 3800)
  }, [])
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="cx-toasts" role="status" aria-live="polite">
        {toasts.map((toast) => <div key={toast.id} className={`cx-toast${toast.bad ? " is-bad" : ""}`}>{toast.bad ? <AlertCircle aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}{t(toast.text)}</div>)}
      </div>
    </ToastContext.Provider>
  )
}
export const useToast = () => useContext(ToastContext)

/** Runs an async action with a busy flag and a toast for success or failure. */
export function useAction() {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const run = useCallback(async (action: () => Promise<unknown>, success?: string) => {
    setBusy(true)
    try { await action(); if (success) toast(success); return true }
    catch (error) { toast(error instanceof Error ? error.message : "Something went wrong", true); return false }
    finally { setBusy(false) }
  }, [toast])
  return { busy, run }
}
