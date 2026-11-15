"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { apiFetch } from "@/lib/api"
import {
  Activity, Bell, Boxes, Building2, ChevronDown, ClipboardList, CreditCard,
  FileClock, LayoutDashboard, LifeBuoy, Menu, MonitorSmartphone, Package,
  Search, Settings, Shield, Store, Truck, Users, WalletCards, X,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { AdminContent } from "@/components/admin/admin-content"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ADMIN_SECTION_DEFINITIONS } from "@/lib/admin/admin-catalog"
import { ADMIN_LOCALES, localeDirection, translate, type AdminLocale } from "@/lib/admin/i18n"

export type ConsoleKind = "super-admin" | "admin" | "brand" | "staff"
type RolePreview = "BRAND_ADMIN" | "STORE_ADMIN" | "STAFF" | "ANALYST_MANAGER" | "CUSTOM_ROLE"
type NavigationGroup = "Daily operations" | "Catalog & mirrors" | "Management"
type NavigationItem = { key: string; label: string; icon: LucideIcon; group: NavigationGroup }

const superNavigation: NavigationItem[] = [
  { key: "dashboard", label: "Overview", icon: LayoutDashboard, group: "Daily operations" },
  { key: "applications", label: "Applications", icon: ClipboardList, group: "Daily operations" },
  { key: "notifications", label: "Notifications", icon: Bell, group: "Daily operations" },
  { key: "brands", label: "Brands", icon: Building2, group: "Catalog & mirrors" },
  { key: "branches", label: "Branches", icon: Store, group: "Catalog & mirrors" },
  { key: "campaigns", label: "Campaigns", icon: Activity, group: "Catalog & mirrors" },
  { key: "subscriptions", label: "Subscriptions", icon: WalletCards, group: "Management" },
  { key: "audit-logs", label: "Audit logs", icon: FileClock, group: "Management" },
  { key: "settings", label: "Platform settings", icon: Settings, group: "Management" },
]

const brandNavigation: NavigationItem[] = [
  { key: "dashboard", label: "Overview", icon: LayoutDashboard, group: "Daily operations" },
  { key: "stock-receiving", label: "Stock receiving", icon: Package, group: "Daily operations" },
  { key: "inventory", label: "Inventory", icon: Boxes, group: "Daily operations" },
  { key: "transfers", label: "Stock transfers", icon: Truck, group: "Daily operations" },
  { key: "products", label: "Products", icon: Package, group: "Catalog & mirrors" },
  { key: "branches", label: "Branches", icon: Store, group: "Catalog & mirrors" },
  { key: "devices", label: "Smart mirrors", icon: MonitorSmartphone, group: "Catalog & mirrors" },
  { key: "staff", label: "Staff & roles", icon: Users, group: "Management" },
  { key: "analytics", label: "Analytics", icon: Activity, group: "Management" },
  { key: "subscription", label: "Subscription", icon: CreditCard, group: "Management" },
  { key: "notifications", label: "Notifications", icon: Bell, group: "Management" },
  { key: "integrations", label: "Integrations", icon: Boxes, group: "Management" },
  { key: "settings", label: "Settings", icon: Settings, group: "Management" },
]

const staffNavigation: NavigationItem[] = [
  { key: "dashboard", label: "Overview", icon: LayoutDashboard, group: "Daily operations" },
  { key: "stock-receiving", label: "Stock receiving", icon: Package, group: "Daily operations" },
  { key: "products", label: "Catalog", icon: Package, group: "Catalog & mirrors" },
  { key: "inventory", label: "Inventory", icon: Boxes, group: "Catalog & mirrors" },
  { key: "devices", label: "Smart mirrors", icon: MonitorSmartphone, group: "Catalog & mirrors" },
  { key: "analytics", label: "Try-on activity", icon: Activity, group: "Management" },
]

