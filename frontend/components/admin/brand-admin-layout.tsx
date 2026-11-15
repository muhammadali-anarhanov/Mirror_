import { AdminConsole } from "@/components/admin/admin-shell"

export function BrandAdminLayout({ section }: { section: string }) {
  return <AdminConsole kind="brand" section={section} />
}
