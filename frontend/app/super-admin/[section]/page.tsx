import { notFound } from "next/navigation"
import { AdminRoute } from "@/components/admin/admin-route"
import { ADMIN_SECTION_DEFINITIONS as SECTION_DEFINITIONS } from "@/lib/admin/admin-catalog"

const superAdminSections = new Set(["dashboard", "brands", "applications", "branches", "campaigns", "subscriptions", "notifications", "audit-logs", "settings"])

export default async function SuperAdminSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params
  if (!superAdminSections.has(section) || (section !== "dashboard" && !SECTION_DEFINITIONS[section])) notFound()
  return <AdminRoute kind="super-admin" section={section} />
}
