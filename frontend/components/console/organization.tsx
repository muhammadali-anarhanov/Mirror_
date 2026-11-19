"use client"

import { useState } from "react"
import { Copy, KeyRound, MonitorSmartphone, Pencil, Plus, Store, UserPlus, Users } from "lucide-react"
import { useText } from "@/components/marketing-language"
import { formatDate, generatePassword, isOnline, scoped, send, useApi, type Branch, type ConsoleUser, type Device, type Me, type Role } from "@/lib/console/api"
import { Empty, ErrorNote, Field, Modal, PageHeader, Skeletons, Stat, Status, useAction, useLocale, useToast } from "./ui"

export function Branches({ tenantId }: { tenantId?: string }) {
  const t = useText()
  const branches = useApi<Branch[]>(scoped("/branches", tenantId))
  const [editing, setEditing] = useState<Branch | "new" | null>(null)
  return (
    <>
      {!tenantId && <PageHeader eyebrow={t("Brand")} title={t("Branches")} description={t("Stores of your brand. Stock, staff and smart mirrors belong to a branch.")}><button type="button" className="cx-btn is-primary" onClick={() => setEditing("new")}><Plus aria-hidden="true" />{t("Add branch")}</button></PageHeader>}
      {tenantId && <div className="cx-toolbar"><button type="button" className="cx-btn is-sm" onClick={() => setEditing("new")}><Plus aria-hidden="true" />{t("Add branch")}</button></div>}
      <ErrorNote error={branches.error} />
      {!branches.data && !branches.error ? <Skeletons count={2} /> : !branches.data?.length ? (
        <div className="cx-card"><Empty icon={Store} title={t("No branches yet")} text={t("Add the first store to start receiving stock.")} /></div>
      ) : (
        <div className="cx-card cx-table-wrap"><table className="cx-table">
          <thead><tr><th>{t("Name")}</th><th>{t("Address")}</th><th>{t("Status")}</th><th className="is-num">{t("Actions")}</th></tr></thead>
          <tbody>{branches.data.map((b) => <tr key={b.id}><td className="cx-strong">{b.name}</td><td className="cx-muted">{b.address || "—"}</td><td><Status value={b.status} /></td><td><div className="cx-row-actions"><button type="button" className="cx-btn is-sm" onClick={() => setEditing(b)}><Pencil aria-hidden="true" />{t("Edit")}</button></div></td></tr>)}</tbody>
        </table></div>
      )}
      {editing && <BranchDialog branch={editing === "new" ? undefined : editing} tenantId={tenantId} onClose={() => setEditing(null)} onDone={() => { setEditing(null); void branches.mutate() }} />}
    </>
  )
}

function BranchDialog({ branch, tenantId, onClose, onDone }: { branch?: Branch; tenantId?: string; onClose: () => void; onDone: () => void }) {
  const t = useText()
  const [name, setName] = useState(branch?.name ?? "")
  const [address, setAddress] = useState(branch?.address ?? "")
  const [status, setStatus] = useState(branch?.status ?? "ACTIVE")
  const { busy, run } = useAction()
  const save = () => run(async () => {
    if (branch) await send(scoped(`/branches/${branch.id}`, tenantId), "PATCH", { name, address, status })
    else await send(scoped("/branches", tenantId), "POST", { name, address })
    onDone()
  }, branch ? "Saved" : "Branch added")
  return (
    <Modal title={branch ? t("Edit branch") : t("New branch")} onClose={onClose} footer={<><button type="button" className="cx-btn" onClick={onClose}>{t("Cancel")}</button><button type="button" className="cx-btn is-primary" disabled={busy || !name.trim()} onClick={save}>{t("Save")}</button></>}>
      <Field label={t("Name")}><input className="cx-input" value={name} onChange={(e) => setName(e.target.value)} autoFocus /></Field>
      <Field label={t("Address")}><input className="cx-input" value={address} onChange={(e) => setAddress(e.target.value)} /></Field>
      {branch && <Field label={t("Status")}><select className="cx-select" value={status} onChange={(e) => setStatus(e.target.value)}><option value="ACTIVE">{t("Active")}</option><option value="INACTIVE">{t("Inactive")}</option></select></Field>}
      {!branch && <p className="cx-muted cx-small">{t("The number of branches is limited by the subscription plan.")}</p>}
    </Modal>
  )
}

