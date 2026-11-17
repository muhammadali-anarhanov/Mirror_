"use client"


import { LanguageSelector, useText } from "@/components/marketing-language";
import { useEffect, useMemo, useState, type FormEvent } from "react"
import Link from "next/link"
import {
  ArrowDownRight, ArrowUpRight, Building2, Boxes, CircleAlert, ClipboardList, Clock3, CreditCard,
  MonitorSmartphone, Package, ShieldCheck, Sparkles, Store, Users, WalletCards,
} from "lucide-react"
import { AdminChart } from "@/components/admin/admin-charts"
import { AdminRecords } from "@/components/admin/admin-records"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ADMIN_DEMO_RECORDS as DEMO_RECORDS, ADMIN_SECTION_DEFINITIONS as SECTION_DEFINITIONS } from "@/lib/admin/admin-catalog"
import type { ConsoleKind } from "@/components/admin/admin-shell"
import { AdminAnalytics, BrandSubscription, IntegrationsPanel, StockReceiving, StockTransfers } from "@/components/admin/admin-workflows"

type RolePreview = "BRAND_ADMIN" | "STORE_ADMIN" | "STAFF" | "ANALYST_MANAGER" | "CUSTOM_ROLE"

const platformMetrics = [
  { label: "Registered brands", value: "128", change: "+12.8%", icon: Users, hint: "all platform accounts" },
  { label: "Active brands", value: "116", change: "+9.4%", icon: Building2, hint: "currently enabled" },
  { label: "Pending applications", value: "8", change: "Review", icon: ClipboardList, hint: "awaiting a decision" },
  { label: "Suspended brands", value: "4", change: "Review", icon: CircleAlert, hint: "platform-level status" },
  { label: "Registered branches", value: "294", change: "+8.2%", icon: Boxes, hint: "across 18 countries" },
  { label: "Active smart mirrors", value: "516", change: "+14", icon: MonitorSmartphone, hint: "sample device status" },
  { label: "Try-on sessions", value: "84.2k", change: "+18.6%", icon: Sparkles, hint: "platform-wide activity" },
]

const storeMetrics = [
  { label: "Branches", value: "4", change: "+1", icon: Store, hint: "in your brand network" },
  { label: "Products", value: "184", change: "+12", icon: Package, hint: "in the catalog" },
  { label: "Inventory units", value: "2,418", change: "+6.2%", icon: Boxes, hint: "across all branches" },
  { label: "Active smart mirrors", value: "7", change: "Online", icon: MonitorSmartphone, hint: "sample device status" },
  { label: "Try-on sessions", value: "18,420", change: "+18.6%", icon: Sparkles, hint: "last 30 days" },
  { label: "Low stock alerts", value: "12", change: "Review", icon: CircleAlert, hint: "across 4 categories" },
]

const storeScopeMetrics = [
  { label: "Products", value: "42", change: "+3", icon: Package, hint: "assigned branch catalog" },
  { label: "Inventory units", value: "286", change: "+4.8%", icon: Boxes, hint: "available at this branch" },
  { label: "Low stock alerts", value: "3", change: "Review", icon: CircleAlert, hint: "for this branch" },
  { label: "Active mirrors", value: "2", change: "Online", icon: MonitorSmartphone, hint: "sample device status" },
  { label: "Try-on sessions", value: "2,846", change: "+12.4%", icon: Sparkles, hint: "last 30 days" },
  { label: "Today's sessions", value: "128", change: "+6.2%", icon: Clock3, hint: "sample activity" },
]

const staffMetrics = [
  { label: "Catalog items", value: "42", change: "View only", icon: Package, hint: "assigned branch" },
  { label: "Try-on sessions", value: "128", change: "Today", icon: Sparkles, hint: "sample activity" },
  { label: "Connected mirrors", value: "2", change: "Preview", icon: MonitorSmartphone, hint: "sample status only" },
]

const activityRows = [
  { title: "Product availability updated", detail: "Linen relaxed blazer · Le Marais", time: "12 minutes ago", icon: Package },
  { title: "New device connected", detail: "ML-MIR-014 · Le Marais", time: "46 minutes ago", icon: MonitorSmartphone },
  { title: "Staff access changed", detail: "Lea Dubois · Catalog permissions", time: "2 hours ago", icon: ShieldCheck },
  { title: "New try-on session", detail: "Virtual fitting · Le Marais", time: "3 hours ago", icon: Sparkles },
]

