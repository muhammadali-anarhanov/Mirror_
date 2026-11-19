import { redirect } from "next/navigation"

// The former /admin console is the brand console.
export default async function AdminSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params
  redirect(`/brand/${encodeURIComponent(section)}`)
}