export function Devices({ me }: { me: Me }) {
  const t = useText()
  const locale = useLocale()
  const toast = useToast()
  const devices = useApi<Device[]>("/devices", { refreshInterval: 30000 })
  const branches = useApi<Branch[]>("/branches")
  const [adding, setAdding] = useState(false)
  const canAdd = me.role === "BRAND_ADMIN"
  const branchName = new Map((branches.data ?? []).map((b) => [b.id, b.name]))
  const online = (devices.data ?? []).filter(isOnline).length
  async function copyLink(d: Device) {
    const link = `${window.location.origin}/mirror?device=${d.id}`
    try { await navigator.clipboard.writeText(link); toast(t("Kiosk link copied")) } catch { window.prompt(t("Kiosk link"), link) }
  }
  return (
    <>
      <PageHeader eyebrow={t("Hardware")} title={t("Smart mirrors")} description={t("Open the kiosk link on the mirror's computer. It reports online every minute while the fitting room is open.")}>{canAdd && <button type="button" className="cx-btn is-primary" onClick={() => setAdding(true)}><Plus aria-hidden="true" />{t("Add mirror")}</button>}</PageHeader>
      <div className="cx-stats">
        <Stat index={0} tone="hero" icon={MonitorSmartphone} label={t("Mirrors online")} value={devices.data ? online : undefined} note={t("of {count} smart mirrors", { count: devices.data?.length ?? 0 })} />
      </div>
      <ErrorNote error={devices.error} />
      {!devices.data && !devices.error ? <Skeletons count={2} /> : !devices.data?.length ? (
        <div className="cx-card"><Empty icon={MonitorSmartphone} title={t("No smart mirrors yet")} text={t("Register a mirror, then open its kiosk link on the mirror screen.")} /></div>
      ) : (
        <div className="cx-card cx-table-wrap"><table className="cx-table">
          <thead><tr><th>{t("Name")}</th><th>{t("Branch")}</th><th>{t("Status")}</th><th>{t("Last seen")}</th><th className="is-num">{t("Actions")}</th></tr></thead>
          <tbody>{devices.data.map((d) => <tr key={d.id}>
            <td className="cx-strong">{isOnline(d) && <span className="cx-dot-live" style={{ marginInlineEnd: 8 }} />}{d.name}</td>
            <td>{branchName.get(d.branch_id) ?? "—"}</td><td><Status value={isOnline(d) ? "ONLINE" : "OFFLINE"} /></td>
            <td className="cx-small cx-muted">{formatDate(d.last_seen, locale)}</td>
            <td><div className="cx-row-actions"><button type="button" className="cx-btn is-sm" onClick={() => copyLink(d)}><Copy aria-hidden="true" />{t("Copy kiosk link")}</button><a className="cx-btn is-sm is-primary" href={`/mirror?device=${d.id}`} target="_blank" rel="noreferrer">{t("Open")}</a></div></td>
          </tr>)}</tbody>
        </table></div>
      )}
      {adding && <DeviceDialog branches={branches.data ?? []} onClose={() => setAdding(false)} onDone={() => { setAdding(false); void devices.mutate() }} />}
    </>
  )
}

function DeviceDialog({ branches, onClose, onDone }: { branches: Branch[]; onClose: () => void; onDone: () => void }) {
  const t = useText()
  const [name, setName] = useState("")
  const [branchId, setBranchId] = useState(branches[0]?.id ?? "")
  const [layout, setLayout] = useState("landscape")
  const { busy, run } = useAction()
  return (
    <Modal title={t("Add mirror")} onClose={onClose} footer={<><button type="button" className="cx-btn" onClick={onClose}>{t("Cancel")}</button><button type="button" className="cx-btn is-primary" disabled={busy || !name.trim() || !branchId} onClick={() => run(async () => { await send("/devices", "POST", { name, branchId, configuration: { layout } }); onDone() }, "Mirror added")}>{t("Save")}</button></>}>
      {!branches.length && <p className="cx-error">{t("Create a branch first.")}</p>}
      <Field label={t("Name")}><input className="cx-input" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("For example: Entrance mirror")} autoFocus /></Field>
      <Field label={t("Branch")}><select className="cx-select" value={branchId} onChange={(e) => setBranchId(e.target.value)}>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
      <Field label={t("Screen")}><select className="cx-select" value={layout} onChange={(e) => setLayout(e.target.value)}><option value="landscape">{t("Landscape")}</option><option value="portrait">{t("Portrait")}</option></select></Field>
      <p className="cx-muted cx-small">{t("The number of mirrors is limited by the subscription plan.")}</p>
    </Modal>
  )
}

