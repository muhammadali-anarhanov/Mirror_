// Shared by server routes and the client console.
export type ConsoleKind = "super-admin" | "brand" | "staff"

export const CONSOLE_SECTIONS: Record<ConsoleKind, string[]> = {
  "super-admin": ["dashboard", "applications", "brands", "subscriptions", "audit-logs", "account"],
  brand: ["dashboard", "products", "inventory", "orders", "branches", "devices", "staff", "subscription", "notifications", "audit-logs", "account"],
  staff: ["dashboard", "products", "inventory", "orders", "devices", "notifications", "account"],
}

// Old links keep working.
export const SECTION_ALIASES: Record<string, string> = {
  analytics: "dashboard", "stock-receiving": "inventory", transfers: "inventory", categories: "products", "store-settings": "account",
  settings: "account", integrations: "dashboard", campaigns: "dashboard", users: "staff", notifications: "notifications",
}

export function sectionsFor(kind: ConsoleKind) {
  return CONSOLE_SECTIONS[kind].concat(Object.keys(SECTION_ALIASES).filter((alias) => CONSOLE_SECTIONS[kind].includes(SECTION_ALIASES[alias])))
}
