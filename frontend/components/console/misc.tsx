"use client"

import { useState, type FormEvent } from "react"
import { Bell, CheckCheck, FileClock, KeyRound, LogOut, Sparkles } from "lucide-react"
import { useText } from "@/components/marketing-language"
import { formatDate, money, send, useApi, type AuditLog, type Me, type Notice, type Plan, type Subscription } from "@/lib/console/api"
import { Card, Empty, ErrorNote, Field, PageHeader, Skeletons, Stat, Status, useAction, useLocale } from "./ui"

export function BrandSubscription() {
  const t = useText()
  const locale = useLocale()
  const sub = useApi<Subscription[]>("/subscription")
  const plans = useApi<Plan[]>("/plans")
  const s = sub.data?.[0]
  const left = s ? Math.max(0, s.plan.monthly_tryons - s.used) + s.extra_credits : undefined
  return (
    <>
      <PageHeader eyebrow={t("Billing")} title={t("Subscription")} description={t("Your plan, AI try-on allowance and renewal date. Contact the MIRROR team to change the plan.")} />
      <ErrorNote error={sub.error} />
      {!s ? <Skeletons count={3} /> : <>
        <div className="cx-stats">
          <Stat index={0} tone="hero" icon={Sparkles} label={t("AI try-ons left")} value={left} note={t("{used} of {total} used this month", { used: s.used, total: s.plan.monthly_tryons })} />
          <Stat index={1} icon={Sparkles} label={t("Plan")} value={s.plan.price_cents / 100} format={(n) => money(n, locale)} note={`${s.plan.name} · ${t("month")}`} />
          <Stat index={2} tone={Date.parse(s.expires_at) - Date.now() < 7 * 86400000 ? "warn" : "good"} icon={Bell} label={t("Days left")} value={Math.max(0, Math.ceil((Date.parse(s.expires_at) - Date.now()) / 86400000))} note={t("Paid until {date}", { date: formatDate(s.expires_at, locale, false) })} />
        </div>
        <Card title={t("Usage this month")}><div className="cx-progress"><i style={{ width: `${Math.min(100, (s.used / Math.max(1, s.plan.monthly_tryons)) * 100)}%` }} /></div><p className="cx-muted cx-small">{t("Resets on {date}", { date: formatDate(s.period_end, locale, false) })}{s.extra_credits ? ` · ${t("{count} extra try-ons", { count: s.extra_credits })}` : ""}</p></Card>
        <div className="cx-grid-3" style={{ marginTop: 16 }}>{(plans.data ?? []).map((p) => <div key={p.id} className={`cx-plan cx-card${p.id === s.plan_id ? " is-current" : ""}`}><strong>{p.name}</strong><b>{money(p.price_cents / 100, locale)}<span className="cx-muted cx-small"> / {t("month")}</span></b><ul><li>{t("{count} branches", { count: p.branch_limit })}</li><li>{t("{count} mirrors", { count: p.device_limit })}</li><li>{t("{count} AI try-ons / month", { count: p.monthly_tryons })}</li></ul>{p.id === s.plan_id && <span className="cx-badge is-good">{t("Current")}</span>}</div>)}</div>
      </>}
    </>
  )
}

export function Notifications() {
  const t = useText()
  const locale = useLocale()
  const list = useApi<Notice[]>("/notifications", { refreshInterval: 60000 })
  const { busy, run } = useAction()
  const unread = (list.data ?? []).filter((n) => !n.read_at)
  const markAll = () => run(async () => { for (const n of unread) await send(`/notifications/${n.id}`, "PATCH", { read: true }); await list.mutate() }, "All marked as read")
  return (
    <>
      <PageHeader eyebrow={t("Inbox")} title={t("Notifications")}>{unread.length > 0 && <button type="button" className="cx-btn" disabled={busy} onClick={markAll}><CheckCheck aria-hidden="true" />{t("Mark all as read")}</button>}</PageHeader>
      <ErrorNote error={list.error} />
      {!list.data && !list.error ? <Skeletons count={2} /> : !list.data?.length ? <div className="cx-card"><Empty icon={Bell} title={t("No notifications")} /></div> : (
        <div className="cx-card cx-table-wrap"><table className="cx-table"><tbody>{list.data.map((n) => <tr key={n.id}><td style={{ width: 24 }}>{!n.read_at && <span className="cx-dot-live" style={{ background: "#2563eb" }} />}</td><td className={n.read_at ? "cx-muted" : "cx-strong"}>{n.title}</td><td className="cx-small cx-muted">{formatDate(n.created_at, locale)}</td><td className="is-num">{!n.read_at && <button type="button" className="cx-btn is-sm" disabled={busy} onClick={() => run(async () => { await send(`/notifications/${n.id}`, "PATCH", { read: true }); await list.mutate() })}>{t("Read")}</button>}</td></tr>)}</tbody></table></div>
      )}
    </>
  )
}

