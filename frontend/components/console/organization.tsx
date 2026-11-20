"use client"

import { useState } from "react"
import { Copy, KeyRound, Pencil, Plus, Store, UserPlus, Users } from "lucide-react"
import { useText } from "@/components/marketing-language"
import { generatePassword, scoped, send, useApi, type Branch, type ConsoleUser, type Role } from "@/lib/console/api"
import { Empty, ErrorNote, Field, Modal, PageHeader, Skeletons, Status, useAction, useToast } from "./ui"

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
