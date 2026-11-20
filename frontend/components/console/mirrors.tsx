"use client"

import { useState } from "react"
import { AlertTriangle, Coins, ExternalLink, KeyRound, MonitorSmartphone, Pencil, Plus, ShoppingBag, Sparkles, Users } from "lucide-react"
import { useText } from "@/components/marketing-language"
import {
  generatePassword, isLow, mirrorOnline, money, scoped, send, useApi,
  type Branch, type Me, type MirrorPage, type Package,
} from "@/lib/console/api"
import { SecretBox } from "./organization"
import { Empty, ErrorNote, Field, Modal, PageHeader, Segment, Skeletons, Stat, Status, useAction, useLocale } from "./ui"

/** Mirror pages: each smart mirror with its kiosk sign-in, try-on limit and sales. */
export function MirrorPages({ me, tenantId }: { me: Me; tenantId?: string }) {
  const t = useText()
  const locale = useLocale()
  const [days, setDays] = useState(30)
  const pages = useApi<MirrorPage[]>(scoped(`/mirror-pages?days=${days}`, tenantId), { refreshInterval: 30000 })
  const [creating, setCreating] = useState(false)
  const [buying, setBuying] = useState<MirrorPage | null>(null)
  const [renaming, setRenaming] = useState<MirrorPage | null>(null)
  const [password, setPassword] = useState<MirrorPage | null>(null)
  const canManage = me.role === "BRAND_ADMIN" || me.role === "SUPER_ADMIN"
  const list = pages.data ?? []
  const sum = (key: keyof MirrorPage) => list.reduce((total, m) => total + Number(m[key] || 0), 0)
  const low = list.filter(isLow)

  return (
    <>
      {!tenantId && <PageHeader eyebrow={t("Smart mirrors")} title={t("Mirror pages")} description={t("Each mirror page has its own sign-in, AI try-on limit and statistics. Buy more try-ons when the limit runs low.")}>
        <Segment label={t("Period")} value={days} onChange={setDays} options={[7, 30, 90].map((d) => ({ value: d, label: t("{count} days", { count: d }) }))} />
        {canManage && <button type="button" className="cx-btn is-primary" onClick={() => setCreating(true)}><Plus aria-hidden="true" />{t("Create mirror page")}</button>}
      </PageHeader>}
      {tenantId && <div className="cx-toolbar"><button type="button" className="cx-btn is-sm" onClick={() => setCreating(true)}><Plus aria-hidden="true" />{t("Create mirror page")}</button></div>}
      <ErrorNote error={pages.error} />
      {!pages.data && !pages.error ? <Skeletons count={4} /> : <>
        {!tenantId && <div className="cx-stats">
          <Stat index={0} tone="hero" icon={Sparkles} label={t("AI try-ons today")} value={sum("today")} note={t("{count} in this period", { count: sum("fittings") })} />
          <Stat index={1} tone="good" icon={ShoppingBag} label={t("Bought after trying")} value={sum("sold")} note={money(sum("soldValue"), locale)} />
          <Stat index={2} tone={low.length ? "warn" : undefined} icon={Coins} label={t("Try-ons left")} value={sum("remaining")} note={low.length ? t("{count} mirrors running low", { count: low.length }) : t("of {count} bought", { count: sum("tryonLimit") })} />
          <Stat index={3} icon={MonitorSmartphone} label={t("Mirrors online")} value={list.filter(mirrorOnline).length} note={t("of {count} smart mirrors", { count: list.length })} />
        </div>}
        {!list.length ? <div className="cx-card"><Empty icon={MonitorSmartphone} title={t("No mirror pages yet")} text={t("Create a mirror page, then sign in on the mirror screen with its email and password.")} /></div> : (
          <div className="cx-mirrors">
            {list.map((m, i) => <MirrorCard key={m.id} m={m} index={i} canManage={canManage} onBuy={() => setBuying(m)} onRename={() => setRenaming(m)} onPassword={() => setPassword(m)} />)}
          </div>
        )}
      </>}
      {creating && <CreateMirror tenantId={tenantId} onClose={() => setCreating(false)} onDone={() => void pages.mutate()} />}
      {buying && <BuyLimit mirror={buying} tenantId={tenantId} platform={me.role === "SUPER_ADMIN"} onClose={() => setBuying(null)} onDone={() => void pages.mutate()} />}
      {renaming && <RenameMirror mirror={renaming} tenantId={tenantId} onClose={() => setRenaming(null)} onDone={() => { setRenaming(null); void pages.mutate() }} />}
      {password && <KioskPassword mirror={password} tenantId={tenantId} onClose={() => setPassword(null)} />}
    </>
  )
}

