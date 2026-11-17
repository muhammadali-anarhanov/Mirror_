"use client"


import { useText } from "@/components/marketing-language";
import { useState, type FormEvent } from "react"
import Image from "next/image"
import { ArrowDownLeft, ArrowUpRight, Barcode, Boxes, Check, Clock3, CreditCard, MapPin, PackageCheck, RotateCcw, Truck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { AdminChart } from "@/components/admin/admin-charts"

type LocaleAware = { kind: "brand" | "super-admin"; searchTerm?: string; branchScope?: string }

const branches = ["Le Marais", "Saint-Germain", "Lyon Presqu’île", "Nice Carré d’Or"]
const variants = [
  { sku: "ML-4102-S-OAT", barcode: "890104410201", product: "Linen relaxed blazer", variant: "S · Oat", image: "/images/admin/linen-blazer.png", stock: 8, branch: "Le Marais" },
  { sku: "NL-2804-S-OLV", barcode: "890104280401", product: "Sculpted midi dress", variant: "S · Olive", image: "/images/admin/midi-dress.png", stock: 5, branch: "Le Marais" },
  { sku: "ML-9021-OS-SND", barcode: "890104902101", product: "Mini crescent bag", variant: "One size · Sand", image: "/images/admin/crescent-bag.png", stock: 14, branch: "Saint-Germain" },
  { sku: "AS-1208-37-ESP", barcode: "890104120801", product: "Soft leather loafer", variant: "37 · Espresso", image: "/images/admin/leather-loafer.png", stock: 0, branch: "Saint-Germain" },
]

type Receipt = { id: string; product: string; variant: string; quantity: number; branch: string; time: string }

export function StockReceiving({ branchScope }: LocaleAware) {
  const t = useText();

  const visibleVariants = branchScope ? variants.filter((variant) => variant.branch === branchScope) : variants
  const variantOptions = visibleVariants.length ? visibleVariants : variants
  const [barcode, setBarcode] = useState("")
  const [selectedSku, setSelectedSku] = useState(variants[0].sku)
  const [branch, setBranch] = useState(branchScope ?? branches[0])
  const [quantity, setQuantity] = useState("12")
  const [scanMessage, setScanMessage] = useState("Enter a barcode or use the simulated scan to find a product variant.")
  const [received, setReceived] = useState<Record<string, number>>({})
  const [feedback, setFeedback] = useState("")
  const [history, setHistory] = useState<Receipt[]>([
    { id: "RCV-2408", product: "Sculpted midi dress", variant: "S · Olive", quantity: 8, branch: "Le Marais", time: "Today, 09:14" },
    { id: "RCV-2407", product: "Mini crescent bag", variant: "One size · Sand", quantity: 5, branch: "Saint-Germain", time: "Yesterday, 16:42" },
    { id: "RCV-2406", product: "Linen relaxed blazer", variant: "S · Oat", quantity: 10, branch: "Le Marais", time: "Nov 09, 11:28" },
  ])
  const selected = variantOptions.find((variant) => variant.sku === selectedSku) ?? variantOptions[0]
  const currentStock = selected.stock + (received[selected.sku] ?? 0)
  const visibleHistory = branchScope ? history.filter((receipt) => receipt.branch === branchScope) : history

  function simulateScan() {
    const code = barcode.trim()
    const match = variantOptions.find((variant) => variant.barcode === code || variant.sku.toLowerCase() === code.toLowerCase()) ?? (code ? undefined : variantOptions[0])
    if (!match) {
      setScanMessage("No sample item matched that barcode or SKU. Check the code and try again.")
      return
    }
    setSelectedSku(match.sku)
    setBarcode(match.barcode)
    setScanMessage(`Simulated scan matched ${match.product} · ${match.variant}.`)
  }

  function submitReceipt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const amount = Number(quantity)
    if (!Number.isInteger(amount) || amount < 1) {
      setFeedback("Enter a whole-number quantity greater than zero.")
      return
    }
    const id = `RCV-${String(2409 + history.length - 3).padStart(4, "0")}`
    setReceived((current) => ({ ...current, [selected.sku]: (current[selected.sku] ?? 0) + amount }))
    setHistory((current) => [{ id, product: selected.product, variant: selected.variant, quantity: amount, branch, time: "Just now" }, ...current])
    setFeedback(`${amount} units received into ${branch}. Demo stock updated in this session only.`)
  }

  return (
    <section className="mirror-admin-section">
      <div className="mirror-admin-section-heading"><div><span className="mirror-admin-eyebrow">{t("INVENTORY OPERATIONS")}</span><h1>{t("Stock receiving")}</h1><p>{t("Match a barcode to a product variant, then confirm its destination and quantity.")}</p></div><Badge variant="outline" className="mirror-admin-demo-pill"><Barcode aria-hidden="true" />{t("Simulated scanner")}</Badge></div>
      <div className="mirror-admin-receive-grid">
        <Card className="mirror-admin-workflow-card">
          <CardHeader><div className="mirror-admin-workflow-heading-icon"><Barcode aria-hidden="true" /></div><CardTitle>{t("Scan or find a variant")}</CardTitle><CardDescription>{t("Barcode input is simulated in this frontend preview.")}</CardDescription></CardHeader>
          <CardContent>
            <div className="mirror-admin-scan-row"><Field className="mirror-admin-scan-field"><FieldLabel htmlFor="receive-barcode">{t("Barcode or SKU")}</FieldLabel><Input id="receive-barcode" value={barcode} onChange={(event) => setBarcode(event.target.value)} placeholder={t("Scan or enter a code")} onKeyDown={(event) => { if (event.key === "Enter" && !event.nativeEvent.isComposing && event.keyCode !== 229) { event.preventDefault(); simulateScan() } }} /></Field><Button type="button" variant="outline" onClick={simulateScan}><Barcode data-icon="inline-start" />{t("Simulate scan")}</Button></div>
            <p className="mirror-admin-workflow-hint" role="status">{t(scanMessage)}</p>
            <label className="mirror-admin-select-field">{t("Product variant")}<select value={selected.sku} onChange={(event) => setSelectedSku(event.target.value)}>{variantOptions.map((variant) => <option key={variant.sku} value={variant.sku}>{variant.product} · {variant.variant}</option>)}</select></label>
            <div className="mirror-admin-product-detail"><Image src={selected.image} alt={selected.product} width={96} height={96} /><div><span className="mirror-admin-eyebrow">{selected.sku}</span><strong>{selected.product}</strong><span>{selected.variant}</span><small><Boxes aria-hidden="true" /> {currentStock}{t("units currently available")}</small></div></div>
            <form onSubmit={submitReceipt} className="mirror-admin-receive-form"><FieldGroup className="mirror-admin-field-grid"><Field><FieldLabel htmlFor="receive-quantity">{t("Quantity received")}</FieldLabel><Input id="receive-quantity" type="number" min="1" step="1" required value={quantity} onChange={(event) => setQuantity(event.target.value)} /></Field><Field><FieldLabel htmlFor="receive-branch">{t("Destination branch")}</FieldLabel><select id="receive-branch" className="mirror-admin-native-select" value={branch} onChange={(event) => setBranch(event.target.value)}>{branches.filter((item) => !branchScope || item === branchScope).map((item) => <option key={item}>{item}</option>)}</select></Field></FieldGroup><Button type="submit"><PackageCheck data-icon="inline-start" />{t("Confirm receipt")}</Button></form>
            {feedback && <p className="mirror-admin-action-feedback" role="status">{t(feedback)}</p>}
          </CardContent>
        </Card>
        <Card className="mirror-admin-receiving-summary"><CardHeader><CardTitle>{t("Receiving guide")}</CardTitle><CardDescription>{t("Follow the same steps your store team uses.")}</CardDescription></CardHeader><CardContent><ol className="mirror-admin-step-list"><li><span>01</span><div><strong>{t("Identify the item")}</strong><small>{t("Scan a barcode or select a size and color variant.")}</small></div></li><li><span>02</span><div><strong>{t("Choose a destination")}</strong><small>{t("Confirm the branch before updating stock.")}</small></div></li><li><span>03</span><div><strong>{t("Confirm units")}</strong><small>{t("Demo inventory updates only for this page session.")}</small></div></li></ol><div className="mirror-admin-guidance-callout"><MapPin aria-hidden="true" /><span>{t("Receiving history and barcode matches are sample data, not synchronized with a POS or WMS.")}</span></div></CardContent></Card>
      </div>
      <Card className="mirror-admin-data-card"><CardHeader><div><CardTitle>{t("Recent receiving history")}</CardTitle><CardDescription>{visibleHistory.length}{t("sample receipts · session changes are temporary")}</CardDescription></div><Button variant="outline" size="sm" onClick={() => setHistory((current) => branchScope ? current.filter((receipt) => receipt.branch !== branchScope) : [])} disabled={!visibleHistory.length}><RotateCcw data-icon="inline-start" />{t("Clear history")}</Button></CardHeader><CardContent className="mirror-admin-table-content"><div className="mirror-admin-workflow-table"><table><thead><tr><th>{t("Receipt")}</th><th>{t("Product / variant")}</th><th>{t("Quantity")}</th><th>{t("Destination")}</th><th>{t("Received")}</th></tr></thead><tbody>{visibleHistory.map((receipt) => <tr key={receipt.id}><td className="mirror-admin-mono">{receipt.id}</td><td><strong>{receipt.product}</strong><small>{receipt.variant}</small></td><td>+{receipt.quantity}</td><td>{receipt.branch}</td><td>{receipt.time}</td></tr>)}{visibleHistory.length === 0 && <tr><td colSpan={5} className="mirror-admin-empty-cell">{t("No receiving activity in this session.")}</td></tr>}</tbody></table></div></CardContent></Card>
    </section>
  )
}