function AnimatedMetricValue({ value }: { value: string }) {
  const parts = useMemo(() => {
    const match = value.match(/^([^0-9]*)([\d,]+(?:\.\d+)?)(.*)$/)
    if (!match) return null
    const target = Number(match[2].replaceAll(",", ""))
    if (!Number.isFinite(target)) return null
    const decimals = match[2].split(".")[1]?.length ?? 0
    const formatter = new Intl.NumberFormat("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    return { target, format: (number: number) => `${match[1]}${formatter.format(number)}${match[3]}` }
  }, [value])
  const [displayValue, setDisplayValue] = useState(() => parts?.format(0) ?? value)

  useEffect(() => {
    if (!parts) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplayValue(value)
      return
    }
    const startedAt = performance.now()
    let frame = 0
    const animate = (now: number) => {
      const progress = Math.min((now - startedAt) / 850, 1)
      const easedProgress = 1 - (1 - progress) ** 3
      setDisplayValue(parts.format(parts.target * easedProgress))
      if (progress < 1) frame = requestAnimationFrame(animate)
      else setDisplayValue(value)
    }
    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [parts, value])

  return <span aria-label={value}>{displayValue}</span>
}

function MetricCard({ item, index }: { item: typeof storeMetrics[number]; index: number }) {
  const t = useText();

  const Icon = item.icon
  const down = item.change === "Review"
  return (
    <Card className={`mirror-admin-metric-card is-accent-${index + 1}`} style={{ animationDelay: `${index * 65}ms` }}>
      <CardHeader>
        <CardDescription>{t(item.label)}</CardDescription>
        <CardAction><span className="mirror-admin-metric-icon"><Icon aria-hidden="true" /></span></CardAction>
      </CardHeader>
      <CardContent>
        <div className="mirror-admin-metric-value"><AnimatedMetricValue value={item.value} /></div>
        <div className="mirror-admin-metric-foot"><span className={down ? "is-warning" : "is-positive"}>{down ? <ArrowDownRight aria-hidden="true" /> : <ArrowUpRight aria-hidden="true" />}{t(item.change)}</span><small>{t(item.hint)}</small></div>
      </CardContent>
    </Card>
  )
}

type QuickAction = { label: string; description: string; section: string; icon: typeof ClipboardList }

function quickActionsFor(kind: ConsoleKind, rolePreview: RolePreview): QuickAction[] {
  if (kind === "super-admin") return [
    { label: "Review applications", description: "Check onboarding requests", section: "applications", icon: ClipboardList },
    { label: "Browse brands", description: "Open the brand directory", section: "brands", icon: Building2 },
    { label: "View audit trail", description: "See recent platform changes", section: "audit-logs", icon: ShieldCheck },
  ]
  if (kind === "staff" || rolePreview === "STAFF") return [
    { label: "View catalog", description: "Find products and variants", section: "products", icon: Package },
    { label: "Receive stock", description: "Record an incoming delivery", section: "stock-receiving", icon: Boxes },
    { label: "Check smart mirrors", description: "Review device status", section: "devices", icon: MonitorSmartphone },
  ]
  if (rolePreview === "STORE_ADMIN") return [
    { label: "Receive stock", description: "Record an incoming delivery", section: "stock-receiving", icon: Boxes },
    { label: "Review inventory", description: "Check branch availability", section: "inventory", icon: Package },
    { label: "Check smart mirrors", description: "Review device status", section: "devices", icon: MonitorSmartphone },
  ]
  return [
    { label: "Add Product", description: "Update catalog and variants", section: "products", icon: Package },
    { label: "Review inventory", description: "Find stock that needs attention", section: "inventory", icon: Boxes },
    { label: "Check smart mirrors", description: "Review device status", section: "devices", icon: MonitorSmartphone },
  ]
}

function QuickActions({ kind, rolePreview, localeQuery }: { kind: ConsoleKind; rolePreview: RolePreview; localeQuery: string }) {
  const t = useText();

  const basePath = kind === "super-admin" ? "/super-admin" : kind === "staff" ? "/staff" : "/brand"
  const actions = quickActionsFor(kind, rolePreview)
  return (
    <section className="mirror-admin-quick-actions" aria-label={t("Quick actions")}>
      <div className="mirror-admin-quick-actions-heading"><strong>{t("Quick actions")}</strong><span>{t("Start with a common task")}</span></div>
      <div className="mirror-admin-quick-actions-list">
        {actions.map((action, index) => {
          const Icon = action.icon
          return (
            <Link key={action.label} className="mirror-admin-quick-action" href={`${basePath}/${action.section}${localeQuery}${action.label === "Add Product" ? `${localeQuery ? "&" : "?"}create=true` : ""}`} style={{ animationDelay: `${index * 75}ms` }}>
              <span className="mirror-admin-quick-action-icon"><Icon aria-hidden="true" /></span>
              <span className="mirror-admin-quick-action-copy"><strong>{t(action.label)}</strong><small>{t(action.description)}</small></span>
              <ArrowUpRight className="mirror-admin-quick-action-arrow" aria-hidden="true" />
            </Link>
          )
        })}
      </div>
    </section>
  )
}

function IntegrationStatusCard({ kind, rolePreview = "BRAND_ADMIN" }: { kind: ConsoleKind; rolePreview?: RolePreview }) {
  const t = useText();

  const rows = kind === "super-admin"
    ? [["Active brands", "116 of 128", "is-active"], ["Applications", "8 to review", "is-warning"], ["Campaigns", "2 running", "is-active"], ["Registered branches", "294 locations", "is-muted"]]
    : rolePreview === "STORE_ADMIN" || rolePreview === "STAFF"
      ? [["Inventory units", "286 at Le Marais", "is-active"], ["Low-stock variants", "3 to review", "is-warning"], ["Smart mirrors", "2 online", "is-active"], ["Branch activity", "128 sessions today", "is-muted"]]
      : [["Inventory units", "2,418 across 4 branches", "is-active"], ["Low-stock variants", "12 to review", "is-warning"], ["Smart mirrors", "7 online · 1 offline", "is-active"], ["Active campaign", "Autumn fit week", "is-muted"]]
  return (
    <Card className="mirror-admin-status-card">
      <CardHeader><CardTitle>{kind === "super-admin" ? t("Platform snapshot") : t("Operations snapshot")}</CardTitle><CardDescription>{t("Illustrative operational indicators for this demo workspace.")}</CardDescription></CardHeader>
      <CardContent className="mirror-admin-status-list">
        {rows.map(([name, status, tone]) => <div className="mirror-admin-status-row" key={name}><span className="mirror-admin-status-led" /><span>{t(name)}</span><Badge variant="outline" className={tone}>{t(status)}</Badge></div>)}
        <p className="mirror-admin-status-footnote"><CircleAlert aria-hidden="true" />{t("Sample figures only; nothing is synchronized with a live service.")}</p>
      </CardContent>
    </Card>
  )
}

function RecentActivity({ kind }: { kind: ConsoleKind }) {
  const t = useText();

  const rows = kind === "super-admin" ? DEMO_RECORDS["audit-logs"].slice(0, 4).map((row) => ({
    title: String(row.action), detail: String(row.module), time: String(row.time), icon: ShieldCheck,
  })) : activityRows
  return (
    <Card className="mirror-admin-activity-card">
      <CardHeader><CardTitle>{t("Recent activity")}</CardTitle><CardAction><Link className="mirror-admin-card-link" href={kind === "super-admin" ? "/super-admin/audit-logs" : "/brand/analytics"}>{t("View all")}</Link></CardAction></CardHeader>
      <CardContent className="mirror-admin-activity-list">
        {rows.map((item) => {
          const Icon = item.icon
          return <div className="mirror-admin-activity-item" key={`${item.title}-${item.time}`}><span className="mirror-admin-activity-icon"><Icon aria-hidden="true" /></span><span className="mirror-admin-activity-copy"><strong>{t(item.title)}</strong><small>{t(item.detail)}</small></span><time>{item.time}</time></div>
        })}
      </CardContent>
    </Card>
  )
}

function Overview({ kind, period, rolePreview, localeQuery }: { kind: ConsoleKind; period: string; rolePreview: RolePreview; localeQuery: string }) {
  const t = useText();

  const items = kind === "super-admin" ? platformMetrics : kind === "staff" || rolePreview === "STAFF" ? staffMetrics : rolePreview === "STORE_ADMIN" ? storeScopeMetrics : storeMetrics
  const locationLabel = rolePreview === "STORE_ADMIN" || rolePreview === "STAFF" ? "Le Marais" : "Maison Lune"
  return (
    <section className="mirror-admin-section">
      <div className="mirror-admin-section-heading mirror-admin-overview-heading">
        <div><span className="mirror-admin-eyebrow">{kind === "super-admin" ? t("GLOBAL PLATFORM") : kind === "staff" ? t("ASSIGNED WORKSPACE") : rolePreview === "STORE_ADMIN" || rolePreview === "STAFF" ? t("STORE PERFORMANCE") : t("BRAND PERFORMANCE")}</span><h1>{kind === "super-admin" ? t("Platform overview") : kind === "staff" || rolePreview === "STAFF" ? t("Your workspace") : `${locationLabel} · ${t("Overview")}`}</h1><p>{kind === "super-admin" ? t("A clear view across the MIRROR platform.") : kind === "staff" || rolePreview === "STAFF" ? t("Your permitted store tools and recent activity.") : t("A focused view of catalog health and virtual fitting activity.")}</p></div>
        <div className="mirror-admin-overview-tools"><span className="mirror-admin-date-note">{period === "today" ? t("Today") : period === "7d" ? t("Last 7 days") : period === "90d" ? t("Last 90 days") : period === "custom" ? t("Custom range") : t("Last 30 days")}</span>{period === "custom" && <div className="mirror-admin-custom-dates"><Input type="date" aria-label={t("Start date")} /><span>{t("to")}</span><Input type="date" aria-label={t("End date")} /></div>}</div>
      </div>
      <QuickActions kind={kind} rolePreview={rolePreview} localeQuery={localeQuery} />
      <div className={`mirror-admin-metric-grid${kind === "staff" ? " is-staff" : ""}`}>
        {items.map((item, index) => <MetricCard key={item.label} item={item} index={index} />)}
        {kind === "super-admin" && <Card className="mirror-admin-metric-card mirror-admin-revenue-card"><CardHeader><CardDescription>{t("Monthly recurring revenue")}</CardDescription><CardAction><span className="mirror-admin-metric-icon"><WalletCards aria-hidden="true" /></span></CardAction></CardHeader><CardContent><div className="mirror-admin-metric-value"><AnimatedMetricValue value="$62,350" /></div><div className="mirror-admin-metric-foot"><span className="is-positive">{t("+12.4% MoM")}</span><small>{t("Platform-level demo total")}</small></div></CardContent></Card>}
      </div>
      {kind === "super-admin" ? (
        <div className="mirror-admin-chart-grid"><AdminChart kind="platform" /><AdminChart kind="subscriptions" /><AdminChart kind="growth" /><IntegrationStatusCard kind={kind} /></div>
      ) : (
        <div className="mirror-admin-chart-grid"><AdminChart kind="store" /><IntegrationStatusCard kind={kind} rolePreview={rolePreview} /></div>
      )}
      <div className="mirror-admin-lower-grid"><RecentActivity kind={kind} /><Card className="mirror-admin-top-products"><CardHeader><CardTitle>{kind === "super-admin" ? t("Platform snapshot") : t("Popular products")}</CardTitle><CardDescription>{kind === "super-admin" ? t("Illustrative platform indicators") : t("Sample engagement for this workspace")}</CardDescription></CardHeader><CardContent>
        {kind === "super-admin" ? <div className="mirror-admin-snapshot-grid"><div><span>{t("Platform availability")}</span><strong>99.96%</strong><small>{t("Sample uptime metric")}</small></div><div><span>{t("Brand onboarding")}</span><strong>{t("8 pending")}</strong><small>{t("Applications to review")}</small></div><div><span>{t("Device health")}</span><strong>96.8%</strong><small>{t("Sample online rate")}</small></div></div> : ["Linen relaxed blazer", "Sculpted midi dress", "Mini crescent bag"].map((name, index) => <div className="mirror-admin-product-rank" key={name}><span className="mirror-admin-product-rank-index">0{index + 1}</span><span className="mirror-admin-product-rank-copy"><strong>{name}</strong><small>{[1284, 1086, 824][index].toLocaleString()}{t("sample try-ons")}</small></span><Badge variant="outline">{t("Demo")}</Badge></div>)}
      </CardContent></Card></div>
      {kind !== "super-admin" && kind !== "staff" && rolePreview !== "STAFF" && <div className="mirror-admin-lower-grid">
        <Card className="mirror-admin-branch-card"><CardHeader><CardTitle>{t("Branch performance")}</CardTitle><CardDescription>{t("Sample try-on activity by location")}</CardDescription></CardHeader><CardContent className="mirror-admin-branch-list">{(rolePreview === "STORE_ADMIN" ? [["Le Marais", "2,846", 78]] : [["Le Marais", "4,260", 82], ["Saint-Germain", "3,180", 68], ["Lyon Presqu’île", "2,140", 54], ["Nice Carré d’Or", "1,820", 43]]).map(([branch, sessions, progress]) => <div className="mirror-admin-branch-row" key={branch}><span><strong>{branch}</strong><small>{sessions}{t("sessions")}</small></span><span className="mirror-admin-branch-track"><i style={{ width: `${progress}%` }} /></span><Badge variant="outline">{t("Demo")}</Badge></div>)}</CardContent></Card>
        <Card className="mirror-admin-alert-card"><CardHeader><CardTitle>{t("Inventory alerts")}</CardTitle><CardDescription>{rolePreview === "STORE_ADMIN" ? t("Le Marais branch only") : t("Variants to review across your brand")}</CardDescription></CardHeader><CardContent className="mirror-admin-alert-list">{(rolePreview === "STORE_ADMIN" ? [["Linen relaxed blazer", "S · Oat", "8 units", "Watch"]] : [["Cotton poplin shirt", "S · Sky", "2 units", "Low stock"], ["Soft leather loafer", "37 · Espresso", "0 units", "Out of stock"], ["Sculpted midi dress", "M · Black", "3 units", "Low stock"]]).map(([product, variant, count, status]) => <div className="mirror-admin-alert-row" key={product}><span><strong>{product}</strong><small>{variant}</small></span><span>{count}</span><Badge variant="outline" className={`mirror-admin-status-badge is-${statusVariantForAlert(status)}`}>{t(status)}</Badge></div>)}</CardContent></Card>
      </div>}
    </section>
  )
}

function statusVariantForAlert(status: string) {
  return status === "Out of stock" ? "quiet" : status === "Watch" ? "neutral" : "warning"
}

function SettingsPanel({ kind }: { kind: ConsoleKind }) {
  const t = useText();

  const isGlobal = kind === "super-admin"
  const [maintenance, setMaintenance] = useState(false)
  const [emailAlerts, setEmailAlerts] = useState(true)
  const [deviceAlerts, setDeviceAlerts] = useState(true)
  const [twoFactorRequired, setTwoFactorRequired] = useState(true)
  const [securityAlerts, setSecurityAlerts] = useState(true)
  const [currency, setCurrency] = useState("USD")
  const [saved, setSaved] = useState(false)
  const [logoPreview, setLogoPreview] = useState("")

  useEffect(() => {
    return () => {
      if (logoPreview.startsWith("blob:")) URL.revokeObjectURL(logoPreview)
    }
  }, [logoPreview])

  function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaved(true)
  }

  return (
    <section className="mirror-admin-section">
      <div className="mirror-admin-section-heading"><div><span className="mirror-admin-eyebrow">{t("CONFIGURATION")}</span><h1>{isGlobal ? t("Platform settings") : t("Brand settings")}</h1><p>{isGlobal ? t("Platform profile, locale, security and notification preferences.") : t("Brand profile, contact details, locale and notification preferences.")}</p></div></div>
      {isGlobal && <IntegrationStatusCard kind={kind} />}
      <form className="mirror-admin-settings-grid" onSubmit={saveSettings}>
        <Card><CardHeader><CardTitle>{isGlobal ? t("Platform profile") : t("Brand profile")}</CardTitle><CardDescription>{t("These values only update in the current demo session.")}</CardDescription></CardHeader><CardContent className="mirror-admin-settings-content">
          {isGlobal && <><Field><FieldLabel htmlFor="platform-name">{t("Platform name")}</FieldLabel><Input id="platform-name" defaultValue="MIRROR" required /></Field><Field><FieldLabel htmlFor="platform-support-email">{t("Support contact")}</FieldLabel><Input id="platform-support-email" type="email" defaultValue="support@mirror.example" required /></Field><Field><FieldLabel htmlFor="platform-region">{t("Default region")}</FieldLabel><select id="platform-region" className="mirror-admin-native-select" defaultValue="Europe / Paris"><option>{t("Europe / Paris")}</option><option>{t("Asia / Almaty")}</option><option>{t("Asia / Tashkent")}</option><option>{t("UTC")}</option></select></Field></>}
          {!isGlobal && <><Field><FieldLabel htmlFor="store-name">{t("Brand name")}</FieldLabel><Input id="store-name" defaultValue="Maison Lune" required /></Field><Field><FieldLabel htmlFor="store-logo">{t("Brand logo")}</FieldLabel><Input id="store-logo" type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; setLogoPreview(file ? URL.createObjectURL(file) : "") }} /><p className="mirror-admin-field-note"><MonitorSmartphone aria-hidden="true" />{t("Local preview only; image storage API is pending.")}</p>{logoPreview && <img className="mirror-admin-upload-preview" src={logoPreview} alt={t("Selected store logo preview")} />}</Field><Field><FieldLabel htmlFor="store-address">{t("Address")}</FieldLabel><Input id="store-address" defaultValue="18 Rue de Bretagne, Paris" required /></Field><Field><FieldLabel htmlFor="store-contact">{t("Contact email")}</FieldLabel><Input id="store-contact" type="email" defaultValue="paris@maisonlune.example" required /></Field><Field><FieldLabel htmlFor="store-phone">{t("Contact phone")}</FieldLabel><Input id="store-phone" type="tel" defaultValue="+33 1 42 78 10 24" /></Field><Field><FieldLabel htmlFor="store-hours">{t("Opening information")}</FieldLabel><Input id="store-hours" defaultValue="Monday–Saturday, 10:00–19:00" /></Field></>}
          <Field><FieldLabel htmlFor="preferred-language">{t("Preferred language")}</FieldLabel><LanguageSelector id="preferred-language" className="mirror-admin-native-select" /></Field>
          {!isGlobal && <Field><FieldLabel htmlFor="store-currency">{t("Currency")}</FieldLabel><select id="store-currency" className="mirror-admin-native-select" value={currency} onChange={(event) => setCurrency(event.target.value)}><option>{t("USD")}</option><option>{t("EUR")}</option><option>{t("GBP")}</option><option>{t("JPY")}</option></select></Field>}
          {isGlobal && <Field orientation="horizontal"><Checkbox id="maintenance-mode" checked={maintenance} onCheckedChange={(checked) => setMaintenance(checked === true)} /><FieldContent><FieldLabel htmlFor="maintenance-mode">{t("Maintenance mode")}</FieldLabel><FieldDescription>{t("Preview-only toggle; no live services are affected.")}</FieldDescription></FieldContent></Field>}
          <Field orientation="horizontal"><Checkbox id="require-2fa" checked={twoFactorRequired} onCheckedChange={(checked) => setTwoFactorRequired(checked === true)} /><FieldContent><FieldLabel htmlFor="require-2fa">{t("Require two-step verification")}</FieldLabel><FieldDescription>{t("UI preference only; authentication policies are not enforced here.")}</FieldDescription></FieldContent></Field>
          <Field orientation="horizontal"><Checkbox id="security-alerts" checked={securityAlerts} onCheckedChange={(checked) => setSecurityAlerts(checked === true)} /><FieldContent><FieldLabel htmlFor="security-alerts">{t("New sign-in alerts")}</FieldLabel><FieldDescription>{t("Show a notification when an account signs in from a new device.")}</FieldDescription></FieldContent></Field>
          <Field orientation="horizontal"><Checkbox id="email-notifications" checked={emailAlerts} onCheckedChange={(checked) => setEmailAlerts(checked === true)} /><FieldContent><FieldLabel htmlFor="email-notifications">{t("Email notifications")}</FieldLabel><FieldDescription>{t("Receive a digest of administrative events.")}</FieldDescription></FieldContent></Field>
          <Field orientation="horizontal"><Checkbox id="device-notifications" checked={deviceAlerts} onCheckedChange={(checked) => setDeviceAlerts(checked === true)} /><FieldContent><FieldLabel htmlFor="device-notifications">{t("Device status alerts")}</FieldLabel><FieldDescription>{t("Show when a connected device needs attention.")}</FieldDescription></FieldContent></Field>
        </CardContent><div className="mirror-admin-settings-footer"><Button type="submit">{t("Save preferences")}</Button></div></Card>
        <Card><CardHeader><CardTitle>{t("Service connections")}</CardTitle><CardDescription>{t("Preview only · nothing is connected or authorized.")}</CardDescription></CardHeader><CardContent className="mirror-admin-connection-list">
          {["Authentication & roles", isGlobal ? t("Admin API contract") : t("Admin catalog CRUD"), isGlobal ? t("Billing provider") : t("Catalog image storage")].map((name) => <div className="mirror-admin-connection-item" key={name}><span><i />{t(name)}</span><Badge variant="outline" className="is-pending">{t("Pending")}</Badge></div>)}
          <p>{t("Credentials and private keys are never displayed in the browser.")}</p>
        </CardContent></Card>
      </form>
      {saved && <p className="mirror-admin-action-feedback" role="status">{t("Preferences updated in this demo session only.")}</p>}
    </section>
  )
}

