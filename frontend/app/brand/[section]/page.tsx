import { notFound } from "next/navigation"
import { AdminRoute, isConsoleSection } from "@/components/admin/admin-route"

export default async function ConsoleSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params
  if (!isConsoleSection("brand", section)) notFound()
  return <AdminRoute kind="brand" section={section} />
}
