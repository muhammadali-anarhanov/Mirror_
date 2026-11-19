"use client"

import { useMemo, useState } from "react"
import { Building2, CalendarPlus, ClipboardList, Coins, Mail, Phone, Plus, Search } from "lucide-react"
import { useText } from "@/components/marketing-language"
import {
  formatDate, generatePassword, money, scoped, send, useApi,
  type Application, type Brand, type Plan, type Subscription,
} from "@/lib/console/api"
import { Branches, SecretBox, Staff } from "./organization"
import { Card, Empty, ErrorNote, Field, Modal, PageHeader, Segment, Skeletons, Stat, Status, useAction, useLocale } from "./ui"

const APP_STATUSES = ["NEW", "REVIEWING", "MORE_INFORMATION_REQUIRED", "APPROVED", "REJECTED", "CLOSED"]
const APP_TYPES: Record<string, string> = { DEMO: "Demo request", CONTACT: "Contact", PARTNERSHIP: "Partnership" }

export function Applications() {
  const t = useText()
  const locale = useLocale()
  const apps = useApi<Application[]>("/applications", { refreshInterval: 60000 })
  const [filter, setFilter] = useState("open")
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState<Application | null>(null)
  const list = (apps.data ?? []).filter((a) => {
    if (filter === "open" && !["NEW", "REVIEWING", "MORE_INFORMATION_REQUIRED"].includes(a.status)) return false
    if (filter !== "open" && filter !== "all" && a.status !== filter) return false
    const q = query.trim().toLowerCase()
    return !q || [a.payload.companyName, a.payload.contactName, a.payload.email, a.payload.country].some((x) => x?.toLowerCase().includes(q))
  })
  const count = (s: string) => (apps.data ?? []).filter((a) => a.status === s).length
  return (
    <>
      <PageHeader eyebrow={t("Onboarding")} title={t("Applications")} description={t("Requests sent from the public website. Approve one to create the brand and its admin account.")} />
      <div className="cx-stats">
        <Stat index={0} tone="hero" icon={ClipboardList} label={t("New")} value={apps.data ? count("NEW") : undefined} note={t("{count} received in total", { count: apps.data?.length ?? 0 })} />
        <Stat index={1} icon={ClipboardList} label={t("Reviewing")} value={apps.data ? count("REVIEWING") + count("MORE_INFORMATION_REQUIRED") : undefined} />
        <Stat index={2} tone="good" icon={Building2} label={t("Approved")} value={apps.data ? count("APPROVED") : undefined} />
      </div>
      <div className="cx-toolbar">
        <label className="cx-search"><Search aria-hidden="true" /><input className="cx-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("Search company, name or email")} aria-label={t("Search")} /></label>
        <Segment label={t("Status")} value={filter} onChange={setFilter} options={[{ value: "open", label: t("Open") }, { value: "APPROVED", label: t("Approved") }, { value: "REJECTED", label: t("Rejected") }, { value: "all", label: t("All") }]} />
      </div>
      <ErrorNote error={apps.error} />
      {!apps.data && !apps.error ? <Skeletons /> : !list.length ? (
        <div className="cx-card"><Empty icon={ClipboardList} title={t("No applications here")} text={t("New requests from the website appear here automatically.")} /></div>
      ) : (
        <div className="cx-card cx-table-wrap"><table className="cx-table">
          <thead><tr><th>{t("Date")}</th><th>{t("Company")}</th><th>{t("Contact")}</th><th>{t("Type")}</th><th>{t("Status")}</th><th className="is-num" /></tr></thead>
          <tbody>{list.map((a) => <tr key={a.id} style={{ cursor: "pointer" }} onClick={() => setOpen(a)}>
            <td className="cx-small">{formatDate(a.created_at, locale)}</td>
            <td className="cx-strong">{a.payload.companyName}<div className="cx-small cx-muted">{a.payload.country || ""}</div></td>
            <td>{a.payload.contactName}<div className="cx-small cx-muted">{a.payload.email}</div></td>
            <td>{t(APP_TYPES[a.payload.applicationType] ?? a.payload.applicationType)}</td>
            <td><Status value={a.status} /></td>
            <td className="is-num"><button type="button" className="cx-btn is-sm">{t("Open")}</button></td>
          </tr>)}</tbody>
        </table></div>
      )}
      {open && <ApplicationDrawer app={open} onClose={() => setOpen(null)} onChanged={() => void apps.mutate()} />}
    </>
  )
}

