// Same-origin check that works behind TLS-terminating proxies (Render, Vercel):
// compares the browser Origin with the forwarded public host and protocol.
export function hasTrustedOrigin(request: Request) {
  const origin = request.headers.get("origin")
  const host = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() || request.headers.get("host")
  if (!origin || !host) return false
  try {
    const originUrl = new URL(origin)
    const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim()
    const requestProtocol = (forwardedProtocol || new URL(request.url).protocol).replace(/:$/, "")
    return originUrl.host.toLowerCase() === host.toLowerCase() && originUrl.protocol === `${requestProtocol}:`
  } catch {
    return false
  }
}
