export type PlatformRole = "SUPER_ADMIN" | "BRAND_ADMIN" | "STORE_ADMIN" | "STAFF"

export const ROLE_DASHBOARD_PATHS: Record<PlatformRole, string> = {
  SUPER_ADMIN: "/super-admin/dashboard",
  BRAND_ADMIN: "/brand/dashboard",
  STORE_ADMIN: "/brand/dashboard",
  STAFF: "/staff/dashboard",
}

export function dashboardPathForRole(role: PlatformRole) {
  return ROLE_DASHBOARD_PATHS[role]
}