const ACTIONS: Record<string, string> = {
  "fitting.start": "AI try-on started", "product.save": "Product saved", "product.archive": "Product archived", "inventory.adjust": "Stock changed",
  "inventory.transfer": "Stock transferred", "order.cashier_request": "Sent to cashier", "order.status": "Order status changed", "branch.create": "Branch created",
  "branch.update": "Branch updated", "device.create": "Mirror added", "user.create": "Account created", "user.status": "Account status changed",
  "user.password": "Password changed", "user.password_reset": "Password reset", "brand.create": "Brand created", "brand.status": "Brand status changed",
  "subscription.plan": "Plan changed", "subscription.extend": "Subscription extended", "credits.grant": "Credits added", "application.review": "Application reviewed",
}

export function AuditLogs({ platform }: { platform: boolean }) {
  const t = useText()
  const locale = useLocale()
  const logs = useApi<AuditLog[]>(platform ? "/audit-logs?scope=platform" : "/audit-logs")
  const [hideFittings, setHideFittings] = useState(true)
  const list = (logs.data ?? []).filter((l) => !hideFittings || l.action !== "fitting.start")
  return (
    <>
      <PageHeader eyebrow={t("Security")} title={t("Audit logs")} description={t("Who changed what and when. The latest 500 events.")}>
        <label className="cx-btn is-sm"><input type="checkbox" checked={hideFittings} onChange={(e) => setHideFittings(e.target.checked)} /> {t("Hide AI try-ons")}</label>
      </PageHeader>
      <ErrorNote error={logs.error} />
      {!logs.data && !logs.error ? <Skeletons count={2} /> : !list.length ? <div className="cx-card"><Empty icon={FileClock} title={t("No events yet")} /></div> : (
        <div className="cx-card cx-table-wrap"><table className="cx-table"><thead><tr><th>{t("Date")}</th><th>{t("Event")}</th><th>{t("Who")}</th><th>{t("Details")}</th></tr></thead>
          <tbody>{list.map((l) => <tr key={l.id}><td className="cx-small">{formatDate(l.created_at, locale)}</td><td className="cx-strong">{t(ACTIONS[l.action] ?? l.action)}</td><td className="cx-small">{l.actor || t("System")}</td><td className="cx-small cx-muted">{Object.entries(l.details ?? {}).filter(([k]) => !["id", "productId", "variantId", "branchId", "fromBranchId", "toBranchId"].includes(k)).map(([k, v]) => `${k}: ${String(v)}`).join(" · ") || "—"}</td></tr>)}</tbody></table></div>
      )}
    </>
  )
}

export function Account({ me, onSignOut }: { me: Me; onSignOut: () => void }) {
  const t = useText()
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [repeat, setRepeat] = useState("")
  const [error, setError] = useState("")
  const { busy, run } = useAction()
  async function submit(event: FormEvent) {
    event.preventDefault()
    setError("")
    if (next.length < 12) return setError("The new password must be at least 12 characters.")
    if (next !== repeat) return setError("The passwords do not match.")
    const ok = await run(() => send("/auth/password", "POST", { currentPassword: current, newPassword: next }), "Password changed")
    if (ok) { setCurrent(""); setNext(""); setRepeat("") }
  }
  return (
    <>
      <PageHeader eyebrow={t("Profile")} title={t("Account")} />
      <div className="cx-layout-even">
        <Card title={t("Signed in as")}>
          <dl className="cx-kv"><dt>{t("Email")}</dt><dd className="cx-strong">{me.email}</dd><dt>{t("Role")}</dt><dd><Status value={me.status} /> {t(({ SUPER_ADMIN: "Super admin", BRAND_ADMIN: "Brand admin", STORE_ADMIN: "Store admin", STAFF: "Staff" } as const)[me.role])}</dd></dl>
          <button type="button" className="cx-btn is-danger" style={{ marginTop: 16 }} onClick={onSignOut}><LogOut aria-hidden="true" />{t("Sign out")}</button>
        </Card>
        <Card title={t("Change password")} description={t("Other devices are signed out after the change.")}>
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {error && <ErrorNote error={error} />}
            <Field label={t("Current password")}><input className="cx-input" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required /></Field>
            <Field label={t("New password")} hint={t("At least 12 characters")}><input className="cx-input" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} required minLength={12} /></Field>
            <Field label={t("Repeat new password")}><input className="cx-input" type="password" autoComplete="new-password" value={repeat} onChange={(e) => setRepeat(e.target.value)} required /></Field>
            <button type="submit" className="cx-btn is-primary" disabled={busy}><KeyRound aria-hidden="true" />{t("Change password")}</button>
          </form>
        </Card>
      </div>
    </>
  )
}
