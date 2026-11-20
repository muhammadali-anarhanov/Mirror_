"use client"

import { useState } from "react"
import Link from "next/link"
import {
  AlertTriangle, Boxes, Building2, ClipboardList, DollarSign, MonitorSmartphone, Package, Receipt, ShoppingBag, Sparkles, Store, Users,
} from "lucide-react"
import { useText } from "@/components/marketing-language"
import { money, useApi, type Analytics, type Application, type Me, type PlatformStats, type Revenue } from "@/lib/console/api"
import { RankList, TrendChart } from "./charts"
import { MirrorSummary } from "./mirrors"
import { Card, ErrorNote, PageHeader, Segment, Skeletons, Stat, Status, useLocale } from "./ui"

const PERIODS = [7, 30, 90] as const

function usePeriod() {
  const t = useText()
  const [days, setDays] = useState<number>(30)
  const control = <Segment label={t("Period")} value={days} onChange={setDays} options={PERIODS.map((d) => ({ value: d, label: t("{count} days", { count: d }) }))} />
  return { days, control }
}

export function BrandOverview({ me }: { me: Me }) {
  const t = useText()
  const locale = useLocale()
  const { days, control } = usePeriod()
  const { data, error } = useApi<Analytics>(`/analytics?days=${days}`, { refreshInterval: 60000 })
  const branchScope = Boolean(me.branchId)
  const usd = (n: number) => money(n, locale)
  return (
    <>
      <PageHeader eyebrow={branchScope ? t("Your branch") : t("Your brand")} title={t("Statistics")} description={t("Live numbers from your smart mirrors, catalog and cashier requests.")}>{control}</PageHeader>
      <ErrorNote error={error} />
      {!data && !error ? <Skeletons count={8} /> : data && (
        <>
          <div className="cx-stats">
            <Stat index={0} tone="hero" icon={Sparkles} label={t("AI try-ons")} value={data.tryonSessions} note={t("{count} in total", { count: data.fittingsTotal })} />
            <Stat index={1} icon={Receipt} label={t("Cashier requests")} value={data.cashierRequests} note={t("{count} items requested", { count: data.unitsRequested })} />
            <Stat index={2} tone="good" icon={DollarSign} label={t("Sold")} value={data.completedValue} format={usd} note={t("{count} completed orders", { count: data.completedOrders })} />
            <Stat index={3} icon={ShoppingBag} label={t("Requested value")} value={data.orderValue} format={usd} note={t("Not cancelled")} />
            <Stat index={4} icon={Package} label={t("Products")} value={data.products} note={t("{count} published", { count: data.publishedProducts })} />
            <Stat index={5} icon={Boxes} label={t("Units in stock")} value={data.inventoryUnits} note={t("Available to sell")} />
            <Stat index={6} tone={data.lowStock ? "warn" : undefined} icon={AlertTriangle} label={t("Low stock")} value={data.lowStock} note={t("Variants with 3 or fewer")} />
            <Stat index={7} icon={MonitorSmartphone} label={t("Mirrors online")} value={data.activeDevices} note={t("of {count} smart mirrors", { count: data.devices })} />
          </div>
          <MirrorSummary days={days} />
          <div className="cx-layout-2">
            <Card title={t("Activity")} description={t("Daily AI try-ons and cashier requests")}>
              <TrendChart data={data.series} lines={[{ key: "fittings", label: "AI try-ons", color: "#2563eb" }, { key: "orders", label: "Cashier requests", color: "#38bdf8" }]} />
            </Card>
            <Card title={t("Most tried on")} description={t("Products customers tried with AI")}>
              <RankList rows={data.topProducts.map((p) => ({ id: p.id, name: p.name, value: p.fittings }))} empty="No try-ons in this period yet." />
            </Card>
          </div>
          <div className="cx-layout-even">
            <Card title={t("Most requested")} description={t("Units sent to the cashier")}>
              <RankList rows={data.topOrdered.map((p) => ({ id: p.id, name: p.name, value: p.units, suffix: "pcs" }))} empty="No cashier requests in this period yet." />
            </Card>
            <Card title={t("Branches")} description={t("Try-ons and requests by branch")} actions={!branchScope ? <Link className="cx-btn is-sm" href="/brand/branches">{t("Manage")}</Link> : undefined}>
              <RankList rows={data.branchBreakdown.map((b) => ({ id: b.id, name: `${b.name} · ${t("{count} requests", { count: b.orders })}`, value: b.fittings, suffix: "try-ons" }))} empty="No branches yet." />
            </Card>
          </div>
        </>
      )}
    </>
  )
}