type Transfer = { id: string; product: string; variant: string; from: string; to: string; quantity: number; status: "Draft" | "In transit" | "Received"; date: string }

export function StockTransfers({ branchScope }: LocaleAware) {
  const t = useText();

  const [from, setFrom] = useState(branchScope ?? branches[0])
  const [to, setTo] = useState(branches[1])
  const [sku, setSku] = useState(variants[0].sku)
  const [quantity, setQuantity] = useState("2")
  const [feedback, setFeedback] = useState("")
  const [transfers, setTransfers] = useState<Transfer[]>([
    { id: "TR-2026-018", product: "Linen relaxed blazer", variant: "M · Ink", from: "Le Marais", to: "Saint-Germain", quantity: 2, status: "In transit", date: "Nov 10, 2026" },
    { id: "TR-2026-017", product: "Cotton poplin shirt", variant: "S · Sky", from: "Lyon Presqu’île", to: "Le Marais", quantity: 4, status: "Received", date: "Nov 08, 2026" },
    { id: "TR-2026-016", product: "Mini crescent bag", variant: "One size · Sand", from: "Saint-Germain", to: "Lyon Presqu’île", quantity: 3, status: "Draft", date: "Nov 06, 2026" },
  ])
  const selected = variants.find((variant) => variant.sku === sku) ?? variants[0]
  const visibleTransfers = branchScope ? transfers.filter((transfer) => transfer.from === branchScope || transfer.to === branchScope) : transfers

  function createTransfer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (from === to) {
      setFeedback("Choose a different source and destination branch.")
      return
    }
    const amount = Number(quantity)
    if (!Number.isInteger(amount) || amount < 1) {
      setFeedback("Enter a whole-number quantity greater than zero.")
      return
    }
    const transfer: Transfer = { id: `TR-DEMO-${String(transfers.length + 1).padStart(3, "0")}`, product: selected.product, variant: selected.variant, from, to, quantity: amount, status: "In transit", date: "Just now" }
    setTransfers((current) => [transfer, ...current])
    setFeedback(`Transfer ${transfer.id} created in this demo session. No stock was moved through an API.`)
  }

  return (
    <section className="mirror-admin-section">
      <div className="mirror-admin-section-heading"><div><span className="mirror-admin-eyebrow">{t("INVENTORY OPERATIONS")}</span><h1>{t("Stock transfers")}</h1><p>{t("Move individual variants between branches and track the local demo workflow.")}</p></div><Badge variant="outline" className="mirror-admin-demo-pill"><Truck aria-hidden="true" />{t("Preview only")}</Badge></div>
      <div className="mirror-admin-receive-grid">
        <Card className="mirror-admin-workflow-card"><CardHeader><div className="mirror-admin-workflow-heading-icon"><Truck aria-hidden="true" /></div><CardTitle>{t("Create a transfer")}</CardTitle><CardDescription>{t("Transfer records are held in memory and never sent to an inventory service.")}</CardDescription></CardHeader><CardContent><form onSubmit={createTransfer} className="mirror-admin-transfer-form"><FieldGroup className="mirror-admin-field-grid"><Field><FieldLabel htmlFor="transfer-from">{t("Source branch")}</FieldLabel><select id="transfer-from" className="mirror-admin-native-select" value={from} onChange={(event) => setFrom(event.target.value)}>{branches.filter((item) => !branchScope || item === branchScope).map((item) => <option key={item}>{item}</option>)}</select></Field><Field><FieldLabel htmlFor="transfer-to">{t("Destination branch")}</FieldLabel><select id="transfer-to" className="mirror-admin-native-select" value={to} onChange={(event) => setTo(event.target.value)}>{branches.filter((item) => item !== from).map((item) => <option key={item}>{item}</option>)}</select></Field><Field className="mirror-admin-field-span"><FieldLabel htmlFor="transfer-variant">{t("Product variant")}</FieldLabel><select id="transfer-variant" className="mirror-admin-native-select" value={sku} onChange={(event) => setSku(event.target.value)}>{variants.map((variant) => <option key={variant.sku} value={variant.sku}>{variant.product} · {variant.variant}</option>)}</select></Field><Field><FieldLabel htmlFor="transfer-quantity">{t("Quantity")}</FieldLabel><Input id="transfer-quantity" type="number" min="1" step="1" required value={quantity} onChange={(event) => setQuantity(event.target.value)} /></Field></FieldGroup><div className="mirror-admin-transfer-route"><span><MapPin aria-hidden="true" />{from}</span><ArrowUpRight aria-hidden="true" /><span><MapPin aria-hidden="true" />{to}</span></div><Button type="submit"><Truck data-icon="inline-start" />{t("Create transfer")}</Button></form>{feedback && <p className="mirror-admin-action-feedback" role="status">{t(feedback)}</p>}</CardContent></Card>
        <Card className="mirror-admin-transfer-summary"><CardHeader><CardTitle>{t("Transfer status")}</CardTitle><CardDescription>{t("Update sample shipments as they arrive.")}</CardDescription></CardHeader><CardContent className="mirror-admin-transfer-stats"><div><span>{t("In transit")}</span><strong>{visibleTransfers.filter((item) => item.status === "In transit").length}</strong><Truck aria-hidden="true" /></div><div><span>{t("Received")}</span><strong>{visibleTransfers.filter((item) => item.status === "Received").length}</strong><Check aria-hidden="true" /></div><div><span>{t("Drafts")}</span><strong>{visibleTransfers.filter((item) => item.status === "Draft").length}</strong><Clock3 aria-hidden="true" /></div></CardContent></Card>
      </div>
      <Card className="mirror-admin-data-card"><CardHeader><div><CardTitle>{t("Transfer history")}</CardTitle><CardDescription>{visibleTransfers.length}{t("records · values are illustrative")}</CardDescription></div></CardHeader><CardContent className="mirror-admin-table-content"><div className="mirror-admin-workflow-table"><table><thead><tr><th>{t("Transfer")}</th><th>{t("Product / variant")}</th><th>{t("Route")}</th><th>{t("Quantity")}</th><th>{t("Date")}</th><th>{t("Status")}</th><th><span className="sr-only">{t("Actions")}</span></th></tr></thead><tbody>{visibleTransfers.map((transfer) => <tr key={transfer.id}><td className="mirror-admin-mono">{transfer.id}</td><td><strong>{transfer.product}</strong><small>{transfer.variant}</small></td><td>{transfer.from} <span aria-hidden="true">→</span> {transfer.to}</td><td>{transfer.quantity}</td><td>{transfer.date}</td><td><Badge variant="outline" className={`mirror-admin-status-badge is-${transfer.status === "Received" ? "active" : transfer.status === "In transit" ? "warning" : "neutral"}`}>{t(transfer.status)}</Badge></td><td>{transfer.status === "In transit" && <Button variant="outline" size="sm" onClick={() => setTransfers((current) => current.map((item) => item.id === transfer.id ? { ...item, status: "Received" } : item))}><PackageCheck data-icon="inline-start" />{t("Mark received")}</Button>}</td></tr>)}</tbody></table></div></CardContent></Card>
    </section>
  )
}

