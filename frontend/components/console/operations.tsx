"use client"

import { useMemo, useState } from "react"
import { ArrowLeftRight, Boxes, CheckCircle2, Minus, Plus, Receipt, RotateCcw, Search, XCircle } from "lucide-react"
import { useText } from "@/components/marketing-language"
import { formatDate, money, send, useApi, type Branch, type InventoryRow, type Me, type Order, type Product, type Variant } from "@/lib/console/api"
import { matchCode } from "./catalog"
import { ScanBar, ScanDialog } from "./scanner"
import { Card, Empty, ErrorNote, Field, Modal, PageHeader, Segment, Skeletons, Stat, Status, useAction, useLocale, useToast } from "./ui"

type Target = { product: Product; variant: Variant; branchId: string; current: number }

export function Inventory({ me }: { me: Me }) {
  const t = useText()
  const toast = useToast()
  const canAdjust = me.role !== "STAFF"
  const brandWide = me.role === "BRAND_ADMIN"
  const rows = useApi<InventoryRow[]>("/inventory")
  const branches = useApi<Branch[]>("/branches")
  const products = useApi<Product[]>(brandWide ? "/admin/products" : "/products")
  const [query, setQuery] = useState("")
  const [branch, setBranch] = useState("all")
  const [lowOnly, setLowOnly] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [target, setTarget] = useState<Target | null>(null)
  const [transfer, setTransfer] = useState<InventoryRow | null>(null)
  const { busy, run } = useAction()

  const list = useMemo(() => (rows.data ?? []).filter((r) => {
    if (branch !== "all" && r.branch_id !== branch) return false
    if (lowOnly && r.quantity - r.blocked > 3) return false
    const q = query.trim().toLowerCase()
    return !q || [r.product, r.sku, r.barcode, r.size, r.color].some((x) => x?.toLowerCase().includes(q))
  }), [rows.data, branch, lowOnly, query])
  const units = (rows.data ?? []).reduce((sum, r) => sum + r.quantity - r.blocked, 0)
  const low = (rows.data ?? []).filter((r) => r.quantity - r.blocked <= 3).length
  const defaultBranch = me.branchId || (branch !== "all" ? branch : branches.data?.[0]?.id) || ""

  function openFor(product: Product, variant: Variant, branchId = defaultBranch) {
    const current = (rows.data ?? []).find((r) => r.variant_id === variant.id && r.branch_id === branchId)
    setTarget({ product, variant, branchId, current: current ? current.quantity - current.blocked : 0 })
  }

  function handleCode(code: string) {
    setScanning(false)
    const hit = matchCode(products.data ?? [], code)
    if (!hit) { toast(t("No product has this code. Add it in Products first."), true); return }
    const variant = hit.variant ?? (hit.product.variants.length === 1 ? hit.product.variants[0] : undefined)
    if (!variant) { toast(t("Scan the barcode of a specific size and color, or pick it in the table."), true); setQuery(hit.product.sku); return }
    if (!canAdjust) { setQuery(variant.sku); return }
    openFor(hit.product, variant)
  }

  async function adjust(row: InventoryRow, delta: number) {
    await run(async () => { await send("/inventory/adjust", "POST", { variantId: row.variant_id, branchId: row.branch_id, delta }); await rows.mutate() }, delta > 0 ? "Stock added" : "Stock reduced")
  }

  return (
    <>
      <PageHeader eyebrow={t("Warehouse")} title={t("Inventory")} description={t("Receive deliveries by scanning, correct counts and move stock between branches.")} />
      <div className="cx-stats">
        <Stat index={0} tone="hero" icon={Boxes} label={t("Units in stock")} value={rows.data ? units : undefined} note={t("{count} variants", { count: rows.data?.length ?? 0 })} />
        <Stat index={1} tone={low ? "warn" : undefined} icon={Minus} label={t("Low stock")} value={rows.data ? low : undefined} note={t("Variants with 3 or fewer")} />
      </div>
      {canAdjust && <ScanBar onCode={handleCode} onCamera={() => setScanning(true)} title="Receive stock" text="Scan an item to add it to stock. Unknown items are added in Products." placeholder="Barcode or SKU" button="Scan with camera" />}
      <div className="cx-toolbar">
        <label className="cx-search"><Search aria-hidden="true" /><input className="cx-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("Search by name, SKU or barcode")} aria-label={t("Search")} /></label>
        {brandWide && (branches.data?.length ?? 0) > 1 && <select className="cx-select" style={{ width: "auto" }} value={branch} onChange={(e) => setBranch(e.target.value)} aria-label={t("Branch")}><option value="all">{t("All branches")}</option>{branches.data!.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>}
        <Segment label={t("Filter")} value={lowOnly ? "low" : "all"} onChange={(v) => setLowOnly(v === "low")} options={[{ value: "all", label: t("All") }, { value: "low", label: t("Low stock") }]} />
      </div>
      <ErrorNote error={rows.error} />
      {!rows.data && !rows.error ? <Skeletons /> : !list.length ? (
        <div className="cx-card"><Empty icon={Boxes} title={t("No stock records")} text={t("Stock appears after the first delivery is received.")} /></div>
      ) : (
        <div className="cx-card cx-table-wrap">
          <table className="cx-table">
            <thead><tr><th>{t("Product")}</th><th>{t("Size")} / {t("Color")}</th><th>SKU</th><th>{t("Branch")}</th><th className="is-num">{t("Available")}</th>{canAdjust && <th className="is-num">{t("Actions")}</th>}</tr></thead>
            <tbody>{list.map((r, i) => {
              const available = r.quantity - r.blocked
              return (
                <tr key={`${r.branch_id}-${r.variant_id}`} style={{ animationDelay: `${Math.min(i, 15) * 25}ms` }}>
                  <td className="cx-strong">{r.product}</td><td>{r.size} · {r.color}</td><td className="cx-mono cx-muted">{r.sku}</td><td>{r.branch}</td>
                  <td className="is-num"><span className={`cx-badge${available <= 0 ? " is-bad" : available <= 3 ? " is-warn" : " is-good"}`}>{available}</span></td>
                  {canAdjust && <td><div className="cx-row-actions">
                    <button type="button" className="cx-btn is-sm is-icon" disabled={busy || available <= 0} onClick={() => adjust(r, -1)} aria-label={t("Remove one")}><Minus aria-hidden="true" /></button>
                    <button type="button" className="cx-btn is-sm is-icon" disabled={busy} onClick={() => adjust(r, 1)} aria-label={t("Add one")}><Plus aria-hidden="true" /></button>
                    <button type="button" className="cx-btn is-sm" onClick={() => { const p = products.data?.find((x) => x.variants.some((v) => v.id === r.variant_id)); const v = p?.variants.find((x) => x.id === r.variant_id); if (p && v) openFor(p, v, r.branch_id) }}>{t("Count")}</button>
                    {brandWide && (branches.data?.length ?? 0) > 1 && <button type="button" className="cx-btn is-sm is-icon" onClick={() => setTransfer(r)} aria-label={t("Transfer")} title={t("Transfer")}><ArrowLeftRight aria-hidden="true" /></button>}
                  </div></td>}
                </tr>
              )
            })}</tbody>
          </table>
        </div>
      )}
      {scanning && <ScanDialog title={t("Scan to receive stock")} onCode={handleCode} onClose={() => setScanning(false)} />}
      {target && <ReceiveDialog target={target} branches={brandWide ? branches.data ?? [] : []} onClose={() => setTarget(null)} onDone={() => { setTarget(null); void rows.mutate() }} />}
      {transfer && <TransferDialog row={transfer} branches={branches.data ?? []} onClose={() => setTransfer(null)} onDone={() => { setTransfer(null); void rows.mutate() }} />}
    </>
  )
}

function ReceiveDialog({ target, branches, onClose, onDone }: { target: Target; branches: Branch[]; onClose: () => void; onDone: () => void }) {
  const t = useText()
  const [qty, setQty] = useState(1)
  const [branchId, setBranchId] = useState(target.branchId)
  const [mode, setMode] = useState<"add" | "remove">("add")
  const { busy, run } = useAction()
  const submit = () => run(async () => { await send("/inventory/adjust", "POST", { variantId: target.variant.id, branchId, delta: mode === "add" ? qty : -qty }); onDone() }, mode === "add" ? "Stock added" : "Stock reduced")
  return (
    <Modal title={target.product.name} onClose={onClose} footer={<><button type="button" className="cx-btn" onClick={onClose}>{t("Cancel")}</button><button type="button" className="cx-btn is-primary" disabled={busy || !branchId || qty < 1} onClick={submit}>{mode === "add" ? t("Add {count} to stock", { count: qty }) : t("Remove {count}", { count: qty })}</button></>}>
      <div className="cx-images">
        {target.product.image && <span className="cx-image-box"><img src={target.product.image} alt="" /></span>}
        <dl className="cx-kv" style={{ flex: 1 }}><dt>{t("Size")}</dt><dd>{target.variant.size}</dd><dt>{t("Color")}</dt><dd>{target.variant.color}</dd><dt>SKU</dt><dd className="cx-mono">{target.variant.sku}</dd><dt>{t("Now in stock")}</dt><dd className="cx-strong">{target.current}</dd></dl>
      </div>
      {branches.length > 1 && <Field label={t("Branch")}><select className="cx-select" value={branchId} onChange={(e) => setBranchId(e.target.value)}>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>}
      <Segment label={t("Operation")} value={mode} onChange={setMode} options={[{ value: "add", label: t("Receive") }, { value: "remove", label: t("Write off") }]} />
      <Field label={t("Quantity")}>
        <div className="cx-input-row">
          <button type="button" className="cx-btn is-big is-icon" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label={t("Remove one")}><Minus aria-hidden="true" /></button>
          <input className="cx-input" style={{ minHeight: 52, fontSize: 22, fontWeight: 800, textAlign: "center" }} type="number" min={1} max={100000} value={qty} onChange={(e) => setQty(Math.max(1, Math.min(100000, Number(e.target.value) || 1)))} autoFocus />
          <button type="button" className="cx-btn is-big is-icon" onClick={() => setQty((q) => q + 1)} aria-label={t("Add one")}><Plus aria-hidden="true" /></button>
        </div>
      </Field>
    </Modal>
  )
}

function TransferDialog({ row, branches, onClose, onDone }: { row: InventoryRow; branches: Branch[]; onClose: () => void; onDone: () => void }) {
  const t = useText()
  const others = branches.filter((b) => b.id !== row.branch_id)
  const [to, setTo] = useState(others[0]?.id ?? "")
  const [qty, setQty] = useState(1)
  const { busy, run } = useAction()
  const max = row.quantity - row.blocked
  return (
    <Modal title={t("Transfer stock")} onClose={onClose} footer={<><button type="button" className="cx-btn" onClick={onClose}>{t("Cancel")}</button><button type="button" className="cx-btn is-primary" disabled={busy || !to || qty < 1 || qty > max} onClick={() => run(async () => { await send("/inventory/transfers", "POST", { variantId: row.variant_id, fromBranchId: row.branch_id, toBranchId: to, qty }); onDone() }, "Stock transferred")}><ArrowLeftRight aria-hidden="true" />{t("Transfer")}</button></>}>
      <p className="cx-note">{row.product} · {row.size} · {row.color} — {t("{count} available at {branch}", { count: max, branch: row.branch })}</p>
      <Field label={t("To branch")}><select className="cx-select" value={to} onChange={(e) => setTo(e.target.value)}>{others.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
      <Field label={t("Quantity")}><input className="cx-input" type="number" min={1} max={max} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} /></Field>
    </Modal>
  )
}

export function Orders({ me }: { me: Me }) {
  const t = useText()
  const locale = useLocale()
  const orders = useApi<Order[]>("/orders", { refreshInterval: 30000 })
  const products = useApi<Product[]>(me.role === "BRAND_ADMIN" ? "/admin/products" : "/products")
  const branches = useApi<Branch[]>("/branches")
  const [filter, setFilter] = useState("SENT_TO_CASHIER")
  const { busy, run } = useAction()
  const variantName = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of products.data ?? []) for (const v of p.variants) if (v.id) map.set(v.id, `${p.name} · ${v.size} · ${v.color}`)
    return map
  }, [products.data])
  const branchName = useMemo(() => new Map((branches.data ?? []).map((b) => [b.id, b.name])), [branches.data])
  const list = (orders.data ?? []).filter((o) => filter === "all" || o.status === filter)
  const total = (o: Order) => (o.items ?? []).reduce((s, i) => s + i.qty * i.price_cents, 0) / 100
  const waiting = (orders.data ?? []).filter((o) => o.status === "SENT_TO_CASHIER")
  const sold = (orders.data ?? []).filter((o) => o.status === "COMPLETED")
  const setStatus = (o: Order, status: string) => run(async () => { await send(`/orders/${o.id}`, "PATCH", { status }); await orders.mutate() }, status === "COMPLETED" ? "Marked as sold" : status === "CANCELLED" ? "Order cancelled" : "Order reopened")

  return (
    <>
      <PageHeader eyebrow={t("Cashier")} title={t("Orders")} description={t("Requests sent from the smart mirror. Mark them sold or cancelled at the cashier.")} />
      <div className="cx-stats">
        <Stat index={0} tone="hero" icon={Receipt} label={t("Waiting at cashier")} value={orders.data ? waiting.length : undefined} note={money(waiting.reduce((s, o) => s + total(o), 0), locale)} />
        <Stat index={1} tone="good" icon={CheckCircle2} label={t("Sold")} value={orders.data ? sold.reduce((s, o) => s + total(o), 0) : undefined} format={(n) => money(n, locale)} note={t("{count} completed orders", { count: sold.length })} />
      </div>
      <div className="cx-toolbar"><Segment label={t("Status")} value={filter} onChange={setFilter} options={[{ value: "SENT_TO_CASHIER", label: t("At cashier") }, { value: "COMPLETED", label: t("Sold") }, { value: "CANCELLED", label: t("Cancelled") }, { value: "all", label: t("All") }]} /></div>
      <ErrorNote error={orders.error} />
      {!orders.data && !orders.error ? <Skeletons /> : !list.length ? (
        <div className="cx-card"><Empty icon={Receipt} title={t("No orders here")} text={t("Requests appear when a customer sends their cart to the cashier from the mirror.")} /></div>
      ) : (
        <div className="cx-card cx-table-wrap">
          <table className="cx-table">
            <thead><tr><th>{t("Date")}</th><th>{t("Branch")}</th><th>{t("Items")}</th><th className="is-num">{t("Total")}</th><th>{t("Status")}</th><th className="is-num">{t("Actions")}</th></tr></thead>
            <tbody>{list.map((o) => (
              <tr key={o.id}>
                <td className="cx-small">{formatDate(o.created_at, locale)}</td>
                <td>{branchName.get(o.branch_id) ?? "—"}</td>
                <td>{(o.items ?? []).map((i) => <div key={i.variant_id} className="cx-small">{variantName.get(i.variant_id) ?? t("Product")} × {i.qty}</div>)}</td>
                <td className="is-num cx-strong">{money(total(o), locale)}</td>
                <td><Status value={o.status} /></td>
                <td><div className="cx-row-actions">
                  {o.status === "SENT_TO_CASHIER" ? <>
                    <button type="button" className="cx-btn is-sm is-primary" disabled={busy} onClick={() => setStatus(o, "COMPLETED")}><CheckCircle2 aria-hidden="true" />{t("Sold")}</button>
                    <button type="button" className="cx-btn is-sm is-danger" disabled={busy} onClick={() => setStatus(o, "CANCELLED")}><XCircle aria-hidden="true" />{t("Cancel")}</button>
                  </> : <button type="button" className="cx-btn is-sm" disabled={busy} onClick={() => setStatus(o, "SENT_TO_CASHIER")}><RotateCcw aria-hidden="true" />{t("Reopen")}</button>}
                </div></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      <Card title={t("How it works")}><p className="cx-muted" style={{ margin: 0 }}>{t("Marking an order sold records the sale in statistics and takes the items out of branch stock. Cancelling a sale puts them back.")}</p></Card>
    </>
  )
}
