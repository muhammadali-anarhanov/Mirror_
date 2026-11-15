import { NextRequest } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

async function proxy(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const base = process.env.BACKEND_URL
  if (!base) return Response.json({ error: "Backend is not configured" }, { status: 503 })
  const { path } = await params
  const allowed = new Set(["auth", "products", "admin", "images", "tryon-images", "brands", "branches", "users", "devices", "inventory", "plans", "credit-packages", "subscription", "credits", "try-on", "cart", "orders", "analytics", "notifications", "audit-logs", "applications"])
  if (!path.length || !allowed.has(path[0]) || path.some(p => !/^[a-zA-Z0-9-]+$/.test(p))) return Response.json({ error: "Not found" }, { status: 404 })
  const headers = new Headers()
  for (const key of ["content-type", "cookie", "authorization", "idempotency-key", "origin"]) {
    const value = request.headers.get(key)
    if (value) headers.set(key, value)
  }
  const mutation = !["GET", "HEAD"].includes(request.method)
  // Enforce same-origin in the proxy as well as exact-origin validation in Go.
  if (mutation && request.headers.get("origin") !== request.nextUrl.origin) return Response.json({ error: "Origin not allowed" }, { status: 403 })
  const size = Number(request.headers.get("content-length") || 0)
  if (size > 6 * 1024 * 1024) return Response.json({ error: "Request too large" }, { status: 413 })
  try {
    let body: Uint8Array | undefined
    if (mutation && request.body) {
      const reader = request.body.getReader(); const chunks: Uint8Array[] = []; let total = 0
      while (true) {
        const { done, value } = await reader.read(); if (done) break
        total += value.length
        if (total > 6 * 1024 * 1024) { await reader.cancel(); return Response.json({ error: "Request too large" }, { status: 413 }) }
        chunks.push(value)
      }
      body = new Uint8Array(total); let offset = 0
      for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.length }
    }
    const upstream = await fetch(`${base.replace(/\/$/, "")}/api/v1/${path.join("/")}${request.nextUrl.search}`, {
      method: request.method, headers, body: body ? new Blob([body as Uint8Array<ArrayBuffer>]) : undefined,
      cache: "no-store", redirect: "error", signal: AbortSignal.timeout(55000),
    })
    const output = new Headers({ "Content-Type": upstream.headers.get("content-type") || "application/json", "Cache-Control": "no-store" })
    for (const cookie of upstream.headers.getSetCookie()) output.append("Set-Cookie", cookie)
    return new Response(upstream.body, { status: upstream.status, headers: output })
  } catch { return Response.json({ error: "Backend unavailable" }, { status: 502 }) }
}
export { proxy as GET, proxy as POST, proxy as PUT, proxy as PATCH, proxy as DELETE }