function ApplicationDrawer({ app, onClose, onChanged }: { app: Application; onClose: () => void; onChanged: () => void }) {
  const t = useText()
  const locale = useLocale()
  const [status, setStatus] = useState(app.status)
  const [creating, setCreating] = useState(false)
  const { busy, run } = useAction()
  const p = app.payload
  const setTo = (next: string) => run(async () => { await send(`/applications/${app.id}`, "PATCH", { status: next }); setStatus(next); onChanged() }, "Status updated")
  return (
    <Modal drawer title={p.companyName} onClose={onClose} footer={<>
      <select className="cx-select" style={{ width: "auto", marginInlineEnd: "auto" }} value={status} disabled={busy} onChange={(e) => e.target.value !== "NEW" && setTo(e.target.value)} aria-label={t("Status")}>
        {APP_STATUSES.map((s) => <option key={s} value={s} disabled={s === "NEW"}>{t(({ NEW: "New", REVIEWING: "Reviewing", MORE_INFORMATION_REQUIRED: "Needs information", APPROVED: "Approved", REJECTED: "Rejected", CLOSED: "Closed" } as Record<string, string>)[s])}</option>)}
      </select>
      <button type="button" className="cx-btn is-danger" disabled={busy || status === "REJECTED"} onClick={() => setTo("REJECTED")}>{t("Reject")}</button>
      <button type="button" className="cx-btn is-primary" disabled={busy || status === "APPROVED"} onClick={() => setCreating(true)}><Building2 aria-hidden="true" />{t("Approve and create brand")}</button>
    </>}>
      <div className="cx-toolbar"><Status value={status} /><span className="cx-muted cx-small">{formatDate(app.created_at, locale)} · {t(APP_TYPES[p.applicationType] ?? p.applicationType)}</span></div>
      <dl className="cx-kv">
        <dt>{t("Contact")}</dt><dd className="cx-strong">{p.contactName}</dd>
        <dt>{t("Email")}</dt><dd><a href={`mailto:${p.email}`} className="cx-btn is-sm"><Mail aria-hidden="true" />{p.email}</a></dd>
        {p.phone && <><dt>{t("Phone")}</dt><dd><a href={`tel:${p.phone}`} className="cx-btn is-sm"><Phone aria-hidden="true" />{p.phone}</a></dd></>}
        {p.country && <><dt>{t("Country")}</dt><dd>{p.country}</dd></>}
        {p.website && <><dt>{t("Website")}</dt><dd>{p.website}</dd></>}
        {p.requestedBranches ? <><dt>{t("Branches")}</dt><dd>{p.requestedBranches}</dd></> : null}
      </dl>
      {p.message && <Card title={t("Message")}><p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{p.message}</p></Card>}
      {creating && <CreateBrandDialog defaultName={p.companyName} defaultEmail={p.email} onClose={() => setCreating(false)} onCreated={async () => { await send(`/applications/${app.id}`, "PATCH", { status: "APPROVED" }); setStatus("APPROVED"); onChanged() }} />}
    </Modal>
  )
}