export function PlatformOverview() {
  const t = useText()
  const locale = useLocale()
  const { days, control } = usePeriod()
  const { data, error } = useApi<PlatformStats>(`/platform/stats?days=${days}`, { refreshInterval: 60000 })
  const applications = useApi<Application[]>("/applications")
  const revenue = useApi<Revenue>(`/platform/revenue?days=${days}`)
  return (
    <>
      <PageHeader eyebrow={t("MIRROR platform")} title={t("Platform statistics")} description={t("Every brand, branch and smart mirror in one view.")}>{control}</PageHeader>
      <ErrorNote error={error} />
      {!data && !error ? <Skeletons count={8} /> : data && (
        <>
          <div className="cx-stats">
            <Stat index={0} tone="hero" icon={DollarSign} label={t("Monthly recurring revenue")} value={data.mrr} format={(n) => money(n, locale)} note={t("Active subscriptions")} />
            <Stat index={1} tone="good" icon={DollarSign} label={t("Try-on package sales")} value={revenue.data?.totals.limitRevenue} format={(n) => money(n, locale)} note={t("{amount} awaiting payment", { amount: money(revenue.data?.totals.pending ?? 0, locale) })} />
            <Stat index={1} icon={Building2} label={t("Brands")} value={data.brands} note={t("{active} active · {suspended} suspended", { active: data.activeBrands, suspended: data.suspendedBrands })} />
            <Stat index={2} tone={data.newApplications ? "warn" : undefined} icon={ClipboardList} label={t("Open applications")} value={data.newApplications} note={t("{count} received in total", { count: data.applications })} />
            <Stat index={3} icon={Sparkles} label={t("AI try-ons")} value={data.fittings} note={t("In this period")} />
            <Stat index={4} icon={Receipt} label={t("Cashier requests")} value={data.orders} note={t("In this period")} />
            <Stat index={5} icon={Store} label={t("Branches")} value={data.branches} note={t("{count} products", { count: data.products })} />
            <Stat index={6} tone="good" icon={MonitorSmartphone} label={t("Mirrors online")} value={data.onlineDevices} note={t("of {count} smart mirrors", { count: data.devices })} />
            <Stat index={7} icon={Users} label={t("Brand users")} value={data.users} note={t("Admins and staff")} />
          </div>
          <div className="cx-layout-2">
            <Card title={t("Platform activity")} description={t("Daily try-ons, cashier requests and applications")}>
              <TrendChart data={data.series} lines={[{ key: "fittings", label: "AI try-ons", color: "#2563eb" }, { key: "orders", label: "Cashier requests", color: "#38bdf8" }, { key: "applications", label: "Applications", color: "#1e3a8a" }]} />
            </Card>
            <Card title={t("Top brands")} description={t("By AI try-ons in this period")}>
              <RankList rows={data.topBrands.map((b) => ({ id: b.id, name: b.name, value: b.fittings }))} empty="No brands yet." />
            </Card>
          </div>
          <div className="cx-layout-even">
            <Card title={t("Plans")} description={t("Active subscriptions by plan")} actions={<Link className="cx-btn is-sm" href="/super-admin/subscriptions">{t("Open")}</Link>}>
              <RankList rows={data.plans.map((p) => ({ id: p.id, name: p.name, value: p.brands, suffix: "brands" }))} empty="No plans." />
            </Card>
            <Card title={t("Latest applications")} description={t("From the public website")} actions={<Link className="cx-btn is-sm" href="/super-admin/applications">{t("Review")}</Link>}>
              {!applications.data?.length ? <p className="cx-muted">{t("No applications yet.")}</p> : (
                <div className="cx-rank">
                  {applications.data.slice(0, 5).map((a) => (
                    <div key={a.id} className="cx-rank-row" style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}>
                      <span className="cx-rank-name"><strong>{a.payload.companyName}</strong> <span className="cx-muted cx-small">· {a.payload.contactName}</span></span>
                      <Status value={a.status} />
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </>
  )
}
