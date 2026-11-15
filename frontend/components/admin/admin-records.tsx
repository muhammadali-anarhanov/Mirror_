"use client"

import { useEffect, useMemo, useState, type FormEvent } from "react"
import {
  ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Download, MoreHorizontal,
  Plus, Search, SlidersHorizontal, UploadCloud,
} from "lucide-react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ADMIN_DEMO_RECORDS as DEMO_RECORDS, ADMIN_SECTION_DEFINITIONS as SECTION_DEFINITIONS } from "@/lib/admin/admin-catalog"
import type { AdminRecord, FormField } from "@/lib/admin/demo-data"
import Image from "next/image"
import { apiFetch } from "@/lib/api"
import { catalogEnabled, loadProducts, persistProduct, productRecord, type APIProduct } from "@/lib/admin/product-api"

type SortDirection = "asc" | "desc"

function statusVariant(value: string) {
  const normalized = value.toLowerCase()
  if (["active", "online", "success", "in stock", "published", "ready", "received", "approved", "demo connected", "demo ready"].includes(normalized)) return "active"
  if (["trial", "low stock", "review", "pending", "pending review", "in transit", "scheduled", "processing"].includes(normalized)) return "warning"
  if (["suspended", "inactive", "offline", "out of stock", "unavailable", "expired", "cancelled", "rejected", "blocked", "archived"].includes(normalized)) return "quiet"
  return "neutral"
}

function rowValue(row: AdminRecord, key: string) {
  return row[key] === undefined || row[key] === "" ? "—" : String(row[key])
}

function formatCell(row: AdminRecord, key: string) {
  if (key === "status" || key === "result" || key === "aiStatus") {
    const value = rowValue(row, key)
    return <Badge className={`mirror-admin-status-badge is-${statusVariant(value)}`}>{value}</Badge>
  }
  if (key === "name" && typeof row.image === "string") {
    return <span className="mirror-admin-product-cell"><Image src={row.image} alt="" width={38} height={38} /><strong>{rowValue(row, key)}</strong></span>
  }
  if (key === "price") {
    const price = Number(row.price)
    const oldPrice = Number(row.oldPrice ?? row.salePrice ?? 0)
    return <span className="mirror-admin-sale-price">{oldPrice > price && <del>${oldPrice.toLocaleString()}</del>}<strong>${price.toLocaleString()}</strong></span>
  }
  if (key === "variants") return <span className="mirror-admin-variant-cell">{rowValue(row, key).split("\n").slice(0, 2).join(" · ")}</span>
  if (["stock", "stores", "devices", "products", "order", "available", "blocked", "quantity", "branches", "sessions"].includes(key)) {
    return <span className="mirror-admin-number">{Number(row[key] ?? 0).toLocaleString()}</span>
  }
  if (key === "role" || key === "type" || key === "sku" || key === "deviceId" || key === "transferId") return <span className="mirror-admin-mono">{rowValue(row, key)}</span>
  return rowValue(row, key)
}

function csvEscape(value: unknown) {
  const text = String(value ?? "")
  return `"${text.replaceAll('"', '""')}"`
}

function scopedDemoRows(section: string, scopeMode: "all" | "brand" | "store") {
  const rows = DEMO_RECORDS[section] ?? []
  if (scopeMode === "all") return rows
  if (scopeMode === "brand") {
    if (section === "products" || section === "inventory" || section === "brand-branches" || section === "brand-devices") return rows
    if (section === "staff") return rows.filter((row) => String(row.email ?? "").endsWith("@maisonlune.example"))
    return rows
  }
  if (section === "products") return rows.filter((row) => row.branch === "Le Marais" || row.branch === "All branches")
  if (section === "inventory") return rows.filter((row) => row.branch === "Le Marais")
  if (section === "brand-branches") return rows.filter((row) => row.name === "Le Marais")
  if (section === "brand-devices") return rows.filter((row) => row.branch === "Le Marais")
  if (section === "brand-notifications") return rows.filter((row) => row.audience === "Le Marais")
  if (section === "transfers") return rows.filter((row) => row.source === "Le Marais" || row.destination === "Le Marais")
  if (section === "stores") return rows.filter((row) => String(row.name ?? "").includes("Le Marais"))
  if (section === "users") return rows.filter((row) => row.scope === "Le Marais")
  if (section === "devices") return rows.filter((row) => row.store === "Le Marais")
  if (section === "staff") return rows.filter((row) => row.branch === "Le Marais" || row.store === "Le Marais")
  return rows
}