export function BrandSubscription({}: LocaleAware) {
  const t = useText();

  const [plan, setPlan] = useState("Studio")
  const [period, setPeriod] = useState("Yearly")
  const [feedback, setFeedback] = useState("")
  const plans = [
    { name: "Starter", description: "For a first fitting-room location", price: "$49", unit: "/ month", branches: "1 branch", mirrors: "2 smart mirrors", sessions: "1,000 try-ons" },
    { name: "Growth", description: "For growing multi-store teams", price: "$149", unit: "/ month", branches: "5 branches", mirrors: "12 smart mirrors", sessions: "10,000 try-ons" },
    { name: "Studio", description: "For established retail brands", price: "$399", unit: "/ month", branches: "20 branches", mirrors: "50 smart mirrors", sessions: "Unlimited try-ons" },
  ]
  function choosePlan(name: string) {
    setPlan(name)
    setFeedback(`${name} selected for preview. No payment method was charged or changed.`)
  }

  return (
    <section className="mirror-admin-section">
      <div className="mirror-admin-section-heading"><div><span className="mirror-admin-eyebrow">{t("BILLING & USAGE")}</span><h1>{t("Subscription")}</h1><p>{t("Plan details and usage indicators are illustrative; payment processing is not connected.")}</p></div><Badge variant="outline" className="mirror-admin-demo-pill"><CreditCard aria-hidden="true" />{t("No payments processed")}</Badge></div>
      <div className="mirror-admin-subscription-top"><Card className="mirror-admin-current-plan"><CardHeader><div><span className="mirror-admin-eyebrow">{t("CURRENT PLAN")}</span><CardTitle>{plan}</CardTitle><CardDescription>{t("Active · renewal preview on December 01, 2026")}</CardDescription></div><Badge variant="outline" className="mirror-admin-status-badge is-active">{t("Active")}</Badge></CardHeader><CardContent><div className="mirror-admin-plan-price"><strong>{plan === "Studio" ? "$399" : plan === "Growth" ? "$149" : "$49"}</strong><span>{t("/ month equivalent")}</span></div><p>{t("Billing period")}</p><div className="mirror-admin-period-toggle"><button type="button" className={period === "Monthly" ? "is-active" : ""} onClick={() => setPeriod("Monthly")}>{t("Monthly")}</button><button type="button" className={period === "Yearly" ? "is-active" : ""} onClick={() => setPeriod("Yearly")}>{t("Yearly · save 15%")}</button></div><div className="mirror-admin-usage-list"><div><span>{t("Branches")}</span><strong>{t("4 of 20")}</strong><div><i style={{ width: "20%" }} /></div></div><div><span>{t("Smart mirrors")}</span><strong>{t("8 of 50")}</strong><div><i style={{ width: "16%" }} /></div></div><div><span>{t("Try-on sessions")}</span><strong>{t("6,842 this month")}</strong><div><i style={{ width: "68%" }} /></div></div></div></CardContent></Card><Card className="mirror-admin-billing-history"><CardHeader><CardTitle>{t("Payment history")}</CardTitle><CardDescription>{t("Sample billing records · no payment data source")}</CardDescription></CardHeader><CardContent><div className="mirror-admin-billing-row"><span><strong>{t("Studio plan")}</strong><small>{t("Nov 01, 2026 · INV-2026-1101")}</small></span><strong>$399.00</strong><Badge variant="outline" className="is-muted">{t("Preview")}</Badge></div><div className="mirror-admin-billing-row"><span><strong>{t("Studio plan")}</strong><small>{t("Oct 01, 2026 · INV-2026-1001")}</small></span><strong>$399.00</strong><Badge variant="outline" className="is-muted">{t("Preview")}</Badge></div><div className="mirror-admin-billing-row"><span><strong>{t("Growth plan")}</strong><small>{t("Sep 01, 2026 · INV-2026-0901")}</small></span><strong>$149.00</strong><Badge variant="outline" className="is-muted">{t("Preview")}</Badge></div></CardContent></Card></div>
      <div className="mirror-admin-plan-grid">{plans.map((item) => <Card key={item.name} className={`mirror-admin-plan-card${item.name === plan ? " is-current" : ""}`}><CardHeader><div><CardTitle>{item.name}</CardTitle><CardDescription>{t(item.description)}</CardDescription></div>{item.name === plan && <Badge variant="outline" className="is-active">{t("Current")}</Badge>}</CardHeader><CardContent><div className="mirror-admin-plan-price"><strong>{item.price}</strong><span>{item.unit}</span></div><ul><li>{item.branches}</li><li>{item.mirrors}</li><li>{item.sessions}</li></ul><Button variant={item.name === plan ? "outline" : "default"} disabled={item.name === plan} onClick={() => choosePlan(item.name)}>{item.name === plan ? t("Current plan") : item.name === "Starter" ? t("Downgrade preview") : t("Choose plan")}</Button></CardContent></Card>)}</div>
      {feedback && <p className="mirror-admin-action-feedback" role="status">{t(feedback)}</p>}
      <p className="mirror-admin-demo-footnote"><CreditCard aria-hidden="true" />{t("Plan changes only update this preview. No checkout, payment, or subscription API is connected.")}</p>
    </section>
  )
}

