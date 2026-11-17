// Post-login return path from ?next=, limited to same-site relative paths.
export function safeNextPath(search: string): string | null {
  const next = new URLSearchParams(search).get("next")
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return null
  return next
}
