"use client"

import "@/app/console.css"
import { useEffect, useState, type ReactNode } from "react"
import Link from "next/link"
import {
  Activity, Bell, Boxes, Building2, ClipboardList, CreditCard, FileClock, LayoutDashboard, LogOut,
  Menu, MonitorSmartphone, Package, Receipt, Shield, Sparkles, Store, UserCog, Users,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { LanguageSelector, useText } from "@/components/marketing-language"
import { apiFetch } from "@/lib/api"
import { useApi, type Me, type Role, type PlatformStats } from "@/lib/console/api"
import { dashboardPathForRole } from "@/lib/admin/access"
import { SECTION_ALIASES as ALIASES, type ConsoleKind } from "@/lib/console/sections"
import { ToastProvider } from "./ui"
import { BrandOverview, PlatformOverview } from "./overview"
import { Products } from "./catalog"
import { Inventory, Orders } from "./operations"
import { Branches, Devices, Staff } from "./organization"
import { Applications, Brands, Subscriptions } from "./platform"
import { Account, AuditLogs, BrandSubscription, Notifications } from "./misc"

type NavItem = { key: string; label: string; icon: LucideIcon; group: string; roles?: Role[] }

const NAV: Record<ConsoleKind, NavItem[]> = {
  "super-admin": [
    { key: "dashboard", label: "Overview", icon: LayoutDashboard, group: "Platform" },
    { key: "applications", label: "Applications", icon: ClipboardList, group: "Platform" },
    { key: "brands", label: "Brands", icon: Building2, group: "Platform" },
    { key: "subscriptions", label: "Subscriptions", icon: CreditCard, group: "Platform" },
    { key: "audit-logs", label: "Audit logs", icon: FileClock, group: "Control" },
    { key: "account", label: "Account", icon: UserCog, group: "Control" },
  ],
  brand: [
    { key: "dashboard", label: "Overview", icon: LayoutDashboard, group: "Daily work" },
    { key: "products", label: "Products", icon: Package, group: "Daily work" },
    { key: "inventory", label: "Inventory", icon: Boxes, group: "Daily work" },
    { key: "orders", label: "Orders", icon: Receipt, group: "Daily work" },
    { key: "branches", label: "Branches", icon: Store, group: "Brand" },
    { key: "devices", label: "Smart mirrors", icon: MonitorSmartphone, group: "Brand" },
    { key: "staff", label: "Staff", icon: Users, group: "Brand" },
    { key: "subscription", label: "Subscription", icon: CreditCard, group: "Brand" },
    { key: "notifications", label: "Notifications", icon: Bell, group: "Control" },
    { key: "audit-logs", label: "Audit logs", icon: FileClock, group: "Control" },
    { key: "account", label: "Account", icon: UserCog, group: "Control" },
  ],
  staff: [
    { key: "dashboard", label: "Overview", icon: LayoutDashboard, group: "Store" },
    { key: "products", label: "Products", icon: Package, group: "Store" },
    { key: "inventory", label: "Inventory", icon: Boxes, group: "Store" },
    { key: "orders", label: "Orders", icon: Receipt, group: "Store" },
    { key: "devices", label: "Smart mirrors", icon: MonitorSmartphone, group: "Store" },
    { key: "notifications", label: "Notifications", icon: Bell, group: "Store" },
    { key: "account", label: "Account", icon: UserCog, group: "Store" },
  ],
}

const ROLES: Record<ConsoleKind, Role[]> = { "super-admin": ["SUPER_ADMIN"], brand: ["BRAND_ADMIN"], staff: ["STORE_ADMIN", "STAFF"] }

const roleLabel: Record<Role, string> = { SUPER_ADMIN: "Super admin", BRAND_ADMIN: "Brand admin", STORE_ADMIN: "Store admin", STAFF: "Staff" }

export function ConsoleApp({ kind, section }: { kind: ConsoleKind; section: string }) {
  const t = useText()
  const me = useApi<{ user: Me }>("/auth/me", { shouldRetryOnError: false })
  const user = me.data?.user
  const unauthorized = (me.error as { status?: number } | undefined)?.status === 401

  useEffect(() => {
    if (unauthorized) window.location.assign(`/login?next=${encodeURIComponent(window.location.pathname)}`)
    else if (user && !ROLES[kind].includes(user.role)) window.location.assign(dashboardPathForRole(user.role))
  }, [unauthorized, user, kind])

  if (me.error && !unauthorized) {
    return <div className="cx-gate"><div className="cx-error" role="alert" style={{ maxWidth: 420 }}>{t("The MIRROR server is not reachable. Check your connection and reload.")}</div></div>
  }
  if (!user || !ROLES[kind].includes(user.role)) return <div className="cx-gate" aria-busy="true"><span className="cx-spinner" /></div>
  return <ToastProvider><Console kind={kind} section={ALIASES[section] ?? section} me={user} /></ToastProvider>
}

function Console({ kind, section, me }: { kind: ConsoleKind; section: string; me: Me }) {
  const t = useText()
  const [open, setOpen] = useState(false)
  const base = `/${kind}`
  const items = NAV[kind]
  const active = items.find((item) => item.key === section) ?? items[0]
  const stats = useApi<PlatformStats>(kind === "super-admin" ? "/platform/stats?days=30" : null)
  const groups = [...new Set(items.map((item) => item.group))]

  async function signOut() {
    await apiFetch("/auth/logout", { method: "POST" }).catch(() => null)
    window.location.assign("/login")
  }

  let page: ReactNode
  switch (active.key) {
    case "dashboard": page = kind === "super-admin" ? <PlatformOverview /> : <BrandOverview me={me} />; break
    case "applications": page = <Applications />; break
    case "brands": page = <Brands />; break
    case "subscriptions": page = <Subscriptions />; break
    case "products": page = <Products me={me} />; break
    case "inventory": page = <Inventory me={me} />; break
    case "orders": page = <Orders me={me} />; break
    case "branches": page = <Branches />; break
    case "devices": page = <Devices me={me} />; break
    case "staff": page = <Staff />; break
    case "subscription": page = <BrandSubscription />; break
    case "notifications": page = <Notifications />; break
    case "audit-logs": page = <AuditLogs platform={kind === "super-admin"} />; break
    default: page = <Account me={me} onSignOut={signOut} />
  }

  return (
    <div className="cx">
      {open && <button type="button" className="cx-scrim" aria-label={t("Close navigation")} onClick={() => setOpen(false)} />}
      <aside className={`cx-side${open ? " is-open" : ""}`} aria-label={t("Administration navigation")}>
        <Link href={`${base}/dashboard`} className="cx-logo"><span className="cx-logo-mark"><Sparkles aria-hidden="true" /></span><span>MIRROR<small>{kind === "super-admin" ? t("PLATFORM") : t("ADMIN")}</small></span></Link>
        <div className="cx-scope"><span className="cx-scope-icon"><Shield aria-hidden="true" /></span><span><strong>{t(roleLabel[me.role])}</strong><small>{kind === "super-admin" ? t("All brands") : kind === "brand" ? t("Whole brand") : t("Assigned branch")}</small></span></div>
        <nav className="cx-nav" aria-label={t("Workspace sections")}>
          {groups.map((group) => (
            <div key={group} className="cx-nav">
              <span className="cx-nav-caption">{t(group)}</span>
              {items.filter((item) => item.group === group).map((item) => {
                const Icon = item.icon
                const count = item.key === "applications" ? stats.data?.newApplications : undefined
                return (
                  <Link key={item.key} href={`${base}/${item.key}`} aria-current={item.key === active.key ? "page" : undefined} onClick={() => setOpen(false)}>
                    <Icon aria-hidden="true" /><span>{t(item.label)}</span>{count ? <span className="cx-nav-count">{count}</span> : null}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>
        <div className="cx-side-foot">
          {kind !== "super-admin" && <a className="cx-mirror-link" href="/mirror"><MonitorSmartphone aria-hidden="true" /><span>{t("Open smart mirror")}<small>{t("Customer fitting room")}</small></span></a>}
          <div className="cx-user">
            <span className="cx-avatar" aria-hidden="true">{me.email.slice(0, 2)}</span>
            <span className="cx-user-copy"><strong>{me.email}</strong><small>{t(roleLabel[me.role]).toUpperCase()}</small></span>
            <button type="button" className="cx-btn is-ghost is-sm is-icon" onClick={signOut} aria-label={t("Sign out")} title={t("Sign out")}><LogOut aria-hidden="true" /></button>
          </div>
        </div>
      </aside>
      <div className="cx-main">
        <header className="cx-top">
          <button type="button" className="cx-btn is-ghost is-icon cx-menu-btn" onClick={() => setOpen(true)} aria-label={t("Open navigation")}><Menu aria-hidden="true" /></button>
          <div className="cx-crumb"><span>MIRROR</span><span aria-hidden="true">/</span><strong>{t(active.label)}</strong></div>
          <div className="cx-top-actions">
            <span className="cx-badge is-good"><Activity aria-hidden="true" style={{ display: "none" }} />{t("Live data")}</span>
            <LanguageSelector className="cx-lang" />
          </div>
        </header>
        <main className="cx-content" key={active.key}>{page}</main>
      </div>
    </div>
  )
}
