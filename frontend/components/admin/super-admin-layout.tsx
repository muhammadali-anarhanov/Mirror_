import { AdminConsole } from "@/components/admin/admin-shell"

export function SuperAdminLayout({ section }: { section: string }) {
  return <AdminConsole kind="super-admin" section={section} />
}
