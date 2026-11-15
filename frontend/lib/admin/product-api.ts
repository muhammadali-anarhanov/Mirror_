import { apiFetch } from "@/lib/api"
import type { AdminRecord } from "@/lib/admin/demo-data"

export type APIProduct = {
  id: string; name: string; description: string; category: string; price: number; originalPrice?: number;
  sku: string; barcode: string; status: string; image: string; stock: number;
  variants: { id?: string; size: string; color: string; sku: string; barcode?: string; inStock?: boolean }[];
}
export const catalogEnabled = process.env.NEXT_PUBLIC_ENABLE_LIVE_CATALOG === "true"
export function productRecord(p: APIProduct): AdminRecord {
  return { id: p.id, name: p.name, description: p.description, category: ({ "Top Body": "Tops", "Full Body": "Dresses", Head: "Accessories" } as Record<string, string>)[p.category] || p.category, price: p.price, oldPrice: p.originalPrice ?? "", sku: p.sku, barcode: p.barcode, status: p.status, image: p.image,
    variants: p.variants.map(v => `${v.size} · ${v.color} · ${v.sku} · 0`).join("\n"), stock: p.stock, branch: "All branches", aiStatus: p.image ? "Ready" : "Needs image" }
}
export async function loadProducts(): Promise<APIProduct[]> {
  const response = await apiFetch("/admin/products")
  if (!response.ok) throw new Error("Live catalog unavailable. Sign in with a brand administrator account.")
  return response.json()
}
export async function persistProduct(record: AdminRecord, existing?: APIProduct, files: File[] = []) {
  const variants = String(record.variants || "").split("\n").filter(v => v.trim()).map(line => {
    const [size, color, sku] = line.split("·").map(v => v.trim())
    const prior = existing?.variants.find(v => v.sku === sku)
    return { ...(prior?.id ? { id: prior.id } : {}), size, color, sku, barcode: prior?.barcode || "" }
  })
  const categories: Record<string, string> = { Tops: "Top Body", Dresses: "Full Body", Accessories: "Head" }
  const payload = { name: record.name, description: record.description || "", category: categories[String(record.category)] || record.category,
    price: Number(record.price), ...(record.oldPrice ? { originalPrice: Number(record.oldPrice) } : {}), sku: record.sku, barcode: record.barcode || "", status: record.status || "Draft", variants }
  const response = await apiFetch(existing ? `/products/${existing.id}` : "/products", { method: existing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
  const saved = await response.json()
  if (!response.ok) throw new Error(saved.error || "Product save failed")
  for (const file of files) {
    const body = new FormData(); body.append("file", file); body.append("approved", "true")
    const image = await apiFetch(`/products/${saved.id}/images`, { method: "POST", body })
    if (!image.ok) throw new Error("Product was saved, but image upload failed. Edit the saved product to retry.")
  }
}