/** Creates a brand, optionally its first branch and admin account. */
function CreateBrandDialog({ defaultName = "", defaultEmail = "", onClose, onCreated }: { defaultName?: string; defaultEmail?: string; onClose: () => void; onCreated?: () => Promise<void> | void }) {
  const t = useText()
  const [name, setName] = useState(defaultName)
  const [branch, setBranch] = useState(t("Main store"))
  const [email, setEmail] = useState(defaultEmail)
  const [password] = useState(generatePassword)
  const [result, setResult] = useState<{ email: string } | null>(null)
  const { busy, run } = useAction()
  const create = () => run(async () => {
    const brand = await send<{ id: string }>("/brands", "POST", { name: name.trim() })
    if (branch.trim()) await send(scoped("/branches", brand.id), "POST", { name: branch.trim(), address: "" })
    if (email.trim()) await send(scoped("/users", brand.id), "POST", { email: email.trim(), password, role: "BRAND_ADMIN", branchId: "" })
    await onCreated?.()
    setResult({ email: email.trim() })
  }, "Brand created")
  if (result) return (
    <Modal title={t("Brand created")} onClose={onClose} footer={<button type="button" className="cx-btn is-primary" onClick={onClose}>{t("Done")}</button>}>
      {result.email ? <><p>{t("Send these sign-in details to the brand admin. The password is shown only once.")}</p><dl className="cx-kv"><dt>{t("Sign-in page")}</dt><dd>{typeof window !== "undefined" ? `${window.location.origin}/login` : "/login"}</dd><dt>{t("Email")}</dt><dd className="cx-strong">{result.email}</dd></dl><SecretBox value={password} /></> : <p>{t("The brand is ready. Add an admin account from the brand page.")}</p>}
    </Modal>
  )
  return (
    <Modal title={t("New brand")} onClose={onClose} footer={<><button type="button" className="cx-btn" onClick={onClose}>{t("Cancel")}</button><button type="button" className="cx-btn is-primary" disabled={busy || name.trim().length < 2} onClick={create}>{t("Create")}</button></>}>
      <Field label={t("Brand name")}><input className="cx-input" value={name} onChange={(e) => setName(e.target.value)} autoFocus /></Field>
      <Field label={t("First branch")} hint={t("Leave empty to add later")}><input className="cx-input" value={branch} onChange={(e) => setBranch(e.target.value)} /></Field>
      <Field label={t("Brand admin email")} hint={t("Leave empty to add later")}><input className="cx-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
      <p className="cx-muted cx-small">{t("The brand starts on the Starter plan for one month.")}</p>
    </Modal>
  )
}

export function Brands() {
  const t = useText()
  const locale = useLocale()
  const brands = useApi<Brand[]>("/brands")
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState<Brand | null>(null)
  const [creating, setCreating] = useState(false)
  const list = (brands.data ?? []).filter((b) => !query.trim() || b.name.toLowerCase().includes(query.trim().toLowerCase()))
  return (
    <>
      <PageHeader eyebrow={t("Platform")} title={t("Brands")} description={t("Every brand on MIRROR with its plan, size and status.")}><button type="button" className="cx-btn is-primary" onClick={() => setCreating(true)}><Plus aria-hidden="true" />{t("New brand")}</button></PageHeader>
      <div className="cx-toolbar"><label className="cx-search"><Search aria-hidden="true" /><input className="cx-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("Search")} aria-label={t("Search")} /></label></div>
      <ErrorNote error={brands.error} />
      {!brands.data && !brands.error ? <Skeletons /> : !list.length ? (
        <div className="cx-card"><Empty icon={Building2} title={t("No brands yet")} text={t("Approve an application or create a brand.")} /></div>
      ) : (
        <div className="cx-card cx-table-wrap"><table className="cx-table">
          <thead><tr><th>{t("Brand")}</th><th>{t("Plan")}</th><th>{t("Paid until")}</th><th className="is-num">{t("Branches")}</th><th className="is-num">{t("Products")}</th><th className="is-num">{t("Mirrors")}</th><th>{t("Status")}</th><th /></tr></thead>
          <tbody>{list.map((b) => <tr key={b.id} style={{ cursor: "pointer" }} onClick={() => setOpen(b)}>
            <td className="cx-strong">{b.name}<div className="cx-small cx-muted">{formatDate(b.created_at, locale, false)}</div></td>
            <td>{b.planId ?? "—"}</td><td className="cx-small">{formatDate(b.expiresAt, locale, false)}</td>
            <td className="is-num">{b.branches}</td><td className="is-num">{b.products}</td><td className="is-num">{b.devices}</td>
            <td><Status value={b.status} /></td><td className="is-num"><button type="button" className="cx-btn is-sm">{t("Manage")}</button></td>
          </tr>)}</tbody>
        </table></div>
      )}
      {creating && <CreateBrandDialog onClose={() => { setCreating(false); void brands.mutate() }} />}
      {open && <BrandDrawer brand={open} onClose={() => { setOpen(null); void brands.mutate() }} />}
    </>
  )
}

