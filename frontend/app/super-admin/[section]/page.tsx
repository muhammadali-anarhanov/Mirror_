import { notFound } from "next/navigation"
import { AdminRoute, isConsoleSection } from "@/components/admin/admin-route"

export default async function ConsoleSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params
  if (!isConsoleSection("super-admin", section)) notFound()
  return <AdminRoute kind="super-admin" section={section} />
}