function MirrorCard({ m, index, canManage, onBuy, onRename, onPassword }: { m: MirrorPage; index: number; canManage: boolean; onBuy: () => void; onRename: () => void; onPassword: () => void }) {
  const t = useText()
  const locale = useLocale()
  const low = isLow(m)
  const share = m.tryonLimit ? Math.min(100, (m.remaining / m.tryonLimit) * 100) : 0
  const conversion = m.fittings ? Math.round((m.sold / m.fittings) * 100) : 0
  const daysLeft = m.avgDaily > 0 ? Math.floor(m.remaining / m.avgDaily) : null
  const max = Math.max(1, ...m.series.map((p) => p.fittings))
  return (
    <article className={`cx-mirror${low ? " is-low" : ""}`} style={{ animationDelay: `${index * 60}ms` }}>
      <header className="cx-mirror-head">
        <div>
          <strong>{mirrorOnline(m) && <span className="cx-dot-live" />} {m.name}</strong>
          <span className="cx-muted cx-small">{m.branch}{m.email ? ` · ${m.email}` : ""}</span>
        </div>
        <Status value={mirrorOnline(m) ? "ONLINE" : "OFFLINE"} />
      </header>
      <div className="cx-mirror-limit">
        <div className="cx-mirror-limit-top"><span>{t("Try-ons left")}</span><b>{new Intl.NumberFormat(locale).format(m.remaining)}<small> / {new Intl.NumberFormat(locale).format(m.tryonLimit)}</small></b></div>
        <div className="cx-progress"><i style={{ width: `${share}%`, background: low ? "linear-gradient(90deg,#d97706,#f59e0b)" : undefined }} /></div>
        <span className="cx-small cx-muted">
          {daysLeft !== null ? t("About {count} days left at the current pace", { count: daysLeft }) : t("No try-ons yet in this period")}
          {m.pending ? ` · ${t("{count} purchase awaiting payment", { count: m.pending })}` : ""}
        </span>
        {low && <p className="cx-mirror-warn"><AlertTriangle aria-hidden="true" />{m.tryonLimit === 0 ? t("No try-ons bought yet. AI fitting starts after the first package is paid.") : t("The limit is running low. Buy more try-ons so the mirror keeps working.")}</p>}
      </div>
      <dl className="cx-mirror-stats">
        <div><dt>{t("Today")}</dt><dd>{m.today}</dd></div>
        <div><dt>{t("Try-ons")}</dt><dd>{m.fittings}</dd></div>
        <div><dt>{t("Per day")}</dt><dd>{m.avgDaily}</dd></div>
        <div><dt>{t("Sent to cashier")}</dt><dd>{m.requests}</dd></div>
        <div><dt>{t("Bought")}</dt><dd>{m.sold}</dd></div>
        <div><dt>{t("Conversion")}</dt><dd>{conversion}%</dd></div>
      </dl>
      <div className="cx-mirror-bars" aria-label={t("AI try-ons per day")}>{m.series.map((p) => <i key={p.date} title={`${p.date}: ${p.fittings}`} style={{ height: `${(p.fittings / max) * 100}%` }} />)}</div>
      <div className="cx-mirror-foot">
        <span className="cx-small cx-muted">{t("Sold")}: <b className="cx-price">{money(m.soldValue, locale)}</b></span>
        <div className="cx-row-actions">
          {canManage && <button type="button" className={`cx-btn is-sm${low ? " is-primary" : ""}`} onClick={onBuy}><Coins aria-hidden="true" />{t("Buy try-ons")}</button>}
          <a className="cx-btn is-sm" href={`/mirror?device=${m.id}`} target="_blank" rel="noreferrer"><ExternalLink aria-hidden="true" />{t("Open")}</a>
          {canManage && m.userId && <button type="button" className="cx-btn is-sm is-icon" onClick={onPassword} aria-label={t("Kiosk password")} title={t("Kiosk password")}><KeyRound aria-hidden="true" /></button>}
          {canManage && <button type="button" className="cx-btn is-sm is-icon" onClick={onRename} aria-label={t("Rename")} title={t("Rename")}><Pencil aria-hidden="true" /></button>}
        </div>
      </div>
    </article>
  )
}

function PackagePicker({ value, onChange, allowNone }: { value: string; onChange: (id: string) => void; allowNone?: boolean }) {
  const t = useText()
  const locale = useLocale()
  const packages = useApi<Package[]>("/credit-packages")
  return (
    <div className="cx-packages" role="radiogroup" aria-label={t("Try-on package")}>
      {allowNone && <button type="button" role="radio" aria-checked={value === ""} className={`cx-package${value === "" ? " is-selected" : ""}`} onClick={() => onChange("")}><strong>{t("Later")}</strong><span className="cx-muted cx-small">{t("Buy a package later")}</span></button>}
      {(packages.data ?? []).map((p) => {
        const price = (p.price_cents ?? 0) / 100
        return (
          <button type="button" role="radio" aria-checked={value === p.id} key={p.id} className={`cx-package${value === p.id ? " is-selected" : ""}`} onClick={() => onChange(p.id)}>
            <strong>{t("{count} AI try-ons", { count: p.credits })}</strong>
            <b>{money(price, locale)}</b>
            <span className="cx-muted cx-small">{t("{price} per try-on", { price: money(price / p.credits, locale) })}</span>
          </button>
        )
      })}
    </div>
  )
}

