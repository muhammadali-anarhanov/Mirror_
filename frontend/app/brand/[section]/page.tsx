import { notFound } from "next/navigation"
import { AdminRoute } from "@/components/admin/admin-route"
import { ADMIN_SECTION_DEFINITIONS } from "@/lib/admin/admin-catalog"

const brandSections = new Set([
  "dashboard", "products", "stock-receiving", "inventory", "transfers", "branches",
  "devices", "staff", "analytics", "subscription", "notifications", "integrations", "settings",
])

export default async function BrandAdminSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params
  if (!brandSections.has(section) || (section !== "dashboard" && !ADMIN_SECTION_DEFINITIONS[section])) notFound()
  return <AdminRoute kind="brand" section={section} />
}
