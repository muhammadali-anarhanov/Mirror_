import { notFound } from "next/navigation"
import { AdminRoute } from "@/components/admin/admin-route"
import { ADMIN_SECTION_DEFINITIONS as SECTION_DEFINITIONS } from "@/lib/admin/admin-catalog"

const brandSections = new Set(["dashboard", "products", "categories", "inventory", "orders", "staff", "devices", "analytics", "store-settings", "stock-receiving", "transfers", "branches", "subscription", "notifications", "integrations", "settings"])

export default async function AdminSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params
  if (!brandSections.has(section) || (section !== "dashboard" && !SECTION_DEFINITIONS[section])) notFound()
  return <AdminRoute kind="admin" section={section} />
}
