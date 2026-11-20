"use client"

import { useState } from "react"
import { Building2, CheckCircle2, Clock3, Coins, DollarSign, MonitorSmartphone, Percent, ShoppingBag, Sparkles, XCircle } from "lucide-react"
import { useText } from "@/components/marketing-language"
import { formatDate, money, send, useApi, type Package, type Purchase, type Revenue } from "@/lib/console/api"
import { TrendChart } from "./charts"
import { Card, Empty, ErrorNote, PageHeader, Segment, Skeletons, Stat, Status, useAction, useLocale } from "./ui"

/** Super Admin: platform income from try-on packages and subscriptions, per brand and in total. */
export function RevenuePage() {
  const t = useText()
  const locale = useLocale()
  const [days, setDays] = useState(30)
  const revenue = useApi<Revenue>(`/platform/revenue?days=${days}`, { refreshInterval: 60000 })
  const purchases = useApi<Purchase[]>("/limit-purchases?scope=platform", { refreshInterval: 60000 })
  const [filter, setFilter] = useState("PENDING")
  const { busy, run } = useAction()
  const usd = (n: number) => money(n, locale)
  const r = revenue.data
  const margin = r ? r.totals.periodLimitRevenue - r.totals.estimatedCost : 0
  const list = (purchases.data ?? []).filter((p) => filter === "all" || p.status === filter)
  const confirm = (p: Purchase, status: "PAID" | "CANCELLED") => run(async () => { await send(`/limit-purchases/${p.id}`, "PATCH", { status }); await Promise.all([purchases.mutate(), revenue.mutate()]) }, status === "PAID" ? "Payment confirmed. Try-ons added." : "Purchase cancelled")

  return (
    <>
      <PageHeader eyebrow={t("Billing")} title={t("Revenue")} description={t("Income from AI try-on packages and subscriptions, for every store and in total.")}>
        <Segment label={t("Period")} value={days} onChange={setDays} options={[7, 30, 90, 365].map((d) => ({ value: d, label: t("{count} days", { count: d }) }))} />
      </PageHeader>
      <ErrorNote error={revenue.error} />
      {!r ? <Skeletons count={8} /> : <>
        <div className="cx-stats">
          <Stat index={0} tone="hero" icon={DollarSign} label={t("Try-on package sales")} value={r.totals.limitRevenue} format={usd} note={t("All time · {amount} in this period", { amount: usd(r.totals.periodLimitRevenue) })} />
          <Stat index={1} icon={Coins} label={t("First packages")} value={r.totals.initialRevenue} format={usd} note={t("Bought when a mirror page was created")} />
          <Stat index={2} icon={ShoppingBag} label={t("Extra top-ups")} value={r.totals.topupRevenue} format={usd} note={t("Bought later when the limit ran low")} />
          <Stat index={3} tone={r.totals.pending ? "warn" : undefined} icon={Clock3} label={t("Awaiting payment")} value={r.totals.pending} format={usd} note={t("Confirm below after the money arrives")} />
          <Stat index={4} icon={Building2} label={t("Subscriptions per month")} value={r.totals.mrr} format={usd} note={t("{count} stores", { count: r.totals.brands })} />
          <Stat index={5} icon={MonitorSmartphone} label={t("Mirror pages")} value={r.totals.mirrors} note={t("{count} online now", { count: r.totals.onlineMirrors })} />
          <Stat index={6} icon={Sparkles} label={t("Try-ons used")} value={r.totals.tryonsUsed} note={t("of {count} bought · {period} in this period", { count: r.totals.tryonsBought, period: r.totals.fittings })} />
          <Stat index={7} tone={margin >= 0 ? "good" : "warn"} icon={Percent} label={t("Estimated margin")} value={margin} format={usd} note={t("Period sales minus about {cost} AI cost per try-on", { cost: usd(r.tryOnCostCents / 100) })} />
        </div>
        <div className="cx-layout-2">
          <Card title={t("Daily income")} description={t("Paid try-on packages and AI try-ons per day")}>
            <TrendChart data={r.series} lines={[{ key: "revenue", label: "Income (USD)", color: "#2563eb" }, { key: "fittings", label: "AI try-ons", color: "#38bdf8" }]} />
          </Card>
          <Card title={t("Stores' own sales")} description={t("Completed sales from smart mirrors in this period")}>
            <div className="cx-stat-value" style={{ marginTop: 0 }}>{usd(r.totals.storeSales)}</div>
            <p className="cx-muted cx-small">{t("Shows the value MIRROR brings to the stores; this is not platform income.")}</p>
          </Card>
        </div>
        <Card title={t("By store")} description={t("Income, mirror pages and try-on use of each store")}>
          {!r.brands.length ? <Empty icon={Building2} title={t("No stores yet")} /> : (
            <div className="cx-table-wrap"><table className="cx-table">
              <thead><tr><th>{t("Store")}</th><th className="is-num">{t("Mirror pages")}</th><th className="is-num">{t("Subscription")}</th><th className="is-num">{t("First packages")}</th><th className="is-num">{t("Extra top-ups")}</th><th className="is-num">{t("Total income")}</th><th className="is-num">{t("Awaiting payment")}</th><th className="is-num">{t("Try-ons used")}</th><th className="is-num">{t("Try-ons left")}</th><th className="is-num">{t("Store sales")}</th></tr></thead>
              <tbody>{r.brands.map((b) => (
                <tr key={b.id}>
                  <td className="cx-strong">{b.name}<div className="cx-small"><Status value={b.status} /></div></td>
                  <td className="is-num">{b.mirrors}<div className="cx-small cx-muted">{t("{count} online", { count: b.online })}</div></td>
                  <td className="is-num">{usd(b.plan)}<div className="cx-small cx-muted">{b.planId ?? "—"}</div></td>
                  <td className="is-num">{usd(b.initialRevenue)}</td>
                  <td className="is-num">{usd(b.topupRevenue)}<div className="cx-small cx-muted">{t("{count} times", { count: b.topups })}</div></td>
                  <td className="is-num cx-strong cx-price">{usd(b.totalRevenue)}</td>
                  <td className="is-num">{b.pending ? <span className="cx-badge is-warn">{usd(b.pending)}</span> : "—"}</td>
                  <td className="is-num">{b.tryonsUsed}<div className="cx-small cx-muted">{t("{count} in this period", { count: b.fittings })}</div></td>
                  <td className="is-num">{b.remaining}</td>
                  <td className="is-num">{usd(b.storeSales)}</td>
                </tr>
              ))}</tbody>
              <tfoot><tr><td className="cx-strong">{t("Total")}</td><td className="is-num cx-strong">{r.totals.mirrors}</td><td className="is-num cx-strong">{usd(r.totals.mrr)}</td><td className="is-num cx-strong">{usd(r.totals.initialRevenue)}</td><td className="is-num cx-strong">{usd(r.totals.topupRevenue)}</td><td className="is-num cx-strong cx-price">{usd(r.totals.limitRevenue)}</td><td className="is-num cx-strong">{usd(r.totals.pending)}</td><td className="is-num cx-strong">{r.totals.tryonsUsed}</td><td className="is-num cx-strong">{Math.max(0, r.totals.tryonsBought - r.totals.tryonsUsed)}</td><td className="is-num cx-strong">{usd(r.totals.storeSales)}</td></tr></tfoot>
            </table></div>
          )}
        </Card>
      </>}
      <div style={{ height: 16 }} />
      <Card title={t("Try-on package purchases")} description={t("Stores request packages from their mirror pages. Confirm once the payment has arrived; the try-ons are added immediately.")} actions={<Segment label={t("Status")} value={filter} onChange={setFilter} options={[{ value: "PENDING", label: t("Awaiting payment") }, { value: "PAID", label: t("Paid") }, { value: "CANCELLED", label: t("Cancelled") }, { value: "all", label: t("All") }]} />}>
        {!purchases.data ? <Skeletons count={1} /> : !list.length ? <Empty icon={Coins} title={t("Nothing here")} /> : (
          <div className="cx-table-wrap"><table className="cx-table">
            <thead><tr><th>{t("Date")}</th><th>{t("Store")}</th><th>{t("Mirror")}</th><th>{t("Type")}</th><th className="is-num">{t("Try-ons")}</th><th className="is-num">{t("Amount")}</th><th>{t("Status")}</th><th className="is-num">{t("Actions")}</th></tr></thead>
            <tbody>{list.map((p) => (
              <tr key={p.id}>
                <td className="cx-small">{formatDate(p.created_at, locale)}</td><td className="cx-strong">{p.brand}</td><td>{p.mirror}</td>
                <td>{p.kind === "INITIAL" ? t("First package") : t("Extra top-up")}</td>
                <td className="is-num">{p.tryons}</td><td className="is-num cx-strong">{usd(p.amount_cents / 100)}</td>
                <td><Status value={p.status} /></td>
                <td><div className="cx-row-actions">{p.status === "PENDING" && <>
                  <button type="button" className="cx-btn is-sm is-primary" disabled={busy} onClick={() => confirm(p, "PAID")}><CheckCircle2 aria-hidden="true" />{t("Payment received")}</button>
                  <button type="button" className="cx-btn is-sm is-danger" disabled={busy} onClick={() => confirm(p, "CANCELLED")}><XCircle aria-hidden="true" />{t("Cancel")}</button>
                </>}</div></td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </Card>
      <div style={{ height: 16 }} />
      <PackagePrices />
    </>
  )
}

function PackagePrices() {
  const t = useText()
  const locale = useLocale()
  const packages = useApi<Package[]>("/credit-packages")
  const [draft, setDraft] = useState<Record<string, string>>({})
  const { busy, run } = useAction()
  return (
    <Card title={t("Try-on package prices")} description={t("What stores pay for each package. New prices apply to new purchases.")}>
      <div className="cx-packages">
        {(packages.data ?? []).map((p) => {
          const value = draft[p.id] ?? String((p.price_cents ?? 0) / 100)
          return (
            <div key={p.id} className="cx-package">
              <strong>{t("{count} AI try-ons", { count: p.credits })}</strong>
              <div className="cx-input-row"><input className="cx-input" inputMode="decimal" value={value} onChange={(e) => setDraft((d) => ({ ...d, [p.id]: e.target.value }))} aria-label={t("Price (USD)")} /></div>
              <span className="cx-muted cx-small">{t("{price} per try-on", { price: money((Number(value) || 0) / p.credits, locale) })}</span>
              <button type="button" className="cx-btn is-sm" disabled={busy || draft[p.id] === undefined} onClick={() => run(async () => { await send(`/credit-packages/${p.id}`, "PATCH", { priceCents: Math.round((Number(value) || 0) * 100), credits: p.credits }); await packages.mutate(); setDraft((d) => { const n = { ...d }; delete n[p.id]; return n }) }, "Saved")}>{t("Save")}</button>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
