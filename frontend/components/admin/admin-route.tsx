import { redirect } from "next/navigation"
import type { ConsoleKind } from "@/components/admin/admin-shell"
import { BrandAdminLayout } from "@/components/admin/brand-admin-layout"
import { SuperAdminLayout } from "@/components/admin/super-admin-layout"
import { AdminConsole } from "@/components/admin/admin-shell"
import { cookies } from "next/headers"

export async function AdminRoute({ kind, section }: { kind: ConsoleKind; section: string }) {
  if (process.env.NODE_ENV === "production") {
    if (["brand", "admin"].includes(kind) && section === "dashboard") redirect("/brand/products")
    // Open only the connected catalog. Sample dashboard/workflow pages stay gated.
    if (!process.env.BACKEND_URL || section !== "products" || !["brand", "admin"].includes(kind)) redirect("/login")
    const cookie = (await cookies()).toString()
    let authorized = false
    try {
      const response = await fetch(`${process.env.BACKEND_URL.replace(/\/$/, "")}/api/v1/auth/me`, { headers: { Cookie: cookie }, cache: "no-store", signal: AbortSignal.timeout(5000) })
      if (response.ok) authorized = (await response.json()).user?.role === "BRAND_ADMIN"
    } catch { /* Fail closed when the backend is unavailable. */ }
    if (!authorized) redirect("/login")
  }

  if (kind === "super-admin") return <SuperAdminLayout section={section} />
  if (kind === "brand" || kind === "admin") return <BrandAdminLayout section={section} />
  return <AdminConsole kind={kind} section={section} />
}
