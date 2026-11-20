"use client"

import { useMemo, useRef, useState, type KeyboardEvent } from "react"
import { Camera, ImagePlus, Package, Plus, Save, Search, ScanLine, Trash2, X } from "lucide-react"
import { useText } from "@/components/marketing-language"
import { apiFetch } from "@/lib/api"
import {
  ApiError, CATEGORIES, CATEGORY_LABEL, PRODUCT_STATUSES, api, money, send, skuPart, useApi,
  type Branch, type Me, type Product, type Variant,
} from "@/lib/console/api"
import { ScanBar, ScanDialog } from "./scanner"
import { Empty, ErrorNote, Field, Modal, PageHeader, Segment, Skeletons, Status, useLocale, useToast } from "./ui"

const SIZE_PRESETS = [["XS", "S", "M", "L", "XL", "XXL"], ["38", "39", "40", "41", "42", "43", "44"], ["One size"]]
const COLOR_PRESETS = ["Black", "White", "Navy", "Blue", "Grey", "Beige", "Olive", "Brown", "Red"]

export function matchCode(products: Product[], code: string) {
  const c = code.trim().toLowerCase()
  for (const p of products) {
    if (p.barcode?.toLowerCase() === c || p.sku.toLowerCase() === c) return { product: p, variant: undefined as Variant | undefined }
    const v = p.variants.find((x) => x.barcode?.toLowerCase() === c || x.sku.toLowerCase() === c)
    if (v) return { product: p, variant: v }
  }
  return null
}

export function Products({ me }: { me: Me }) {
  const t = useText()
  const locale = useLocale()
  const toast = useToast()
  const editable = me.role === "BRAND_ADMIN"
  const { data, error, mutate } = useApi<Product[]>(editable ? "/admin/products" : "/products")
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("all")
  const [status, setStatus] = useState("active")
  const [editing, setEditing] = useState<{ product?: Product; barcode?: string } | null>(null)
  const [viewing, setViewing] = useState<Product | null>(null)
  const [scanning, setScanning] = useState(false)

  const list = useMemo(() => (data ?? []).filter((p) => {
    if (category !== "all" && p.category !== category) return false
    if (status === "active" && p.status === "Archived") return false
    if (status !== "active" && status !== "all" && p.status !== status) return false
    const q = query.trim().toLowerCase()
    return !q || [p.name, p.sku, p.barcode, ...p.variants.flatMap((v) => [v.sku, v.barcode ?? ""])].some((x) => x?.toLowerCase().includes(q))
  }), [data, category, status, query])

  function handleCode(code: string) {
    setScanning(false)
    const hit = matchCode(data ?? [], code)
    if (hit) { if (editable) setEditing({ product: hit.product }); else setViewing(hit.product); toast(t("Found: {name}", { name: hit.product.name })); return }
    if (editable) { setEditing({ barcode: code }); toast(t("New code. Fill in the name and price to add the product.")) }
    else toast(t("No product has this code."), true)
  }

  return (
    <>
      <PageHeader eyebrow={t("Catalog")} title={t("Products")} description={editable ? t("Scan a barcode or add a product. Name, price, photos, sizes and stock are edited in one place.") : t("Scan or search to check a product, its price and sizes.")}>
        {editable && <button type="button" className="cx-btn is-primary is-big" onClick={() => setEditing({})}><Plus aria-hidden="true" />{t("Add product")}</button>}
      </PageHeader>
      <ScanBar onCode={handleCode} onCamera={() => setScanning(true)} title="Scan to add or find" text="Use the phone camera or a USB scanner. Unknown codes open a new product." placeholder="Barcode or SKU" button="Scan with camera" />
      <div className="cx-toolbar">
        <label className="cx-search"><Search aria-hidden="true" /><input className="cx-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("Search by name, SKU or barcode")} aria-label={t("Search")} /></label>
        <Segment label={t("Category")} value={category} onChange={setCategory} options={[{ value: "all", label: t("All") }, ...CATEGORIES.map((c) => ({ value: c, label: t(CATEGORY_LABEL[c]) }))]} />
        {editable && <select className="cx-select" style={{ width: "auto" }} value={status} onChange={(e) => setStatus(e.target.value)} aria-label={t("Status")}>
          <option value="active">{t("Not archived")}</option><option value="all">{t("All")}</option>
          {PRODUCT_STATUSES.map((s) => <option key={s} value={s}>{t(s)}</option>)}
        </select>}
      </div>
      <ErrorNote error={error} />
      {!data && !error ? <Skeletons count={8} /> : list.length === 0 ? (
        <div className="cx-card"><Empty icon={Package} title={t("No products found")} text={editable ? t("Add the first product or scan its barcode.") : t("Try another search.")}>{editable && <button type="button" className="cx-btn is-primary" onClick={() => setEditing({})}><Plus aria-hidden="true" />{t("Add product")}</button>}</Empty></div>
      ) : (
        <div className="cx-products">
          {list.map((p, i) => (
            <button type="button" key={p.id} className="cx-product" style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }} onClick={() => editable ? setEditing({ product: p }) : setViewing(p)}>
              <Status value={p.status} />
              <span className="cx-product-img">{p.image ? <img src={p.image} alt="" loading="lazy" /> : <Package aria-hidden="true" />}</span>
              <span className="cx-product-body">
                <strong title={p.name}>{p.name}</strong>
                <span className="cx-muted cx-small">{t(CATEGORY_LABEL[p.category] ?? p.category)} · {p.sku}</span>
                <span className="cx-product-meta"><span className="cx-price">{money(p.price, locale)}{p.originalPrice ? <del>{money(p.originalPrice, locale)}</del> : null}</span><span className={`cx-badge${p.stock > 0 ? " is-good" : " is-muted"}`}>{t("{count} in stock", { count: p.stock })}</span></span>
              </span>
            </button>
          ))}
        </div>
      )}
      {scanning && <ScanDialog title={t("Scan a barcode")} onCode={handleCode} onClose={() => setScanning(false)} />}
      {editing && <ProductEditor product={editing.product} barcode={editing.barcode} onClose={() => setEditing(null)} onSaved={() => { void mutate() }} />}
      {viewing && <ProductView product={viewing} onClose={() => setViewing(null)} />}
    </>
  )
}

