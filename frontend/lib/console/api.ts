"use client"

// Typed access to the Go API for the admin consoles. Every screen reads live
// data; nothing here is sample or demo data.
import useSWR, { type SWRConfiguration } from "swr"
import { apiFetch } from "@/lib/api"

export type Role = "SUPER_ADMIN" | "BRAND_ADMIN" | "STORE_ADMIN" | "STAFF"
export type Me = { id: string; tenantId: string; branchId: string; email: string; role: Role; status: string }

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) { super(message); this.status = status }
}

export async function api<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiFetch(path, init)
  const text = await response.text()
  let data: unknown = null
  try { data = text ? JSON.parse(text) : null } catch { /* non-JSON error page */ }
  if (!response.ok) {
    const message = (data as { error?: string } | null)?.error || `Request failed (${response.status})`
    throw new ApiError(message, response.status)
  }
  return data as T
}

export function send<T = unknown>(path: string, method: string, body?: unknown) {
  return api<T>(path, { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) })
}

/** Adds ?tenantId= for Super Admin requests made on behalf of one brand. */
export function scoped(path: string, tenantId?: string) {
  if (!tenantId) return path
  return `${path}${path.includes("?") ? "&" : "?"}tenantId=${encodeURIComponent(tenantId)}`
}

export function useApi<T>(path: string | null, config?: SWRConfiguration<T>) {
  return useSWR<T>(path, (key: string) => api<T>(key), { revalidateOnFocus: false, ...config })
}

export const CATEGORIES = ["Top Body", "Full Body", "Head", "Pants", "Footwear"] as const
export const CATEGORY_LABEL: Record<string, string> = { "Top Body": "Tops", "Full Body": "Full body", Head: "Headwear", Pants: "Pants", Footwear: "Footwear" }
export const PRODUCT_STATUSES = ["Published", "Draft", "Blocked", "Archived"] as const

export type Variant = { id?: string; size: string; color: string; sku: string; barcode?: string; inStock?: boolean }
export type Product = {
  id: string; name: string; description: string; category: string; price: number; originalPrice?: number
  sku: string; barcode: string; status: string; image: string; stock: number; variants: Variant[]
}
export type Branch = { id: string; tenant_id: string; name: string; address: string; status: string }
export type Device = { id: string; tenant_id: string; branch_id: string; name: string; status: string; last_seen: string | null; configuration: Record<string, unknown> }
export type ConsoleUser = { id: string; email: string; role: Role; branchId: string | null; status: string }
export type InventoryRow = { tenant_id: string; branch_id: string; variant_id: string; quantity: number; blocked: number; sku: string; barcode: string; size: string; color: string; product: string; branch: string }
export type OrderItem = { order_id: string; product_id: string; variant_id: string; qty: number; price_cents: number }
export type Order = { id: string; tenant_id: string; user_id: string; branch_id: string; status: string; created_at: string; items: OrderItem[] | null }
export type Plan = { id: string; name: string; price_cents: number; branch_limit: number; device_limit: number; monthly_tryons: number }
export type Subscription = { tenant_id: string; plan_id: string; status: string; period_start: string; period_end: string; expires_at: string; used: number; extra_credits: number; plan: Plan }
export type Brand = { id: string; name: string; status: string; created_at: string; planId: string | null; subscriptionStatus: string | null; expiresAt: string | null; used: number | null; extraCredits: number | null; branches: number; users: number; products: number; devices: number }
export type Application = { id: string; status: string; created_at: string; payload: { applicationType: string; companyName: string; contactName: string; email: string; phone?: string; country?: string; website?: string; requestedBranches?: number | null; message?: string } }
export type AuditLog = { id: string; tenant_id: string | null; actor_id: string | null; actor: string; action: string; details: Record<string, unknown>; created_at: string }
export type Notice = { id: string; tenant_id: string; branch_id: string | null; title: string; read_at: string | null; created_at: string }
export type SeriesPoint = { date: string; fittings: number; orders: number; value?: number; applications?: number }
export type Analytics = {
  days: number; tryonSessions: number; fittingsTotal: number; activeBranches: number; branches: number; activeDevices: number; devices: number
  cashierRequests: number; ordersTotal: number; completedOrders: number; orderValue: number; completedValue: number; unitsRequested: number
  products: number; publishedProducts: number; inventoryUnits: number; lowStock: number; series: SeriesPoint[]
  topProducts: { id: string; name: string; fittings: number }[]; topOrdered: { id: string; name: string; units: number }[]
  branchBreakdown: { id: string; name: string; fittings: number; orders: number }[]
}
export type PlatformStats = {
  days: number; brands: number; activeBrands: number; suspendedBrands: number; branches: number; devices: number; onlineDevices: number
  users: number; products: number; applications: number; newApplications: number; applicationsByStatus: Record<string, number>
  fittings: number; orders: number; mrr: number; plans: { id: string; name: string; brands: number }[]; series: SeriesPoint[]
  topBrands: { id: string; name: string; fittings: number }[]
}

export const isOnline = (device: Device) => Boolean(device.last_seen && Date.now() - Date.parse(device.last_seen) < 5 * 60 * 1000)

export function money(value: number, locale = "en-US") {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "USD", maximumFractionDigits: value % 1 ? 2 : 0 }).format(value)
}

export function formatDate(value: string | null | undefined, locale = "en-US", withTime = true) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  // Numeric dates read the same in every interface language (e.g. 19.11.2026, 14:05).
  return new Intl.DateTimeFormat(locale.startsWith("en") ? "en-GB" : locale, { day: "2-digit", month: "2-digit", year: "numeric", ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}) }).format(date)
}

/** A short random password admins can hand over once; 16 chars from an unambiguous alphabet. */
export function generatePassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789"
  const bytes = new Uint32Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("")
}

/** SKU-safe slug: "Olive Cotton Shirt" -> "OLIVE-COTTON-SHIRT". */
export function skuPart(value: string, max = 24) {
  return value.normalize("NFKD").replace(/[^\w\s-]/g, "").trim().toUpperCase().replace(/[\s_]+/g, "-").replace(/-+/g, "-").slice(0, max) || "ITEM"
}