function BrandDrawer({ brand, onClose }: { brand: Brand; onClose: () => void }) {
  const t = useText()
  const locale = useLocale()
  const [tab, setTab] = useState("plan")
  const sub = useApi<Subscription[]>(scoped("/subscription", brand.id))
  const plans = useApi<Plan[]>("/plans")
  const [status, setStatus] = useState(brand.status)
  const [credits, setCredits] = useState(100)
  const { busy, run } = useAction()
  const s = sub.data?.[0]
  const changeStatus = () => {
    const next = status === "ACTIVE" ? "SUSPENDED" : "ACTIVE"
    const reason = window.prompt(t("Reason (at least 5 characters)"), next === "SUSPENDED" ? t("Payment overdue") : t("Payment received"))
    if (!reason || reason.trim().length < 5) return
    void run(async () => { await send(`/brands/${brand.id}`, "PATCH", { status: next, reason }); setStatus(next) }, next === "SUSPENDED" ? "Brand suspended" : "Brand activated")
  }
  return (
    <Modal drawer wide title={brand.name} onClose={onClose} footer={<button type="button" className={`cx-btn${status === "ACTIVE" ? " is-danger" : " is-primary"}`} disabled={busy} onClick={changeStatus}>{status === "ACTIVE" ? t("Suspend brand") : t("Activate brand")}</button>}>
      <div className="cx-toolbar"><Status value={status} /><Segment label={t("Section")} value={tab} onChange={setTab} options={[{ value: "plan", label: t("Subscription") }, { value: "branches", label: t("Branches") }, { value: "staff", label: t("Accounts") }]} /></div>
      {tab === "plan" && <>
        <ErrorNote error={sub.error} />
        {s && <div className="cx-card"><div className="cx-card-body"><dl className="cx-kv">
          <dt>{t("Plan")}</dt><dd className="cx-strong">{s.plan.name} · {money(s.plan.price_cents / 100, locale)}/{t("month")}</dd>
          <dt>{t("Status")}</dt><dd><Status value={s.status} /></dd>
          <dt>{t("Paid until")}</dt><dd>{formatDate(s.expires_at, locale, false)}</dd>
          <dt>{t("AI try-ons this month")}</dt><dd>{s.used} / {s.plan.monthly_tryons} {s.extra_credits ? `+ ${s.extra_credits} ${t("extra")}` : ""}</dd>
        </dl><div className="cx-progress" style={{ marginTop: 12 }}><i style={{ width: `${Math.min(100, (s.used / Math.max(1, s.plan.monthly_tryons)) * 100)}%` }} /></div></div></div>}
        <p className="cx-section-title">{t("Change plan")}</p>
        <div className="cx-grid-3">{(plans.data ?? []).map((p) => <div key={p.id} className={`cx-plan${s?.plan_id === p.id ? " is-current" : ""}`}><strong>{p.name}</strong><b>{money(p.price_cents / 100, locale)}</b><ul><li>{t("{count} branches", { count: p.branch_limit })}</li><li>{t("{count} mirrors", { count: p.device_limit })}</li><li>{t("{count} AI try-ons / month", { count: p.monthly_tryons })}</li></ul>
          <button type="button" className="cx-btn is-sm" disabled={busy || s?.plan_id === p.id} onClick={() => run(async () => { await send(scoped("/subscription", brand.id), "PUT", { planId: p.id }); await sub.mutate() }, "Plan changed")}>{s?.plan_id === p.id ? t("Current") : t("Switch")}</button></div>)}</div>
        <p className="cx-section-title">{t("Payment and credits")}</p>
        <div className="cx-toolbar">
          <button type="button" className="cx-btn is-primary" disabled={busy} onClick={() => run(async () => { await send(scoped("/subscription", brand.id), "PUT", { extendDays: 30 }); await sub.mutate() }, "Extended by 30 days")}><CalendarPlus aria-hidden="true" />{t("Payment received: +30 days")}</button>
          <input className="cx-input" style={{ width: 110 }} type="number" min={1} value={credits} onChange={(e) => setCredits(Math.max(1, Number(e.target.value) || 1))} aria-label={t("Extra AI try-ons")} />
          <button type="button" className="cx-btn" disabled={busy} onClick={() => run(async () => { await send(scoped("/credits", brand.id), "POST", { amount: credits, reference: `console-${Date.now()}` }); await sub.mutate() }, "Credits added")}><Coins aria-hidden="true" />{t("Add extra try-ons")}</button>
        </div>
      </>}
      {tab === "branches" && <Branches tenantId={brand.id} />}
      {tab === "staff" && <Staff tenantId={brand.id} />}
    </Modal>
  )
}