export function IntegrationsPanel({}: LocaleAware) {
  const t = useText();

  const [states, setStates] = useState(["Demo connected", "Not connected", "Demo ready", "Not connected", "Not connected"])
  const cards = [
    { name: "Retail POS", category: "Point of sale", description: "Catalog and checkout event mapping for store systems.", icon: CreditCard },
    { name: "Inventory / WMS", category: "Warehouse", description: "Product variants, available stock and receiving flows.", icon: Boxes },
    { name: "Barcode scanners", category: "Device input", description: "Use simulated barcode input in the receiving workflow.", icon: Barcode },
    { name: "External APIs", category: "Developer tools", description: "Review the expected API surface for future Go integration.", icon: RotateCcw },
    { name: "Webhooks", category: "Events", description: "Preview event delivery concepts for downstream systems.", icon: Truck },
  ]
  return (
    <section className="mirror-admin-section">
      <div className="mirror-admin-section-heading"><div><span className="mirror-admin-eyebrow">{t("CONNECTED WORKSPACE")}</span><h1>{t("Integrations")}</h1><p>{t("Connection states are illustrative. Nothing here connects to a POS, WMS, scanner, API or webhook service.")}</p></div><Badge variant="outline" className="mirror-admin-demo-pill">{t("Demo statuses only")}</Badge></div>
      <div className="mirror-admin-integrations-grid">{cards.map((item, index) => {
        const Icon = item.icon
        const connected = states[index] !== "Not connected"
        return <Card key={item.name} className="mirror-admin-integration-card"><CardHeader><div className="mirror-admin-integration-icon"><Icon aria-hidden="true" /></div><Badge variant="outline" className={`mirror-admin-status-badge is-${connected ? "active" : "neutral"}`}>{t(states[index])}</Badge></CardHeader><CardContent><span className="mirror-admin-eyebrow">{t(item.category)}</span><h2>{item.name}</h2><p>{t(item.description)}</p><Button variant="outline" size="sm" onClick={() => setStates((current) => current.map((status, statusIndex) => statusIndex === index ? status === "Not connected" ? "Demo connected" : "Not connected" : status))}>{connected ? t("Reset demo status") : t("Preview connection")}</Button><small>{t("Preview interaction only · no credentials or network requests")}</small></CardContent></Card>
      })}</div>
    </section>
  )
}