function ProductView({ product, onClose }: { product: Product; onClose: () => void }) {
  const t = useText()
  const locale = useLocale()
  return (
    <Modal title={product.name} onClose={onClose}>
      <div className="cx-images"><span className="cx-image-box">{product.image ? <img src={product.image} alt="" /> : <Package aria-hidden="true" />}</span>
        <dl className="cx-kv" style={{ flex: 1 }}>
          <dt>{t("Price")}</dt><dd className="cx-price">{money(product.price, locale)}</dd>
          <dt>{t("Category")}</dt><dd>{t(CATEGORY_LABEL[product.category] ?? product.category)}</dd>
          <dt>SKU</dt><dd className="cx-mono">{product.sku}</dd>
          {product.barcode && <><dt>{t("Barcode")}</dt><dd className="cx-mono">{product.barcode}</dd></>}
        </dl>
      </div>
      <table className="cx-table"><thead><tr><th>{t("Size")}</th><th>{t("Color")}</th><th>SKU</th><th>{t("Available")}</th></tr></thead>
        <tbody>{product.variants.map((v) => <tr key={v.id ?? v.sku}><td>{v.size}</td><td>{v.color}</td><td className="cx-mono">{v.sku}</td><td>{v.inStock ? <span className="cx-badge is-good">{t("Yes")}</span> : <span className="cx-badge is-muted">{t("No")}</span>}</td></tr>)}</tbody></table>
    </Modal>
  )
}

function Chips({ values, onChange, placeholder, presets }: { values: string[]; onChange: (v: string[]) => void; placeholder: string; presets: string[][] }) {
  const t = useText()
  const [draft, setDraft] = useState("")
  const add = (raw: string) => {
    const next = raw.split(",").map((v) => v.trim()).filter((v) => v && !values.some((x) => x.toLowerCase() === v.toLowerCase()))
    if (next.length) onChange([...values, ...next])
    setDraft("")
  }
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(draft) }
    else if (e.key === "Backspace" && !draft && values.length) onChange(values.slice(0, -1))
  }
  return (
    <>
      <div className="cx-chips">
        {values.map((v) => <span key={v} className="cx-chip">{v}<button type="button" onClick={() => onChange(values.filter((x) => x !== v))} aria-label={t("Remove {name}", { name: v })}><X aria-hidden="true" /></button></span>)}
        <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={onKey} onBlur={() => draft && add(draft)} placeholder={t(placeholder)} aria-label={t(placeholder)} />
      </div>
      <div className="cx-quick">{presets.map((group) => <button key={group.join()} type="button" onClick={() => add(group.join(","))}>+ {group.length > 3 ? `${group[0]}–${group[group.length - 1]}` : group.join(", ")}</button>)}</div>
    </>
  )
}