export function Subscriptions() {
  const t = useText()
  const locale = useLocale()
  const brands = useApi<Brand[]>("/brands")
  const plans = useApi<Plan[]>("/plans")
  const soon = useMemo(() => (brands.data ?? []).filter((b) => b.expiresAt && Date.parse(b.expiresAt) - Date.now() < 7 * 86400000), [brands.data])
  const mrr = (brands.data ?? []).filter((b) => b.status === "ACTIVE" && b.subscriptionStatus === "ACTIVE" && b.expiresAt && Date.parse(b.expiresAt) > Date.now()).reduce((sum, b) => sum + (plans.data?.find((p) => p.id === b.planId)?.price_cents ?? 0) / 100, 0)
  return (
    <>
      <PageHeader eyebrow={t("Billing")} title={t("Subscriptions")} description={t("Plans and renewals. Payments are recorded manually: open a brand and press Payment received.")} />
      <div className="cx-stats">
        <Stat index={0} tone="hero" icon={Coins} label={t("Monthly recurring revenue")} value={brands.data && plans.data ? mrr : undefined} format={(n) => money(n, locale)} />
        <Stat index={1} tone={soon.length ? "warn" : undefined} icon={CalendarPlus} label={t("Ending within 7 days")} value={brands.data ? soon.length : undefined} />
      </div>
      <div className="cx-grid-3" style={{ marginBottom: 16 }}>{(plans.data ?? []).map((p) => <div key={p.id} className="cx-plan cx-card"><strong>{p.name}</strong><b>{money(p.price_cents / 100, locale)}<span className="cx-muted cx-small"> / {t("month")}</span></b><ul><li>{t("{count} branches", { count: p.branch_limit })}</li><li>{t("{count} mirrors", { count: p.device_limit })}</li><li>{t("{count} AI try-ons / month", { count: p.monthly_tryons })}</li></ul><span className="cx-badge">{t("{count} brands", { count: (brands.data ?? []).filter((b) => b.planId === p.id).length })}</span></div>)}</div>
      <Card title={t("Renewals")} description={t("Sorted by end date")}>
        {!brands.data ? <Skeletons count={1} /> : (
          <div className="cx-table-wrap"><table className="cx-table"><thead><tr><th>{t("Brand")}</th><th>{t("Plan")}</th><th>{t("Paid until")}</th><th>{t("AI try-ons this month")}</th><th>{t("Status")}</th></tr></thead>
            <tbody>{[...brands.data].sort((a, b) => Date.parse(a.expiresAt ?? "") - Date.parse(b.expiresAt ?? "")).map((b) => <tr key={b.id}><td className="cx-strong">{b.name}</td><td>{b.planId ?? "—"}</td><td>{formatDate(b.expiresAt, locale, false)}</td><td>{b.used ?? 0}{b.extraCredits ? ` + ${b.extraCredits}` : ""}</td><td><Status value={b.expiresAt && Date.parse(b.expiresAt) < Date.now() ? "EXPIRED" : b.subscriptionStatus ?? "—"} /></td></tr>)}</tbody></table></div>
        )}
      </Card>
    </>
  )
}
