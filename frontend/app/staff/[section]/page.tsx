import { notFound } from "next/navigation"
import { AdminRoute, isConsoleSection } from "@/components/admin/admin-route"

export default async function ConsoleSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params
  if (!isConsoleSection("staff", section)) notFound()
  return <AdminRoute kind="staff" section={section} />
}