const roleName: Record<Role, string> = { SUPER_ADMIN: "Super admin", BRAND_ADMIN: "Brand admin", STORE_ADMIN: "Store admin", STAFF: "Staff" }

export function Staff({ tenantId }: { tenantId?: string }) {
  const t = useText()
  const users = useApi<ConsoleUser[]>(scoped("/users", tenantId))
  const branches = useApi<Branch[]>(scoped("/branches", tenantId))
  const [adding, setAdding] = useState(false)
  const [reset, setReset] = useState<ConsoleUser | null>(null)
  const { busy, run } = useAction()
  const branchName = new Map((branches.data ?? []).map((b) => [b.id, b.name]))
  const toggle = (u: ConsoleUser) => run(async () => { await send(scoped(`/users/${u.id}`, tenantId), "PATCH", { status: u.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE" }); await users.mutate() }, u.status === "ACTIVE" ? "Access suspended" : "Access restored")
  return (
    <>
      {!tenantId && <PageHeader eyebrow={t("Team")} title={t("Staff")} description={t("Accounts for store admins, cashiers and the smart mirror kiosk.")}><button type="button" className="cx-btn is-primary" onClick={() => setAdding(true)}><UserPlus aria-hidden="true" />{t("Add account")}</button></PageHeader>}
      {tenantId && <div className="cx-toolbar"><button type="button" className="cx-btn is-sm" onClick={() => setAdding(true)}><UserPlus aria-hidden="true" />{t("Add account")}</button></div>}
      <ErrorNote error={users.error} />
      {!users.data && !users.error ? <Skeletons count={2} /> : !users.data?.length ? (
        <div className="cx-card"><Empty icon={Users} title={t("No accounts yet")} /></div>
      ) : (
        <div className="cx-card cx-table-wrap"><table className="cx-table">
          <thead><tr><th>{t("Email")}</th><th>{t("Role")}</th><th>{t("Branch")}</th><th>{t("Status")}</th><th className="is-num">{t("Actions")}</th></tr></thead>
          <tbody>{users.data.map((u) => <tr key={u.id}>
            <td className="cx-strong">{u.email}</td><td>{t(roleName[u.role])}</td><td>{u.branchId ? branchName.get(u.branchId) ?? "—" : t("Whole brand")}</td><td><Status value={u.status} /></td>
            <td><div className="cx-row-actions">
              <button type="button" className="cx-btn is-sm" onClick={() => setReset(u)}><KeyRound aria-hidden="true" />{t("New password")}</button>
              <button type="button" className={`cx-btn is-sm${u.status === "ACTIVE" ? " is-danger" : ""}`} disabled={busy} onClick={() => toggle(u)}>{u.status === "ACTIVE" ? t("Suspend") : t("Activate")}</button>
            </div></td>
          </tr>)}</tbody>
        </table></div>
      )}
      {adding && <UserDialog tenantId={tenantId} branches={branches.data ?? []} onClose={() => setAdding(false)} onDone={() => void users.mutate()} />}
      {reset && <PasswordDialog user={reset} tenantId={tenantId} onClose={() => setReset(null)} />}
    </>
  )
}

export function UserDialog({ tenantId, branches, onClose, onDone, presetEmail, presetRole }: { tenantId?: string; branches: Branch[]; onClose: () => void; onDone: () => void; presetEmail?: string; presetRole?: Role }) {
  const t = useText()
  const [email, setEmail] = useState(presetEmail ?? "")
  const [role, setRole] = useState<Role>(presetRole ?? "STAFF")
  const [branchId, setBranchId] = useState(branches[0]?.id ?? "")
  const [password, setPassword] = useState(generatePassword)
  const [created, setCreated] = useState(false)
  const { busy, run } = useAction()
  const needsBranch = role !== "BRAND_ADMIN"
  const save = () => run(async () => { await send(scoped("/users", tenantId), "POST", { email, password, role, branchId: needsBranch ? branchId : "" }); setCreated(true); onDone() }, "Account created")
  if (created) return (
    <Modal title={t("Account created")} onClose={onClose} footer={<button type="button" className="cx-btn is-primary" onClick={onClose}>{t("Done")}</button>}>
      <p>{t("Give these sign-in details to the person. The password is shown only once.")}</p>
      <dl className="cx-kv"><dt>{t("Email")}</dt><dd className="cx-strong">{email}</dd></dl>
      <SecretBox value={password} />
    </Modal>
  )
  return (
    <Modal title={t("Add account")} onClose={onClose} footer={<><button type="button" className="cx-btn" onClick={onClose}>{t("Cancel")}</button><button type="button" className="cx-btn is-primary" disabled={busy || !email.includes("@") || password.length < 12 || (needsBranch && !branchId)} onClick={save}>{t("Create")}</button></>}>
      <Field label={t("Email")}><input className="cx-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus /></Field>
      <Field label={t("Role")}><select className="cx-select" value={role} onChange={(e) => setRole(e.target.value as Role)}>
        <option value="STAFF">{t("Staff")} — {t("cashier or kiosk")}</option><option value="STORE_ADMIN">{t("Store admin")} — {t("one branch")}</option><option value="BRAND_ADMIN">{t("Brand admin")} — {t("whole brand")}</option>
      </select></Field>
      {needsBranch && <Field label={t("Branch")}><select className="cx-select" value={branchId} onChange={(e) => setBranchId(e.target.value)}>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>}
      {needsBranch && !branches.length && <p className="cx-error">{t("Create a branch first.")}</p>}
      <Field label={t("Password")} hint={t("At least 12 characters")}><div className="cx-input-row"><input className="cx-input cx-mono" value={password} onChange={(e) => setPassword(e.target.value)} /><button type="button" className="cx-btn" onClick={() => setPassword(generatePassword())}>{t("Generate")}</button></div></Field>
    </Modal>
  )
}

export function SecretBox({ value }: { value: string }) {
  const t = useText()
  const toast = useToast()
  return <div className="cx-secret"><span>{value}</span><button type="button" className="cx-btn is-sm" onClick={() => navigator.clipboard.writeText(value).then(() => toast(t("Copied")), () => {})}><Copy aria-hidden="true" />{t("Copy")}</button></div>
}

function PasswordDialog({ user, tenantId, onClose }: { user: ConsoleUser; tenantId?: string; onClose: () => void }) {
  const t = useText()
  const [password, setPassword] = useState(generatePassword)
  const [done, setDone] = useState(false)
  const { busy, run } = useAction()
  return (
    <Modal title={t("New password")} onClose={onClose} footer={done ? <button type="button" className="cx-btn is-primary" onClick={onClose}>{t("Done")}</button> : <><button type="button" className="cx-btn" onClick={onClose}>{t("Cancel")}</button><button type="button" className="cx-btn is-primary" disabled={busy || password.length < 12} onClick={() => run(async () => { await send(scoped(`/users/${user.id}/password`, tenantId), "POST", { password }); setDone(true) }, "Password changed")}>{t("Set password")}</button></>}>
      <p>{user.email}</p>
      {done ? <><p className="cx-muted">{t("The person is signed out everywhere and signs in with this password.")}</p><SecretBox value={password} /></> : (
        <Field label={t("Password")} hint={t("At least 12 characters")}><div className="cx-input-row"><input className="cx-input cx-mono" value={password} onChange={(e) => setPassword(e.target.value)} /><button type="button" className="cx-btn" onClick={() => setPassword(generatePassword())}>{t("Generate")}</button></div></Field>
      )}
    </Modal>
  )
}
