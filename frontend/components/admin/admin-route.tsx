import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { ConsoleApp } from "@/components/console/shell"
import { sectionsFor, type ConsoleKind } from "@/lib/console/sections"
import { dashboardPathForRole, type PlatformRole } from "@/lib/admin/access"

const allowed: Record<ConsoleKind, PlatformRole[]> = { "super-admin": ["SUPER_ADMIN"], brand: ["BRAND_ADMIN"], staff: ["STORE_ADMIN", "STAFF"] }

export function isConsoleSection(kind: ConsoleKind, section: string) {
  return sectionsFor(kind).includes(section)
}

/** Server-side gate: only the right role reaches a console. The client re-checks and the API enforces every call. */
export async function AdminRoute({ kind, section }: { kind: ConsoleKind; section: string }) {
  const backend = process.env.BACKEND_URL
  if (backend) {
    const cookie = (await cookies()).toString()
    let role: PlatformRole | null = null
    try {
      const response = await fetch(`${backend.replace(/\/$/, "")}/api/v1/auth/me`, { headers: { Cookie: cookie }, cache: "no-store", signal: AbortSignal.timeout(5000) })
      if (response.ok) role = (await response.json()).user?.role ?? null
      else if (response.status !== 401) role = "unavailable" as PlatformRole
    } catch { role = "unavailable" as PlatformRole }
    // An expired access cookie is refreshed by the client, so a 401 is left to it.
    if (role && role !== ("unavailable" as PlatformRole) && !allowed[kind].includes(role)) redirect(dashboardPathForRole(role))
  }
  return <ConsoleApp kind={kind} section={section} />
}
