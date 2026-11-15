// The default same-origin proxy allows HttpOnly cookies without browser token storage.
const base = (process.env.NEXT_PUBLIC_API_BASE_URL || "/api/v1").replace(/\/$/, "")
export function apiURL(path: string) { return `${base}${path.startsWith("/") ? path : `/${path}`}` }
let refreshing: Promise<Response> | null = null
export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const url = path.startsWith(base + "/") ? path : apiURL(path)
  const response = await fetch(url, { ...init, credentials: "include" })
  if (response.status !== 401 || path.startsWith("/auth/") || path.startsWith(apiURL("/auth/"))) return response
  refreshing ??= fetch(apiURL("/auth/refresh"), { method: "POST", credentials: "include" }).finally(() => { refreshing = null })
  const refreshed = await refreshing
  return refreshed.ok ? fetch(url, { ...init, credentials: "include" }) : response
}