function BuyLimit({ mirror, tenantId, platform, onClose, onDone }: { mirror: MirrorPage; tenantId?: string; platform: boolean; onClose: () => void; onDone: () => void }) {
  const t = useText()
  const [pkg, setPkg] = useState("extra-500")
  const [done, setDone] = useState(false)
  const { busy, run } = useAction()
  if (done) return (
    <Modal title={t("Purchase recorded")} onClose={onClose} footer={<button type="button" className="cx-btn is-primary" onClick={onClose}>{t("Done")}</button>}>
      <p>{platform ? t("The try-ons were added to the mirror.") : t("Your request was sent to the MIRROR team. The try-ons are added as soon as the payment is confirmed.")}</p>
    </Modal>
  )
  return (
    <Modal title={t("Buy try-ons for {name}", { name: mirror.name })} onClose={onClose} footer={<><button type="button" className="cx-btn" onClick={onClose}>{t("Cancel")}</button><button type="button" className="cx-btn is-primary" disabled={busy || !pkg} onClick={() => run(async () => { await send(scoped(`/mirror-pages/${mirror.id}/purchases`, tenantId), "POST", { packageId: pkg }); setDone(true); onDone() })}><Coins aria-hidden="true" />{t("Buy")}</button></>}>
      <p className="cx-note">{t("Now: {left} try-ons left of {total}.", { left: mirror.remaining, total: mirror.tryonLimit })}</p>
      <PackagePicker value={pkg} onChange={setPkg} />
    </Modal>
  )
}