const roleNavigation: Record<RolePreview, string[]> = {
  BRAND_ADMIN: brandNavigation.map((item) => item.key),
  STORE_ADMIN: ["dashboard", "products", "stock-receiving", "inventory", "transfers", "devices", "staff", "analytics", "notifications"],
  STAFF: ["dashboard", "products", "stock-receiving", "inventory", "devices"],
  ANALYST_MANAGER: ["dashboard", "analytics"],
  CUSTOM_ROLE: ["dashboard", "inventory", "analytics", "notifications"],
}

function isBrand(kind: ConsoleKind) {
  return kind === "brand" || kind === "admin"
}

function basePathFor(kind: ConsoleKind) {
  return kind === "super-admin" ? "/super-admin" : kind === "staff" ? "/staff" : "/brand"
}

function translationKey(section: string) {
  if (section === "stock-receiving") return "receiving"
  if (section === "audit-logs") return "auditLogs"
  if (section === "store-settings") return "settings"
  return section
}

function roleName(role: RolePreview) {
  return ({ BRAND_ADMIN: "Brand Admin", STORE_ADMIN: "Store Admin", STAFF: "Staff", ANALYST_MANAGER: "Analyst / Manager", CUSTOM_ROLE: "Custom Role" })[role]
}

export function AdminConsole({ kind, section }: { kind: ConsoleKind; section: string }) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [period, setPeriod] = useState("30d")
  const [language, setLanguage] = useState<AdminLocale>("en")
  const [rolePreview] = useState<RolePreview>("BRAND_ADMIN")
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const basePath = basePathFor(kind)
  const isBrandConsole = isBrand(kind)
  const allNavigation = kind === "super-admin" ? superNavigation : kind === "staff" ? staffNavigation : brandNavigation
  const navigation = isBrandConsole ? allNavigation.filter((item) => roleNavigation[rolePreview].includes(item.key)) : allNavigation
  const effectiveSection = isBrandConsole && !roleNavigation[rolePreview].includes(section) ? "dashboard" : section
  const activeItem = navigation.find((item) => item.key === effectiveSection) ?? navigation[0]
  const displaySection = effectiveSection === "branches" && isBrandConsole ? "branches" : effectiveSection
  const titleKey = `title.${translationKey(displaySection)}`
  const translatedTitle = translate(language, titleKey)
  const title = translatedTitle === titleKey ? ADMIN_SECTION_DEFINITIONS[effectiveSection]?.title ?? activeItem.label : translatedTitle
  const roleLabel = kind === "super-admin" ? "SUPER ADMIN" : kind === "staff" ? "STAFF" : roleName(rolePreview).toUpperCase()
  const scopeLabel = kind === "super-admin" ? "Platform workspace" : kind === "staff" || rolePreview === "STAFF" ? "Assigned branch · Le Marais" : rolePreview === "STORE_ADMIN" ? "Le Marais · Branch" : rolePreview === "ANALYST_MANAGER" ? "Maison Lune · Analytics" : "Maison Lune · Brand"
  const localeQuery = `?lang=${language}`
  const isRTL = localeDirection(language) === "rtl"

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const savedLanguage = params.get("lang")
    if (savedLanguage && ADMIN_LOCALES.some((locale) => locale.value === savedLanguage)) setLanguage(savedLanguage as AdminLocale)
  }, [])

  useEffect(() => {
    const mobileViewport = window.matchMedia("(max-width: 800px)")
    const updateMobileViewport = () => setIsMobile(mobileViewport.matches)
    updateMobileViewport()
    mobileViewport.addEventListener("change", updateMobileViewport)
    return () => mobileViewport.removeEventListener("change", updateMobileViewport)
  }, [])

  useEffect(() => {
    function focusSearch(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener("keydown", focusSearch)
    return () => window.removeEventListener("keydown", focusSearch)
  }, [])

  function navigateTo(path: string) {
    router.push(`${path}${localeQuery}`)
  }

  return (
    <div className="mirror-admin" data-console-kind={kind} lang={language} dir={isRTL ? "rtl" : "ltr"}>
      {mobileNavOpen && <button type="button" className="mirror-admin-mobile-scrim" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}
      <aside id="mirror-admin-sidebar" className={`mirror-admin-sidebar${mobileNavOpen ? " is-open" : ""}`} aria-label="Administration navigation" aria-hidden={isMobile && !mobileNavOpen} inert={isMobile && !mobileNavOpen}>
        <div className="mirror-admin-brand-row">
          <Link href={`/mirror`} className="mirror-admin-brand" aria-label="MIRROR fitting room home">
            <span className="mirror-admin-brand-mark" aria-hidden="true"><span /></span>
            <span className="mirror-admin-brand-word">MIRROR<span> / {kind === "super-admin" ? "PLATFORM" : "ADMIN"}</span></span>
          </Link>
          <Button className="mirror-admin-mobile-close" variant="ghost" size="icon" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)}><X aria-hidden="true" /></Button>
        </div>
        <div className="mirror-admin-workspace-label">
          <span className="mirror-admin-workspace-icon"><Shield aria-hidden="true" /></span>
          <span><strong>{kind === "super-admin" ? "MIRROR Platform" : "Maison Lune"}</strong><small>{scopeLabel}</small></span>
          <ChevronDown aria-hidden="true" />
        </div>
        <nav className="mirror-admin-nav" aria-label="Workspace sections">
          {(["Daily operations", "Catalog & mirrors", "Management"] as NavigationGroup[]).map((group) => {
            const groupItems = navigation.filter((item) => item.group === group)
            if (!groupItems.length) return null
            return (
              <div className="mirror-admin-nav-group" key={group}>
                <span className="mirror-admin-nav-caption">{group}</span>
                {groupItems.map((item) => {
                  const Icon = item.icon
                  const itemLabel = translate(language, `nav.${translationKey(item.key)}`) || item.label
                  return (
                    <Link key={item.key} href={`${basePath}/${item.key}${localeQuery}`} title={`Open ${item.label}`} aria-current={effectiveSection === item.key ? "page" : undefined} onClick={() => setMobileNavOpen(false)} className={`mirror-admin-nav-link${effectiveSection === item.key ? " is-active" : ""}`}>
                      <Icon aria-hidden="true" />
                      <span>{itemLabel}</span>
                      {item.key === "applications" && kind === "super-admin" && <span className="mirror-admin-nav-badge">8</span>}
                      {item.key === "inventory" && isBrandConsole && <span className="mirror-admin-nav-badge">12</span>}
                    </Link>
                  )
                })}
              </div>
            )
          })}
        </nav>
        <div className="mirror-admin-sidebar-bottom">
          <div className="mirror-admin-help-card"><span className="mirror-admin-help-icon"><LifeBuoy aria-hidden="true" /></span><div><strong>Need a hand?</strong><span>Preview support center</span></div></div>
          <div className="mirror-admin-user-card">
            <Avatar className="mirror-admin-avatar"><AvatarFallback>{kind === "super-admin" ? "MA" : kind === "staff" ? "LD" : rolePreview === "STORE_ADMIN" ? "SM" : "AL"}</AvatarFallback></Avatar>
            <span className="mirror-admin-user-copy"><strong>{kind === "super-admin" ? "M. Anarhanov" : kind === "staff" ? "Lea Dubois" : rolePreview === "STORE_ADMIN" ? "Sofia Martin" : "Amira Laurent"}</strong><small>{roleLabel}</small></span>
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Open profile menu" />}><ChevronDown aria-hidden="true" /></DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="mirror-admin-profile-menu">
                <DropdownMenuGroup><DropdownMenuLabel>{kind === "super-admin" ? "M. Anarhanov" : kind === "staff" ? "Lea Dubois" : "Amira Laurent"}</DropdownMenuLabel><DropdownMenuLabel className="mirror-admin-profile-email">{kind === "super-admin" ? "platform@mirror.example" : "amira@maisonlune.example"}</DropdownMenuLabel></DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigateTo("/reset-password")}>Change password</DropdownMenuItem>
                {kind !== "staff" && <DropdownMenuItem onClick={() => navigateTo(`${basePath}/settings`)}>Account settings</DropdownMenuItem>}
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={async () => { await apiFetch("/auth/logout", { method: "POST" }); navigateTo("/login") }}>Sign out / exit preview</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>

      <div className="mirror-admin-main">
        <header className="mirror-admin-topbar">
          <div className="mirror-admin-topbar-left">
            <Button className="mirror-admin-mobile-menu" variant="ghost" size="icon" aria-label="Open navigation" aria-expanded={mobileNavOpen} aria-controls="mirror-admin-sidebar" onClick={() => setMobileNavOpen(true)}><Menu aria-hidden="true" /></Button>
            <div className="mirror-admin-breadcrumb"><span>{translate(language, "common.workspace")}</span><span aria-hidden="true">/</span><strong>{title}</strong></div>
          </div>
          <div className="mirror-admin-topbar-actions">
            <label className="mirror-admin-search"><Search aria-hidden="true" /><input ref={searchRef} aria-label={translate(language, "common.search")} placeholder={translate(language, "common.search")} value={query} onChange={(event) => setQuery(event.target.value)} /><kbd>⌘ K</kbd></label>
            <div className="mirror-admin-period-select"><Select value={period} onValueChange={(value) => setPeriod(value ?? "30d")}><SelectTrigger aria-label="Select date range"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="today">Today</SelectItem><SelectItem value="7d">7 days</SelectItem><SelectItem value="30d">30 days</SelectItem><SelectItem value="90d">90 days</SelectItem><SelectItem value="custom">Custom range</SelectItem></SelectGroup></SelectContent></Select></div>
            <Select value={language} onValueChange={(value) => { if (!value) return; const nextLocale = value as AdminLocale; setLanguage(nextLocale); router.replace(`${basePath}/${effectiveSection}?lang=${nextLocale}`) }}><SelectTrigger className="mirror-admin-language" aria-label="Choose language"><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{ADMIN_LOCALES.map((locale) => <SelectItem key={locale.value} value={locale.value}>{locale.value.toUpperCase()}</SelectItem>)}</SelectGroup></SelectContent></Select>
            <DropdownMenu><DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="mirror-admin-notifications" aria-label="Notifications" />}><Bell aria-hidden="true" /><span className="mirror-admin-notification-dot" /></DropdownMenuTrigger><DropdownMenuContent align="end" className="mirror-admin-notification-menu"><DropdownMenuLabel>Notifications</DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuItem onClick={() => navigateTo(`${basePath}/notifications`)}>12 variants are below the low-stock threshold</DropdownMenuItem><DropdownMenuItem onClick={() => navigateTo(kind === "super-admin" ? "/super-admin/applications" : `${basePath}/devices`)}>A smart mirror needs attention</DropdownMenuItem><DropdownMenuItem onClick={() => navigateTo(`${basePath}/notifications`)}>View all notifications</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
          </div>
        </header>

        <main className="mirror-admin-content">
          <div className="mirror-admin-demo-banner" role="status"><span className="mirror-admin-demo-pulse" aria-hidden="true" /><strong>{translate(language, "common.demo")}</strong><span>Sample data only. Most admin modules remain previews. Live catalog, when enabled, saves through the Go API.</span>{isBrandConsole && <Badge variant="outline" className="mirror-admin-role-badge">{roleLabel}</Badge>}</div>
          {isBrandConsole && rolePreview === "STORE_ADMIN" && <p className="mirror-admin-scope-note">Store scope preview: Le Marais. This is a visual role simulation, not an authenticated session.</p>}
          {(isBrandConsole && (rolePreview === "ANALYST_MANAGER" || rolePreview === "CUSTOM_ROLE")) && <p className="mirror-admin-scope-note">Module visibility is illustrative and must be enforced by a backend before production use.</p>}
          <AdminContent kind={kind} section={effectiveSection} searchTerm={query} period={period} rolePreview={rolePreview} localeQuery={localeQuery} />
          <footer className="mirror-admin-footer"><span>© 2026 MIRROR Platform</span><span>Frontend prototype · data resets on refresh</span></footer>
        </main>
      </div>
    </div>
  )
}