function PendingOrders() {
  const t = useText();

  return <Card className="mirror-admin-pending-inline"><CardHeader><div className="mirror-admin-section-icon"><CreditCard aria-hidden="true" /></div><CardTitle>{t("Order management API is pending")}</CardTitle></CardHeader><CardContent><p>{t("The fitting-room client has a checkout request, but no documented admin order-list or status-update API. No sample orders or payment states are shown here.")}</p><Badge variant="outline" className="is-pending">{t("Integration pending")}</Badge></CardContent></Card>
}

export function AdminContent({ kind, section, searchTerm, period, rolePreview, localeQuery }: { kind: ConsoleKind; section: string; searchTerm: string; period: string; rolePreview: RolePreview; localeQuery: string }) {
  const isBrand = kind === "brand" || kind === "admin"
  const analyticsKind = kind === "super-admin" ? "super-admin" : "brand"
  const recordSection = section === "branches" && isBrand ? "brand-branches"
    : section === "devices" && isBrand ? "brand-devices"
    : section === "notifications" && isBrand ? "brand-notifications"
    : section
  const scopeMode = kind === "super-admin" ? "all" : kind === "staff" || rolePreview === "STORE_ADMIN" || rolePreview === "STAFF" ? "store" : "brand"
  const branchScope = scopeMode === "store" ? "Le Marais" : undefined
  const roleReadOnly = kind === "staff" || (isBrand && (rolePreview === "STAFF" || rolePreview === "ANALYST_MANAGER" || rolePreview === "CUSTOM_ROLE"))

  if (section === "dashboard") return <Overview kind={kind} period={period} rolePreview={rolePreview} localeQuery={localeQuery} />
  if (section === "analytics") return <AdminAnalytics kind={analyticsKind} branchScope={branchScope} />
  if (section === "stock-receiving") return <StockReceiving key={rolePreview} kind="brand" branchScope={branchScope} />
  if (section === "transfers") return <StockTransfers key={rolePreview} kind="brand" branchScope={branchScope} />
  if (section === "subscription" && isBrand) return <BrandSubscription kind="brand" />
  if (section === "integrations" && isBrand) return <IntegrationsPanel kind="brand" />
  if (section === "settings" || section === "store-settings") return <SettingsPanel kind={kind} />
  if (section === "orders") return <PendingOrders />
  if (SECTION_DEFINITIONS[recordSection]?.columns.length) {
    const isReadOnly = roleReadOnly || Boolean(SECTION_DEFINITIONS[recordSection].readOnly)
    return <AdminRecords key={`${recordSection}-${kind}-${rolePreview}`} section={recordSection} searchTerm={searchTerm} readOnly={isReadOnly} scopeMode={scopeMode} />
  }
  return <Overview kind={kind} period={period} rolePreview={rolePreview} localeQuery={localeQuery} />
}