export function AdminAnalytics({ kind, branchScope }: LocaleAware) {
  const t = useText();

  const brandMetrics = [
    { label: "Try-on sessions", value: "18,420", detail: "+18.6% vs. prior period" },
    { label: "Most tried product", value: "Linen relaxed blazer", detail: "1,284 sessions" },
    { label: "Popular category", value: "Dresses", detail: "34% of sessions" },
    { label: "Try-on conversion", value: "14.8%", detail: "Sample session-to-product actions" },
  ]
  const scopedMetrics = [
    { label: "Try-on sessions", value: "2,846", detail: "+12.4% at Le Marais" },
    { label: "Most tried product", value: "Linen relaxed blazer", detail: "284 sessions" },
    { label: "Popular category", value: "Tops", detail: "31% of branch sessions" },
    { label: "Try-on conversion", value: "13.2%", detail: "Sample branch conversion" },
  ]
  const globalMetrics = [
    { label: "Active brands", value: "1,247", detail: "+12.4% this month" },
    { label: "Try-on sessions", value: "842k", detail: "Platform-wide sample" },
    { label: "Active devices", value: "516", detail: "Sample online status" },
    { label: "Avg. sessions / mirror", value: "42", detail: "Last 30 days" },
  ]
  const items = kind === "super-admin" ? globalMetrics : branchScope ? scopedMetrics : brandMetrics
  return (
    <section className="mirror-admin-section">
      <div className="mirror-admin-section-heading"><div><span className="mirror-admin-eyebrow">{t("PERFORMANCE INSIGHTS")}</span><h1>{t("Analytics")}</h1><p>{kind === "super-admin" ? t("Aggregated platform usage only. No brand sales or customer details are shown.") : t("Understand virtual try-on behavior and branch engagement for your brand.")}</p></div><Badge variant="outline" className="mirror-admin-demo-pill">{t("Illustrative analytics")}</Badge></div>
      <div className="mirror-admin-metric-grid is-four">{items.map((item, index) => <Card key={item.label} className={`mirror-admin-analytics-kpi is-accent-${index + 1}`}><CardHeader><CardDescription>{t(item.label)}</CardDescription></CardHeader><CardContent><strong>{item.label === "Most tried product" ? item.value : t(item.value)}</strong><small>{t(item.detail)}</small></CardContent></Card>)}</div>
      <div className="mirror-admin-chart-grid"><AdminChart kind={kind === "super-admin" ? "platform" : "store"} />{kind === "super-admin" ? <AdminChart kind="growth" /> : <AdminChart kind="categories" />}</div>
      <Card className="mirror-admin-data-card"><CardHeader><CardTitle>{kind === "super-admin" ? t("Platform usage by month") : t("Branch comparison")}</CardTitle><CardDescription>{kind === "super-admin" ? t("Aggregate session and registration metrics only.") : t("Try-on sessions and device activity by store.")}</CardDescription></CardHeader><CardContent className="mirror-admin-table-content"><div className="mirror-admin-workflow-table"><table><thead><tr>{(kind === "super-admin" ? ["Month", "Registered brands", "Registered branches", "Try-on sessions"] : ["Branch", "Try-on sessions", "Conversion", "Active mirrors"]).map((heading) => <th key={heading}>{t(heading)}</th>)}</tr></thead><tbody>{kind === "super-admin" ? [["November 2026", "61", "118", "84,200"], ["October 2026", "48", "103", "72,600"], ["September 2026", "52", "91", "69,400"]].map((row) => <tr key={row[0]}>{row.map((value) => <td key={value}>{value}</td>)}</tr>) : (branchScope ? [[branchScope, "2,846", "13.2%", "2"]] : [["Le Marais", "4,260", "14.2%", "3"], ["Saint-Germain", "3,180", "12.8%", "2"], ["Lyon Presqu’île", "2,140", "11.4%", "2"], ["Nice Carré d’Or", "1,820", "15.1%", "1"]]).map((row) => <tr key={row[0]}>{row.map((value) => <td key={value}>{value}</td>)}</tr>)}</tbody></table></div></CardContent></Card>
    </section>
  )
}