function CreateMirror({ tenantId, onClose, onDone }: { tenantId?: string; onClose: () => void; onDone: () => void }) {
  const t = useText()
  const branches = useApi<Branch[]>(scoped("/branches", tenantId))
  const [name, setName] = useState("")
  const [branch, setBranch] = useState("")
  const [layout, setLayout] = useState("landscape")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState(generatePassword)
  const [pkg, setPkg] = useState("extra-100")
  const [created, setCreated] = useState(false)
  const { busy, run } = useAction()
  const branchId = branch || branches.data?.[0]?.id || ""
  const save = () => run(async () => { await send(scoped("/mirror-pages", tenantId), "POST", { name, branchId, layout, email, password, packageId: pkg }); setCreated(true); onDone() }, "Mirror page created")
  if (created) return (
    <Modal title={t("Mirror page created")} onClose={onClose} footer={<button type="button" className="cx-btn is-primary" onClick={onClose}>{t("Done")}</button>}>
      <p>{t("Open the sign-in page on the mirror screen and sign in with these details. The mirror then opens the fitting room. The password is also needed to exit.")}</p>
      <dl className="cx-kv"><dt>{t("Sign-in page")}</dt><dd>{typeof window !== "undefined" ? `${window.location.origin}/login` : "/login"}</dd><dt>{t("Email")}</dt><dd className="cx-strong">{email}</dd></dl>
      <SecretBox value={password} />
      {pkg && <p className="cx-muted cx-small">{t("The try-on package is active once its payment is confirmed.")}</p>}
    </Modal>
  )
  return (
    <Modal wide title={t("Create mirror page")} onClose={onClose} footer={<><button type="button" className="cx-btn" onClick={onClose}>{t("Cancel")}</button><button type="button" className="cx-btn is-primary" disabled={busy || !name.trim() || !branchId || !email.includes("@") || password.length < 8} onClick={save}><Plus aria-hidden="true" />{t("Create")}</button></>}>
      <div className="cx-grid-2">
        <Field label={t("Mirror name")}><input className="cx-input" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("For example: Entrance mirror")} autoFocus /></Field>
        <Field label={t("Branch")}><select className="cx-select" value={branchId} onChange={(e) => setBranch(e.target.value)}>{(branches.data ?? []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
      </div>
      {branches.data && !branches.data.length && <p className="cx-error">{t("Create a branch first.")}</p>}
      <Field label={t("Screen")}><Segment label={t("Screen")} value={layout} onChange={setLayout} options={[{ value: "landscape", label: t("Landscape") }, { value: "portrait", label: t("Portrait") }]} /></Field>
      <p className="cx-section-title">{t("Mirror sign-in")}</p>
      <div className="cx-grid-2">
        <Field label={t("Email")} hint={t("Used only to sign the mirror in")}><input className="cx-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="mirror@yourstore.com" /></Field>
        <Field label={t("Password")} hint={t("At least 8 characters. Also needed to exit the mirror")}><div className="cx-input-row"><input className="cx-input cx-mono" value={password} onChange={(e) => setPassword(e.target.value)} /><button type="button" className="cx-btn" onClick={() => setPassword(generatePassword())}>{t("Generate")}</button></div></Field>
      </div>
      <p className="cx-section-title">{t("First try-on package")}</p>
      <PackagePicker value={pkg} onChange={setPkg} allowNone />
    </Modal>
  )
}

function RenameMirror({ mirror, tenantId, onClose, onDone }: { mirror: MirrorPage; tenantId?: string; onClose: () => void; onDone: () => void }) {
  const t = useText()
  const [name, setName] = useState(mirror.name)
  const { busy, run } = useAction()
  return (
    <Modal title={t("Rename")} onClose={onClose} footer={<><button type="button" className="cx-btn" onClick={onClose}>{t("Cancel")}</button><button type="button" className="cx-btn is-primary" disabled={busy || !name.trim()} onClick={() => run(async () => { await send(scoped(`/mirror-pages/${mirror.id}`, tenantId), "PATCH", { name }); onDone() }, "Saved")}>{t("Save")}</button></>}>
      <Field label={t("Mirror name")}><input className="cx-input" value={name} onChange={(e) => setName(e.target.value)} autoFocus /></Field>
    </Modal>
  )
}

function KioskPassword({ mirror, tenantId, onClose }: { mirror: MirrorPage; tenantId?: string; onClose: () => void }) {
  const t = useText()
  const [password, setPassword] = useState(generatePassword)
  const [done, setDone] = useState(false)
  const { busy, run } = useAction()
  return (
    <Modal title={t("Kiosk password")} onClose={onClose} footer={done ? <button type="button" className="cx-btn is-primary" onClick={onClose}>{t("Done")}</button> : <><button type="button" className="cx-btn" onClick={onClose}>{t("Cancel")}</button><button type="button" className="cx-btn is-primary" disabled={busy || password.length < 8} onClick={() => run(async () => { await send(scoped(`/users/${mirror.userId}/password`, tenantId), "POST", { password }); setDone(true) }, "Password changed")}>{t("Set password")}</button></>}>
      <p>{mirror.name} · {mirror.email}</p>
      {done ? <><p className="cx-muted">{t("The mirror is signed out. Sign it in again with the new password.")}</p><SecretBox value={password} /></> : (
        <Field label={t("Password")} hint={t("At least 8 characters")}><div className="cx-input-row"><input className="cx-input cx-mono" value={password} onChange={(e) => setPassword(e.target.value)} /><button type="button" className="cx-btn" onClick={() => setPassword(generatePassword())}>{t("Generate")}</button></div></Field>
      )}
    </Modal>
  )
}

/** Compact table for the statistics page. */
export function MirrorSummary({ days }: { days: number }) {
  const t = useText()
  const locale = useLocale()
  const pages = useApi<MirrorPage[]>(`/mirror-pages?days=${days}`, { refreshInterval: 60000 })
  if (!pages.data?.length) return null
  return (
    <section className="cx-card" style={{ marginBottom: 16 }}>
      <div className="cx-card-head"><div><h2>{t("Mirror pages")}</h2><p>{t("Try-ons, buyers and remaining limit per mirror")}</p></div><a className="cx-btn is-sm" href="/brand/devices"><Users aria-hidden="true" />{t("Manage")}</a></div>
      <div className="cx-card-body cx-table-wrap">
        <table className="cx-table">
          <thead><tr><th>{t("Mirror")}</th><th className="is-num">{t("Today")}</th><th className="is-num">{t("Try-ons")}</th><th className="is-num">{t("Per day")}</th><th className="is-num">{t("Bought")}</th><th className="is-num">{t("Sold")}</th><th>{t("Try-ons left")}</th></tr></thead>
          <tbody>{pages.data.map((m) => (
            <tr key={m.id}>
              <td className="cx-strong">{mirrorOnline(m) && <span className="cx-dot-live" style={{ marginInlineEnd: 8 }} />}{m.name}<div className="cx-small cx-muted">{m.branch}</div></td>
              <td className="is-num">{m.today}</td><td className="is-num">{m.fittings}</td><td className="is-num">{m.avgDaily}</td><td className="is-num">{m.sold}</td>
              <td className="is-num">{money(m.soldValue, locale)}</td>
              <td><span className={`cx-badge${isLow(m) ? " is-warn" : " is-good"}`}>{m.remaining} / {m.tryonLimit}</span></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </section>
  )
}
