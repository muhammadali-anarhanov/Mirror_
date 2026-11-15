import { notFound } from "next/navigation"
import { AdminRoute } from "@/components/admin/admin-route"

const allowedStaffSections = new Set(["dashboard", "products", "stock-receiving", "inventory", "devices", "analytics"])

export default async function StaffSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params
  if (!allowedStaffSections.has(section)) notFound()
  return <AdminRoute kind="staff" section={section} />
}