export function AdminRecords({ section, searchTerm, readOnly = false, scopeMode = "all" }: { section: string; searchTerm: string; readOnly?: boolean; scopeMode?: "all" | "brand" | "store" }) {
  const definition = SECTION_DEFINITIONS[section]
  const isReadOnly = Boolean(readOnly || definition.readOnly)
  const [rows, setRows] = useState<AdminRecord[]>(() => catalogEnabled && section === "products" ? [] : scopedDemoRows(section, scopeMode))
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [tableQuery, setTableQuery] = useState("")
  const [sortKey, setSortKey] = useState(definition.columns[0]?.key ?? "")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<AdminRecord | null>(null)
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState("")
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [detailRecord, setDetailRecord] = useState<AdminRecord | null>(null)
  const [deleteRecord, setDeleteRecord] = useState<AdminRecord | null>(null)
  const [pendingSave, setPendingSave] = useState<{ record: AdminRecord; isNew: boolean } | null>(null)
  const [feedback, setFeedback] = useState("")
  const [liveProducts, setLiveProducts] = useState<APIProduct[] | null>(null)
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const liveCatalog = catalogEnabled && section === "products"
  async function refreshProducts() {
    const products = await loadProducts()
    setLiveProducts(products)
    setRows(products.map(productRecord))
  }
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const pageSize = 5

  useEffect(() => {
    return () => imagePreviews.forEach((preview) => {
      if (preview.startsWith("blob:")) URL.revokeObjectURL(preview)
    })
  }, [imagePreviews])

  useEffect(() => {
    setRows(catalogEnabled && section === "products" ? [] : scopedDemoRows(section, scopeMode))
    setPage(1)
    setFilters({})
    setSelectedIds([])
    setLiveProducts(null)
    if (catalogEnabled && section === "products") void refreshProducts().catch(error => setFeedback(String(error)))
  }, [section, scopeMode])

  useEffect(() => {
    setPage(1)
  }, [searchTerm, tableQuery, filters])

  const filterDefinitions = definition.filters ?? (() => {
    const key = rows.some((row) => row.status !== undefined) ? "status" : "result"
    const options = [...new Set(rows.map((row) => String(row[key] ?? "")).filter(Boolean))]
    return options.length ? [{ key, label: "All statuses", options }] : []
  })()

  const filteredRows = useMemo(() => {
    const term = `${searchTerm} ${tableQuery}`.trim().toLowerCase()
    return rows.filter((row) => {
      const matchesSearch = !term || Object.values(row).some((value) => String(value).toLowerCase().includes(term))
      const matchesFilters = filterDefinitions.every((filterDefinition) => !filters[filterDefinition.key] || String(row[filterDefinition.key] ?? "") === filters[filterDefinition.key])
      return matchesSearch && matchesFilters
    }).sort((left, right) => {
      const a = left[sortKey]
      const b = right[sortKey]
      const comparison = typeof a === "number" && typeof b === "number" ? a - b : String(a ?? "").localeCompare(String(b ?? ""))
      return sortDirection === "asc" ? comparison : -comparison
    })
  }, [rows, searchTerm, tableQuery, filters, filterDefinitions, sortKey, sortDirection])

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize))
  const visibleRows = filteredRows.slice((page - 1) * pageSize, page * pageSize)
  const selectedRows = filteredRows.filter((row) => selectedIds.includes(row.id))
  const allVisibleSelected = visibleRows.length > 0 && visibleRows.every((row) => selectedIds.includes(row.id))
  const someVisibleSelected = visibleRows.some((row) => selectedIds.includes(row.id))

  function toggleVisibleSelection(checked: boolean) {
    const visibleIds = visibleRows.map((row) => row.id)
    setSelectedIds((current) => checked ? [...new Set([...current, ...visibleIds])] : current.filter((id) => !visibleIds.includes(id)))
  }

  function openCreate() {
    setImageFiles([])
    if (!definition.fields || isReadOnly) return
    setEditing(null)
    setFormValues(Object.fromEntries(definition.fields.map((field) => [field.key, field.options?.[0] ?? ""])))
    setImagePreviews([])
    setFormError("")
    setFeedback("")
    setFormOpen(true)
  }

  function openEdit(row: AdminRecord) {
    setImageFiles([])
    if (!definition.fields || isReadOnly) return
    setEditing(row)
    setFormValues(Object.fromEntries(definition.fields.map((field) => [field.key, String(row[field.key] ?? "")])) )
    setImagePreviews([])
    setFormError("")
    setFeedback("")
    setFormOpen(true)
  }

  function saveRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (section === "products") {
      const currentPrice = Number(formValues.price)
      const oldPrice = Number(formValues.oldPrice)
      if (formValues.oldPrice && oldPrice <= currentPrice) {
        setFormError("Old price must be greater than the current selling price.")
        return
      }
    }
    if (section === "campaigns" && formValues.start && formValues.end && formValues.end < formValues.start) {
      setFormError("The end date must be on or after the start date.")
      return
    }
    const converted = Object.fromEntries(Object.entries(formValues).map(([key, value]) => {
      const field = definition.fields?.find((item) => item.key === key)
      return [key, field?.type === "number" ? Number(value) : value]
    })) as Record<string, string | number>
    const isNew = !editing
    const nextRecord: AdminRecord = { ...(editing ?? {}), ...converted, id: editing?.id ?? `${section}-${crypto.randomUUID()}` }
    setImagePreviews([])
    const sensitiveFields = ["role", "status", "scope", "store", "brand", "permissions"]
    const changedSensitiveField = Boolean(editing && sensitiveFields.some((key) => editing[key] !== nextRecord[key]))
    const sensitiveCreation = isNew && ["brands", "stores", "users", "subscriptions", "devices", "staff", "brand-branches", "brand-devices"].includes(section)
    if (changedSensitiveField || sensitiveCreation) {
      setPendingSave({ record: nextRecord, isNew })
      setFormOpen(false)
      return
    }
    commitRecord(nextRecord, isNew)
  }

  async function commitRecord(record: AdminRecord, isNew: boolean) {
    if (liveCatalog) {
      if (!liveProducts) { setFeedback("Live catalog has not loaded. No changes were saved."); return }
      try {
        await persistProduct(record, isNew ? undefined : liveProducts.find(p => p.id === record.id), imageFiles)
        await refreshProducts(); setImageFiles([]); setFormOpen(false)
        setFeedback("Product saved to the backend. Branch stock is managed separately through inventory.")
      } catch (error) { setFeedback(String(error)); await refreshProducts().catch(() => {}) }
      return
    }
    if (isNew) {
      setRows((current) => [record, ...current])
      setFeedback("Record added to this demo session only.")
    } else {
      setRows((current) => current.map((row) => row.id === record.id ? record : row))
      setFeedback("Record updated in this demo session only.")
    }
  }

  function confirmPendingSave() {
    if (!pendingSave) return
    commitRecord(pendingSave.record, pendingSave.isNew)
    setPendingSave(null)
  }

  async function removeRecord() {
    if (!deleteRecord) return
    if (liveCatalog) {
      if (!liveProducts) { setFeedback("Live catalog has not loaded."); return }
      const response = await apiFetch(`/products/${deleteRecord.id}`, { method: "DELETE" })
      if (!response.ok) { setFeedback("Product removal failed."); return }
      await refreshProducts(); setDeleteRecord(null); setFeedback("Product archived; image deletion queued."); return
    }
    setRows((current) => current.filter((row) => row.id !== deleteRecord.id))
    setSelectedIds((current) => current.filter((id) => id !== deleteRecord.id))
    setDeleteRecord(null)
    setFeedback("Record removed from this demo session only.")
  }

  function requestStatusChange(row: AdminRecord, status: string) {
    setPendingSave({ record: { ...row, status }, isNew: false })
  }

  function markRead(row: AdminRecord) {
    setRows((current) => current.map((item) => item.id === row.id ? { ...item, status: "Read" } : item))
    setFeedback("Notification marked as read in this demo session.")
  }

  function exportCsv(records = filteredRows) {
    const headers = definition.columns.map((column) => column.label)
    const values = records.map((row) => definition.columns.map((column) => csvEscape(row[column.key])).join(","))
    const csv = [headers.map(csvEscape).join(","), ...values].join("\n")
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `mirror-${section}-demo.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  function toggleSort(key: string) {
    if (sortKey === key) setSortDirection((direction) => direction === "asc" ? "desc" : "asc")
    else { setSortKey(key); setSortDirection("asc") }
    setPage(1)
  }

  function renderField(field: FormField) {
    return (
      <Field key={field.key} data-invalid={field.key === "oldPrice" && Boolean(formError)}>
        <FieldLabel htmlFor={`record-${field.key}`}>{field.label}</FieldLabel>
        {field.options ? (
          <select
            id={`record-${field.key}`}
            className="mirror-admin-native-select"
            required={field.required}
            value={formValues[field.key] ?? ""}
            onChange={(event) => setFormValues((current) => ({ ...current, [field.key]: event.target.value }))}
          >
            {field.options.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        ) : field.multiline ? (
          <textarea
            id={`record-${field.key}`}
            className="mirror-admin-native-textarea"
            rows={3}
            required={field.required}
            value={formValues[field.key] ?? ""}
            onChange={(event) => setFormValues((current) => ({ ...current, [field.key]: event.target.value }))}
          />
        ) : (
          <Input
            id={`record-${field.key}`}
            type={field.type ?? "text"}
            min={field.type === "number" ? field.key === "price" ? 0.01 : 0 : undefined}
            step={field.type === "number" ? "any" : undefined}
            required={field.required}
            aria-invalid={field.key === "oldPrice" && Boolean(formError)}
            aria-describedby={field.key === "oldPrice" && formError ? "sale-price-error" : undefined}
            value={formValues[field.key] ?? ""}
            onChange={(event) => setFormValues((current) => ({ ...current, [field.key]: event.target.value }))}
          />
        )}
      </Field>
    )
  }

  if (!definition || definition.integrationPending) {
    return (
      <Card className="mirror-admin-pending-inline">
        <CardHeader><div className="mirror-admin-section-icon"><Download aria-hidden="true" /></div><CardTitle>{definition?.title ?? "Data"} API connection pending</CardTitle></CardHeader>
        <CardContent><p>Orders and checkout endpoints are not present in this frontend checkout. This page shows no sample orders and does not invent payment or purchase activity.</p><Badge variant="outline">Not connected</Badge></CardContent>
      </Card>
    )
  }

  return (
    <section className="mirror-admin-section">
      <div className="mirror-admin-section-heading">
        <div><span className="mirror-admin-eyebrow">MANAGEMENT</span><h1>{definition.title}</h1><p>{definition.description}</p></div>
        <div className="mirror-admin-section-actions">
          <Button variant="outline" onClick={() => exportCsv()}><Download data-icon="inline-start" />Export CSV</Button>
          {definition.addLabel && !isReadOnly && <Button onClick={openCreate}><Plus data-icon="inline-start" />{definition.addLabel}</Button>}
        </div>
      </div>

      <Card className="mirror-admin-data-card">
        <CardHeader className="mirror-admin-data-card-header">
          <div><CardTitle>{definition.title} directory</CardTitle><p>{filteredRows.length} records in the preview dataset</p></div>
          <div className="mirror-admin-table-controls">
            <label className="mirror-admin-table-search"><Search aria-hidden="true" /><Input aria-label={`Search ${definition.title}`} placeholder="Filter records" value={tableQuery} onChange={(event) => setTableQuery(event.target.value)} /></label>
            {filterDefinitions.map((filterDefinition) => (
              <div className="mirror-admin-filter-control" key={filterDefinition.key}><SlidersHorizontal aria-hidden="true" /><Select value={filters[filterDefinition.key] || "all"} onValueChange={(value) => { setFilters((current) => ({ ...current, [filterDefinition.key]: value === "all" ? "" : value ?? "" })); setPage(1) }}>
                <SelectTrigger aria-label={`Filter ${definition.title} by ${filterDefinition.key}`}><SelectValue /></SelectTrigger>
                <SelectContent><SelectGroup>
                  <SelectItem value="all">{filterDefinition.label}</SelectItem>
                  {filterDefinition.options.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
                </SelectGroup></SelectContent>
              </Select></div>
            ))}
          </div>
        </CardHeader>
        <CardContent className="mirror-admin-table-content">
          {feedback && <p className="mirror-admin-action-feedback" role="status">{feedback}</p>}
          {selectedRows.length > 0 && <div className="mirror-admin-bulk-toolbar" role="status"><strong>{selectedRows.length} selected</strong><Button variant="outline" size="sm" onClick={() => exportCsv(selectedRows)}><Download data-icon="inline-start" />Export selected</Button><Button variant="ghost" size="sm" onClick={() => setSelectedIds([])}>Clear selection</Button></div>}
          <Table>
            <TableHeader><TableRow>
              <TableHead className="mirror-admin-select-head"><Checkbox checked={allVisibleSelected} aria-label={someVisibleSelected && !allVisibleSelected ? "Select all visible records, some already selected" : "Select all visible records"} onCheckedChange={(checked) => toggleVisibleSelection(checked === true)} /></TableHead>
              {definition.columns.map((column) => <TableHead key={column.key} aria-sort={sortKey === column.key ? sortDirection === "asc" ? "ascending" : "descending" : "none"}>
                <Button variant="ghost" size="sm" className="mirror-admin-sort-button" onClick={() => toggleSort(column.key)}>{column.label}{sortKey === column.key ? sortDirection === "asc" ? <ArrowUp aria-hidden="true" /> : <ArrowDown aria-hidden="true" /> : null}</Button>
              </TableHead>)}
              <TableHead className="mirror-admin-actions-head"><span className="sr-only">Actions</span></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {visibleRows.map((row) => <TableRow key={row.id}>
                <TableCell className="mirror-admin-select-cell"><Checkbox aria-label={`Select ${rowValue(row, definition.columns[0]?.key ?? "record")}`} checked={selectedIds.includes(row.id)} onCheckedChange={(checked) => setSelectedIds((current) => checked ? [...new Set([...current, row.id])] : current.filter((id) => id !== row.id))} /></TableCell>
                {definition.columns.map((column) => <TableCell key={column.key}>{formatCell(row, column.key)}</TableCell>)}
                <TableCell className="mirror-admin-row-actions">
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${rowValue(row, definition.columns[0]?.key ?? "name")}`} />}><MoreHorizontal aria-hidden="true" /></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setDetailRecord(row)}>View details</DropdownMenuItem>
                      {!isReadOnly && section === "applications" && row.status === "Pending review" && <><DropdownMenuSeparator /><DropdownMenuItem onClick={() => requestStatusChange(row, "Approved")}>Approve application</DropdownMenuItem><DropdownMenuItem onClick={() => requestStatusChange(row, "Rejected")}>Reject application</DropdownMenuItem></>}
                      {!isReadOnly && section === "brands" && row.status !== "Active" && <DropdownMenuItem onClick={() => requestStatusChange(row, "Active")}>Activate brand</DropdownMenuItem>}
                      {!isReadOnly && section === "brands" && row.status !== "Suspended" && <DropdownMenuItem onClick={() => requestStatusChange(row, "Suspended")}>Suspend brand</DropdownMenuItem>}
                      {!isReadOnly && (section === "notifications" || section === "brand-notifications") && row.status === "Unread" && <DropdownMenuItem onClick={() => markRead(row)}>Mark as read</DropdownMenuItem>}
                      {!isReadOnly && section === "campaigns" && row.status !== "Archived" && <DropdownMenuItem onClick={() => requestStatusChange(row, "Archived")}>Archive campaign</DropdownMenuItem>}
                      {!isReadOnly && <DropdownMenuItem onClick={() => openEdit(row)}>Edit</DropdownMenuItem>}
                      {!isReadOnly && <DropdownMenuSeparator />}
                      {!isReadOnly && <DropdownMenuItem variant="destructive" onClick={() => setDeleteRecord(row)}>Delete</DropdownMenuItem>}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>)}
              {visibleRows.length === 0 && <TableRow><TableCell colSpan={definition.columns.length + 2} className="mirror-admin-empty-cell"><div className="mirror-admin-empty-state"><Search aria-hidden="true" /><strong>No matching records</strong><span>Try a different search or filter.</span></div></TableCell></TableRow>}
            </TableBody>
          </Table>
          <div className="mirror-admin-table-footer"><span>Showing {filteredRows.length === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredRows.length)} of {filteredRows.length}</span><div><Button variant="outline" size="sm" aria-label="Previous page" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}><ChevronLeft aria-hidden="true" />Previous</Button><span className="mirror-admin-page-count">Page {page} of {pageCount}</span><Button variant="outline" size="sm" aria-label="Next page" disabled={page >= pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>Next<ChevronRight aria-hidden="true" /></Button></div></div>
        </CardContent>
      </Card>

      {section === "inventory" && <Card className="mirror-admin-data-card"><CardHeader><div><CardTitle>Inventory history</CardTitle><p>Illustrative receipts and stock adjustments for this workspace.</p></div></CardHeader><CardContent className="mirror-admin-table-content"><div className="mirror-admin-workflow-table"><table><thead><tr><th>Activity</th><th>Product variant</th><th>Branch</th><th>Quantity</th><th>Date</th><th>Updated by</th></tr></thead><tbody>{[
        { id: "ih-01", action: "Stock received", product: "Linen relaxed blazer · S / Oat", branch: "Le Marais", quantity: "+10", date: "Nov 09, 2026 · 11:28", actor: "Lea Dubois" },
        { id: "ih-02", action: "Transfer sent", product: "Cotton poplin shirt · S / Sky", branch: "Lyon Presqu’île", quantity: "−4", date: "Nov 08, 2026 · 15:42", actor: "Camille Moreau" },
        { id: "ih-03", action: "Stock blocked", product: "Draped evening dress · M / Midnight", branch: "Le Marais", quantity: "−2", date: "Nov 07, 2026 · 10:05", actor: "Amira Laurent" },
      ].filter((entry) => scopeMode !== "store" || entry.branch === "Le Marais").map((entry) => <tr key={entry.id}><td>{entry.action}</td><td>{entry.product}</td><td>{entry.branch}</td><td>{entry.quantity}</td><td>{entry.date}</td><td>{entry.actor}</td></tr>)}</tbody></table></div></CardContent></Card>}

      <Dialog open={formOpen} onOpenChange={(open) => { setFormOpen(open); if (!open) setImagePreviews([]) }}>
        <DialogContent className="mirror-admin-form-dialog">
          <DialogHeader><DialogTitle>{editing ? `Edit ${definition.title.toLowerCase().replace(/s$/, "")}` : definition.addLabel}</DialogTitle><DialogDescription>Changes in this preview stay in memory and are not sent to a backend.</DialogDescription></DialogHeader>
          <form onSubmit={saveRecord} className="mirror-admin-record-form">
            <FieldGroup className="mirror-admin-field-grid">{definition.fields?.map(renderField)}</FieldGroup>
            {["brands", "stores", "products", "categories", "campaigns"].includes(section) && <Field><FieldLabel htmlFor="record-image">{section === "brands" ? "Brand logo" : section === "stores" ? "Store logo" : section === "categories" ? "Category image" : section === "campaigns" ? "Campaign image" : "Product images"}</FieldLabel><Input id="record-image" type="file" accept="image/*" multiple={section === "products"} onChange={(event) => { const files = Array.from(event.target.files ?? []); setImageFiles(files); setImagePreviews(files.map((file) => URL.createObjectURL(file))) }} /><p className="mirror-admin-field-note"><UploadCloud aria-hidden="true" /> {liveCatalog ? "Selected images will be approved for public catalog access when saved." : "Local preview only; image upload API is pending."}</p>{imagePreviews.map((preview, index) => <img key={preview} className="mirror-admin-upload-preview" src={preview} alt={`Selected ${section === "products" ? "product" : "record"} image ${index + 1}`} />)}</Field>}
            {formError && <p id="sale-price-error" className="mirror-admin-form-error" role="alert">{formError}</p>}
            <DialogFooter><Button type="button" variant="outline" onClick={() => { setFormOpen(false); setImagePreviews([]) }}>Cancel</Button><Button type="submit">Save in preview</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(detailRecord)} onOpenChange={(open) => !open && setDetailRecord(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{detailRecord ? rowValue(detailRecord, definition.columns[0]?.key ?? "name") : "Record details"}</DialogTitle><DialogDescription>Illustrative record · preview only</DialogDescription></DialogHeader>
          {detailRecord && <dl className="mirror-admin-detail-list">{(definition.fields ?? definition.columns).map((field) => <div key={field.key}><dt>{field.label}</dt><dd>{rowValue(detailRecord, field.key)}</dd></div>)}</dl>}
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(pendingSave)} onOpenChange={(open) => !open && setPendingSave(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>{pendingSave?.isNew ? "Create this account or resource?" : "Confirm this sensitive change?"}</AlertDialogTitle><AlertDialogDescription>This action affects access or an administrative resource. In this preview it changes only illustrative data in memory; no backend request is made.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmPendingSave}>Confirm change</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(deleteRecord)} onOpenChange={(open) => !open && setDeleteRecord(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete this record?</AlertDialogTitle><AlertDialogDescription>This removes the illustrative row from this browser session only. No production data is changed.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={removeRecord}>Delete record</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