type Row = Variant & { add: number }

/** Shrinks phone photos to fit the 5 MB JPEG/PNG upload limit. */
async function prepareImage(file: File): Promise<File> {
  if ((file.type === "image/png" || file.type === "image/jpeg") && file.size <= 4.5 * 1024 * 1024) return file
  const bitmap = await createImageBitmap(file).catch(() => null)
  if (!bitmap) throw new Error("This image format is not supported. Use a JPEG or PNG photo.")
  const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement("canvas")
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext("2d")!
  ctx.fillStyle = "#fff"
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88))
  if (!blob) throw new Error("The photo could not be prepared.")
  return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" })
}

export function ProductEditor({ product, barcode, onClose, onSaved }: { product?: Product; barcode?: string; onClose: () => void; onSaved: () => void }) {
  const t = useText()
  const toast = useToast()
  const branches = useApi<Branch[]>("/branches")
  const [name, setName] = useState(product?.name ?? "")
  const [description, setDescription] = useState(product?.description ?? "")
  const [category, setCategory] = useState(product?.category ?? "Top Body")
  const [price, setPrice] = useState(product ? String(product.price) : "")
  const [oldPrice, setOldPrice] = useState(product?.originalPrice ? String(product.originalPrice) : "")
  const [status, setStatus] = useState(product?.status ?? "Published")
  const [sku, setSku] = useState(product?.sku ?? "")
  const skuTouched = useRef(Boolean(product))
  const [code, setCode] = useState(product?.barcode ?? barcode ?? "")
  const [sizes, setSizes] = useState<string[]>(() => [...new Set(product?.variants.map((v) => v.size) ?? [])])
  const [colors, setColors] = useState<string[]>(() => [...new Set(product?.variants.map((v) => v.color) ?? [])])
  const [extra, setExtra] = useState<Record<string, { barcode?: string; add?: number }>>({})
  const [branch, setBranch] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [scanFor, setScanFor] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const fileInput = useRef<HTMLInputElement>(null)
  const cameraInput = useRef<HTMLInputElement>(null)
  const branchId = branch || branches.data?.[0]?.id || ""
  const baseSku = sku.trim() || skuPart(name || "ITEM")

  const rows: Row[] = useMemo(() => {
    const s = sizes.length ? sizes : ["One size"]
    const c = colors.length ? colors : ["Standard"]
    return s.flatMap((size) => c.map((color) => {
      const prior = product?.variants.find((v) => v.size.toLowerCase() === size.toLowerCase() && v.color.toLowerCase() === color.toLowerCase())
      const key = `${size}|${color}`
      return { id: prior?.id, size, color, sku: prior?.sku ?? `${baseSku}-${skuPart(size, 10)}-${skuPart(color, 12)}`, barcode: extra[key]?.barcode ?? prior?.barcode ?? "", add: extra[key]?.add ?? 0 }
    }))
  }, [sizes, colors, product, baseSku, extra])

  const setRow = (row: Row, patch: { barcode?: string; add?: number }) => setExtra((all) => ({ ...all, [`${row.size}|${row.color}`]: { ...all[`${row.size}|${row.color}`], ...patch } }))

  async function addFiles(list: FileList | null) {
    if (!list) return
    try { const prepared = await Promise.all([...list].map(prepareImage)); setFiles((f) => [...f, ...prepared].slice(-4)) }
    catch (e) { toast(e instanceof Error ? e.message : "Image error", true) }
  }

  async function save() {
    setError("")
    const priceValue = Number(price.replace(",", "."))
    const oldValue = oldPrice.trim() ? Number(oldPrice.replace(",", ".")) : undefined
    if (!name.trim()) return setError("Enter the product name.")
    if (!Number.isFinite(priceValue) || priceValue < 0) return setError("Enter a valid price.")
    if (oldValue !== undefined && (!Number.isFinite(oldValue) || oldValue <= priceValue)) return setError("The old price must be higher than the price.")
    if (rows.length > 100) return setError("Too many size and color combinations (maximum 100).")
    setBusy(true)
    try {
      const payload = {
        name: name.trim(), description: description.trim(), category, price: Math.round(priceValue * 100) / 100,
        ...(oldValue !== undefined ? { originalPrice: Math.round(oldValue * 100) / 100 } : {}),
        sku: baseSku, barcode: code.trim(), status,
        variants: rows.map((r) => ({ ...(r.id ? { id: r.id } : {}), size: r.size, color: r.color, sku: r.sku, barcode: r.barcode?.trim() ?? "", inStock: false })),
      }
      let saved: Product
      try { saved = await send<Product>(product ? `/products/${product.id}` : "/products", product ? "PUT" : "POST", payload) }
      catch (e) { throw e instanceof ApiError && e.status === 409 ? new Error("This SKU or barcode is already used by another product.") : e }
      for (const file of files) {
        const body = new FormData(); body.append("file", file); body.append("approved", "true")
        const response = await apiFetch(`/products/${saved.id}/images`, { method: "POST", body })
        if (!response.ok) throw new Error("The product was saved, but a photo could not be uploaded. Open it again to retry.")
      }
      const stock = rows.filter((r) => r.add > 0)
      if (stock.length && !branchId) throw new Error("The product was saved. Create a branch first to add stock.")
      for (const r of stock) {
        const variant = saved.variants.find((v) => v.sku === r.sku)
        if (variant?.id) await send("/inventory/adjust", "POST", { variantId: variant.id, branchId, delta: r.add })
      }
      toast(product ? t("Saved") : t("Product added"))
      onSaved()
      onClose()
    } catch (e) { setError(e instanceof Error ? e.message : "Save failed") }
    finally { setBusy(false) }
  }

  async function archive() {
    if (!product || !window.confirm(t("Archive this product? It disappears from the mirror; its photos are deleted."))) return
    setBusy(true)
    try { await api(`/products/${product.id}`, { method: "DELETE" }); toast(t("Product archived")); onSaved(); onClose() }
    catch (e) { setError(e instanceof Error ? e.message : "Failed") }
    finally { setBusy(false) }
  }

  return (
    <Modal drawer title={product ? t("Edit product") : t("New product")} onClose={onClose} footer={<>
      {product && <button type="button" className="cx-btn is-danger" onClick={archive} disabled={busy} style={{ marginInlineEnd: "auto" }}><Trash2 aria-hidden="true" />{t("Archive")}</button>}
      <button type="button" className="cx-btn" onClick={onClose}>{t("Cancel")}</button>
      <button type="button" className="cx-btn is-primary" onClick={save} disabled={busy}><Save aria-hidden="true" />{busy ? t("Saving…") : t("Save")}</button>
    </>}>
      {error && <ErrorNote error={error} />}
      <p className="cx-section-title">{t("Photo")}</p>
      <div className="cx-images">
        {product?.image && !files.length && <span className="cx-image-box"><img src={product.image} alt="" /><span className="cx-badge">{t("Current")}</span></span>}
        {files.map((file, i) => <span key={i} className="cx-image-box"><img src={URL.createObjectURL(file)} alt="" /><span className="cx-badge is-good">{t("New")}</span></span>)}
        <button type="button" className="cx-drop" onClick={() => cameraInput.current?.click()}><Camera aria-hidden="true" />{t("Take photo")}</button>
        <button type="button" className="cx-drop" onClick={() => fileInput.current?.click()}><ImagePlus aria-hidden="true" />{t("Upload")}</button>
        <input ref={cameraInput} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { void addFiles(e.target.files); e.target.value = "" }} />
        <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/*" multiple hidden onChange={(e) => { void addFiles(e.target.files); e.target.value = "" }} />
      </div>
      <small className="cx-muted">{t("A garment on a plain background works best for AI try-on. The newest photo is shown on the mirror.")}</small>

      <p className="cx-section-title">{t("Main details")}</p>
      <Field label={t("Name")}><input className="cx-input" value={name} onChange={(e) => { setName(e.target.value); if (!skuTouched.current) setSku("") }} placeholder={t("For example: Olive cotton overshirt")} autoFocus /></Field>
      <div className="cx-grid-3">
        <Field label={t("Price (USD)")}><input className="cx-input" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" /></Field>
        <Field label={t("Old price")} hint={t("Optional, shown crossed out")}><input className="cx-input" inputMode="decimal" value={oldPrice} onChange={(e) => setOldPrice(e.target.value)} placeholder="—" /></Field>
        <Field label={t("Status")}><select className="cx-select" value={status} onChange={(e) => setStatus(e.target.value)}>{PRODUCT_STATUSES.filter((s) => s !== "Archived" || product).map((s) => <option key={s} value={s}>{t(s)}</option>)}</select></Field>
      </div>
      <Field label={t("Category")}><Segment label={t("Category")} value={category} onChange={setCategory} options={CATEGORIES.map((c) => ({ value: c, label: t(CATEGORY_LABEL[c]) }))} /></Field>
      <div className="cx-grid-2">
        <Field label={t("Barcode")}><div className="cx-input-row"><input className="cx-input cx-mono" value={code} onChange={(e) => setCode(e.target.value)} placeholder="4780000000000" /><button type="button" className="cx-btn is-icon" onClick={() => setScanFor("product")} aria-label={t("Scan with camera")}><ScanLine aria-hidden="true" /></button></div></Field>
        <Field label="SKU" hint={t("Created from the name if left empty")}><input className="cx-input cx-mono" value={sku} onChange={(e) => { skuTouched.current = true; setSku(e.target.value.toUpperCase()) }} placeholder={baseSku} /></Field>
      </div>
      <Field label={t("Description")}><textarea className="cx-textarea" value={description} onChange={(e) => setDescription(e.target.value)} /></Field>

      <p className="cx-section-title">{t("Sizes and colors")}</p>
      <Field label={t("Sizes")}><Chips values={sizes} onChange={setSizes} placeholder="Type a size and press Enter" presets={SIZE_PRESETS} /></Field>
      <Field label={t("Colors")}><Chips values={colors} onChange={setColors} placeholder="Type a color and press Enter" presets={[COLOR_PRESETS.slice(0, 3), ...COLOR_PRESETS.slice(3).map((c) => [c])]} /></Field>

      <p className="cx-section-title">{t("Variants and stock")}</p>
      {(branches.data?.length ?? 0) > 1 && <Field label={t("Add stock to branch")}><select className="cx-select" value={branchId} onChange={(e) => setBranch(e.target.value)}>{branches.data!.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>}
      <div className="cx-table-wrap cx-card">
        <table className="cx-table">
          <thead><tr><th>{t("Size")}</th><th>{t("Color")}</th><th>SKU</th><th>{t("Barcode")}</th><th className="is-num">{t("Add to stock")}</th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={`${r.size}|${r.color}`}>
              <td className="cx-strong">{r.size}</td><td>{r.color}</td><td className="cx-mono cx-muted">{r.sku}</td>
              <td><div className="cx-input-row"><input className="cx-input cx-mono" style={{ minHeight: 34, minWidth: 120 }} value={r.barcode ?? ""} onChange={(e) => setRow(r, { barcode: e.target.value })} aria-label={t("Barcode")} /><button type="button" className="cx-btn is-sm is-icon" onClick={() => setScanFor(`${r.size}|${r.color}`)} aria-label={t("Scan with camera")}><ScanLine aria-hidden="true" /></button></div></td>
              <td className="is-num"><input className="cx-input" style={{ minHeight: 34, width: 84, textAlign: "end" }} type="number" min={0} max={100000} value={r.add || ""} placeholder="0" onChange={(e) => setRow(r, { add: Math.max(0, Math.min(100000, Number(e.target.value) || 0)) })} aria-label={t("Add to stock")} /></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {scanFor && <ScanDialog title={t("Scan a barcode")} onClose={() => setScanFor(null)} onCode={(value) => {
        if (scanFor === "product") setCode(value)
        else { const [size, color] = scanFor.split("|"); setExtra((all) => ({ ...all, [scanFor]: { ...all[`${size}|${color}`], barcode: value } })) }
        setScanFor(null)
      }} />}
    </Modal>
  )
}
