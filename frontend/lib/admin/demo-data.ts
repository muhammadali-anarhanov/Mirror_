export type AdminRecord = {
  id: string
  [key: string]: string | number
}

export type FormField = {
  key: string
  label: string
  type?: "text" | "email" | "number" | "date"
  options?: string[]
  required?: boolean
  multiline?: boolean
}

export type SectionDefinition = {
  title: string
  description: string
  addLabel?: string
  columns: Array<{ key: string; label: string; sortable?: boolean }>
  fields?: FormField[]
  filters?: Array<{ key: string; label: string; options: string[] }>
  readOnly?: boolean
  integrationPending?: boolean
}

export const SECTION_DEFINITIONS: Record<string, SectionDefinition> = {
  brands: {
    title: "Brands",
    description: "Manage brand profiles, administrators and platform status.",
    addLabel: "Add brand",
    columns: [
      { key: "name", label: "Brand" },
      { key: "email", label: "Contact" },
      { key: "country", label: "Country" },
      { key: "stores", label: "Stores" },
      { key: "plan", label: "Plan" },
      { key: "status", label: "Status" },
    ],
    fields: [
      { key: "name", label: "Brand name", required: true },
      { key: "description", label: "Description", multiline: true },
      { key: "email", label: "Contact email", type: "email", required: true },
      { key: "adminEmail", label: "Brand administrator email", type: "email", required: true },
      { key: "phone", label: "Phone number" },
      { key: "country", label: "Country", required: true },
      { key: "website", label: "Website" },
      { key: "registrationDate", label: "Registration date", type: "date" },
      { key: "stores", label: "Stores", type: "number", required: true },
      { key: "plan", label: "Subscription plan", required: true },
      { key: "status", label: "Status", options: ["Active", "Trial", "Suspended", "Inactive"] },
    ],
    filters: [
      { key: "country", label: "All countries", options: ["United States", "United Kingdom", "France", "Japan"] },
      { key: "status", label: "All statuses", options: ["Active", "Trial", "Suspended", "Inactive"] },
    ],
  },
  stores: {
    title: "Stores",
    description: "Review every retail location and its connected devices.",
    addLabel: "Add store",
    columns: [
      { key: "name", label: "Store" },
      { key: "brand", label: "Brand" },
      { key: "city", label: "City" },
      { key: "country", label: "Country" },
      { key: "devices", label: "Devices" },
      { key: "status", label: "Status" },
    ],
    fields: [
      { key: "name", label: "Store name", required: true },
      { key: "brand", label: "Brand", required: true },
      { key: "address", label: "Street address", required: true },
      { key: "city", label: "City", required: true },
      { key: "country", label: "Country", required: true },
      { key: "contact", label: "Contact email", type: "email" },
      { key: "adminEmail", label: "Store administrator email", type: "email", required: true },
      { key: "phone", label: "Phone number" },
      { key: "devices", label: "Device count", type: "number", required: true },
      { key: "status", label: "Status", options: ["Active", "Inactive", "Suspended"] },
    ],
    filters: [
      { key: "brand", label: "All brands", options: ["Maison Lune", "Northline Atelier", "Sora Studio", "Field & Form", "Aster Collective", "Atelier N°8"] },
      { key: "country", label: "All countries", options: ["United States", "United Kingdom", "France", "Japan"] },
      { key: "city", label: "All cities", options: ["Paris", "London", "Tokyo", "New York"] },
      { key: "status", label: "All statuses", options: ["Active", "Inactive", "Suspended"] },
    ],
  },
  users: {
    title: "Users & roles",
    description: "Review platform accounts and their assigned access roles.",
    addLabel: "Add user",
    columns: [
      { key: "name", label: "User" },
      { key: "email", label: "Email" },
      { key: "role", label: "Role" },
      { key: "scope", label: "Assigned scope" },
      { key: "lastLogin", label: "Last login" },
      { key: "status", label: "Status" },
    ],
    fields: [
      { key: "name", label: "Full name", required: true },
      { key: "email", label: "Email", type: "email", required: true },
      { key: "role", label: "Role", options: ["SUPER_ADMIN", "BRAND_ADMIN", "STORE_ADMIN", "STAFF"] },
      { key: "scope", label: "Brand or store", required: true },
      { key: "status", label: "Status", options: ["Active", "Inactive"] },
    ],
    filters: [
      { key: "role", label: "All roles", options: ["SUPER_ADMIN", "BRAND_ADMIN", "STORE_ADMIN", "STAFF"] },
      { key: "status", label: "All statuses", options: ["Active", "Inactive"] },
    ],
  },
  subscriptions: {
    title: "Subscriptions",
    description: "Manage plan access and subscription lifecycle. Billing data is not connected.",
    addLabel: "Create plan",
    columns: [
      { key: "brand", label: "Brand" },
      { key: "plan", label: "Plan" },
      { key: "cycle", label: "Billing cycle" },
      { key: "stores", label: "Stores" },
      { key: "devices", label: "Devices" },
      { key: "status", label: "Status" },
    ],
    fields: [
      { key: "brand", label: "Brand", required: true },
      { key: "plan", label: "Plan name", required: true },
      { key: "cycle", label: "Billing cycle", options: ["Monthly", "Yearly"] },
      { key: "monthlyPrice", label: "Monthly price", type: "number", required: true },
      { key: "yearlyPrice", label: "Yearly price", type: "number", required: true },
      { key: "features", label: "Plan features", multiline: true, required: true },
      { key: "stores", label: "Store limit", type: "number", required: true },
      { key: "devices", label: "Device limit", type: "number", required: true },
      { key: "status", label: "Status", options: ["Active", "Trial", "Expired", "Suspended", "Cancelled"] },
    ],
    filters: [{ key: "status", label: "All statuses", options: ["Active", "Trial", "Expired", "Suspended", "Cancelled"] }],
  },
  devices: {
    title: "Devices",
    description: "Monitor mirrors and screens assigned to stores.",
    addLabel: "Register device",
    columns: [
      { key: "name", label: "Device" },
      { key: "store", label: "Store" },
      { key: "type", label: "Type" },
      { key: "version", label: "Software" },
      { key: "lastSeen", label: "Last connection" },
      { key: "status", label: "Status" },
    ],
    fields: [
      { key: "name", label: "Device name", required: true },
      { key: "store", label: "Assigned store", required: true },
      { key: "type", label: "Device type", options: ["SMART_MIRROR", "MONITOR"] },
      { key: "version", label: "Software version" },
      { key: "lastSeen", label: "Last connection" },
      { key: "status", label: "Status", options: ["Online", "Offline", "Inactive"] },
    ],
    filters: [
      { key: "store", label: "All stores", options: ["Le Marais", "Soho", "Shibuya", "Brooklyn", "Saint-Germain"] },
      { key: "type", label: "All device types", options: ["SMART_MIRROR", "MONITOR"] },
      { key: "status", label: "All statuses", options: ["Online", "Offline", "Inactive"] },
    ],
  },
  "audit-logs": {
    title: "Audit logs",
    description: "A read-only history of sensitive administrative activity.",
    readOnly: true,
    columns: [
      { key: "actor", label: "User" },
      { key: "action", label: "Action" },
      { key: "resource", label: "Affected resource" },
      { key: "time", label: "Date & time" },
      { key: "result", label: "Result" },
    ],
  },
  products: {
    title: "Products",
    description: "Maintain the catalog used by your virtual fitting room.",
    addLabel: "Add product",
    columns: [
      { key: "name", label: "Product" },
      { key: "sku", label: "SKU" },
      { key: "category", label: "Category" },
      { key: "price", label: "Price" },
      { key: "salePrice", label: "Sale price" },
      { key: "stock", label: "Stock" },
      { key: "status", label: "Status" },
    ],
    fields: [
      { key: "name", label: "Product name", required: true },
      { key: "sku", label: "SKU", required: true },
      { key: "description", label: "Description", multiline: true },
      { key: "category", label: "Category", required: true },
      { key: "price", label: "Original price", type: "number", required: true },
      { key: "salePrice", label: "Sale price", type: "number" },
      { key: "sizes", label: "Available sizes", required: true },
      { key: "colors", label: "Available colors", required: true },
      { key: "stock", label: "Stock quantity", type: "number", required: true },
      { key: "status", label: "Status", options: ["Active", "Unavailable", "Draft"] },
    ],
    filters: [
      { key: "category", label: "All categories", options: ["Tops", "Dresses", "Footwear", "Accessories"] },
      { key: "status", label: "All statuses", options: ["Active", "Unavailable", "Draft"] },
    ],
  },
  categories: {
    title: "Categories",
    description: "Organize products and control how categories appear in the catalog.",
    addLabel: "Add category",
    columns: [
      { key: "name", label: "Category" },
      { key: "products", label: "Products" },
      { key: "order", label: "Display order" },
      { key: "status", label: "Status" },
    ],
    fields: [
      { key: "name", label: "Category name", required: true },
      { key: "products", label: "Product count", type: "number", required: true },
      { key: "order", label: "Display order", type: "number", required: true },
      { key: "status", label: "Status", options: ["Active", "Inactive"] },
    ],
    filters: [{ key: "status", label: "All statuses", options: ["Active", "Inactive"] }],
  },
  inventory: {
    title: "Inventory",
    description: "Review availability and update stock levels for catalog items.",
    columns: [
      { key: "name", label: "Product" },
      { key: "sku", label: "SKU" },
      { key: "category", label: "Category" },
      { key: "stock", label: "Stock quantity" },
      { key: "status", label: "Availability" },
    ],
    fields: [
      { key: "name", label: "Product name", required: true },
      { key: "sku", label: "SKU", required: true },
      { key: "category", label: "Category", required: true },
      { key: "stock", label: "Stock quantity", type: "number", required: true },
      { key: "status", label: "Availability", options: ["In stock", "Low stock", "Out of stock", "Unavailable"] },
    ],
    filters: [{ key: "status", label: "All stock levels", options: ["In stock", "Low stock", "Out of stock", "Unavailable"] }],
  },
  orders: {
    title: "Orders & cart activity",
    description: "Order and checkout data can appear here after the Go API exposes it.",
    columns: [],
    integrationPending: true,
  },
  staff: {
    title: "Staff",
    description: "Manage staff accounts and their assigned store permissions.",
    addLabel: "Add staff member",
    columns: [
      { key: "name", label: "Staff member" },
      { key: "email", label: "Email" },
      { key: "store", label: "Store" },
      { key: "permissions", label: "Permissions" },
      { key: "lastLogin", label: "Last login" },
      { key: "status", label: "Status" },
    ],
    fields: [
      { key: "name", label: "Full name", required: true },
      { key: "email", label: "Email", type: "email", required: true },
      { key: "store", label: "Assigned store", required: true },
      { key: "permissions", label: "Permissions", required: true },
      { key: "status", label: "Status", options: ["Active", "Inactive"] },
    ],
  },
  analytics: {
    title: "Analytics",
    description: "Explore try-on activity and catalog engagement by date range.",
    columns: [],
  },
  settings: {
    title: "System settings",
    description: "Platform configuration and service health. Secrets are never shown here.",
    columns: [],
  },
  "store-settings": {
    title: "Store settings",
    description: "Update store preferences and contact information.",
    columns: [],
  },
}

export const DEMO_RECORDS: Record<string, AdminRecord[]> = {
  brands: [
    { id: "br-101", name: "Maison Lune", email: "ops@maisonlune.example", country: "France", stores: 14, plan: "Studio", status: "Active" },
    { id: "br-102", name: "Northline Atelier", email: "team@northline.example", country: "United Kingdom", stores: 8, plan: "Growth", status: "Active" },
    { id: "br-103", name: "Sora Studio", email: "hello@sora.example", country: "Japan", stores: 3, plan: "Trial", status: "Trial" },
    { id: "br-104", name: "Field & Form", email: "admin@fieldform.example", country: "United States", stores: 6, plan: "Growth", status: "Suspended" },
    { id: "br-105", name: "Aster Collective", email: "studio@aster.example", country: "France", stores: 11, plan: "Studio", status: "Active" },
    { id: "br-106", name: "Atelier N°8", email: "contact@atelier8.example", country: "United Kingdom", stores: 2, plan: "Starter", status: "Active" },
    { id: "br-107", name: "Eunoia", email: "team@eunoia.example", country: "Japan", stores: 4, plan: "Trial", status: "Trial" },
  ],
  stores: [
    { id: "st-201", name: "Maison Lune — Le Marais", brand: "Maison Lune", city: "Paris", country: "France", devices: 3, status: "Active" },
    { id: "st-202", name: "Northline — Soho", brand: "Northline Atelier", city: "London", country: "United Kingdom", devices: 2, status: "Active" },
    { id: "st-203", name: "Sora — Shibuya", brand: "Sora Studio", city: "Tokyo", country: "Japan", devices: 1, status: "Inactive" },
    { id: "st-204", name: "Field & Form — Brooklyn", brand: "Field & Form", city: "New York", country: "United States", devices: 4, status: "Suspended" },
    { id: "st-205", name: "Aster — Saint-Germain", brand: "Aster Collective", city: "Paris", country: "France", devices: 2, status: "Active" },
    { id: "st-206", name: "Atelier N°8 — Shoreditch", brand: "Atelier N°8", city: "London", country: "United Kingdom", devices: 1, status: "Active" },
  ],
  users: [
    { id: "us-301", name: "Amira Laurent", email: "amira@maisonlune.example", role: "BRAND_ADMIN", scope: "Maison Lune", lastLogin: "Today, 09:42", status: "Active" },
    { id: "us-302", name: "Daniel Reed", email: "daniel@northline.example", role: "BRAND_ADMIN", scope: "Northline Atelier", lastLogin: "Today, 08:18", status: "Active" },
    { id: "us-303", name: "Aya Nakamura", email: "aya@sora.example", role: "STORE_ADMIN", scope: "Sora — Shibuya", lastLogin: "Yesterday", status: "Active" },
    { id: "us-304", name: "Morgan Blake", email: "morgan@fieldform.example", role: "STAFF", scope: "Field & Form — Brooklyn", lastLogin: "Oct 28, 2026", status: "Inactive" },
    { id: "us-305", name: "Sofia Martin", email: "sofia@aster.example", role: "STORE_ADMIN", scope: "Aster — Saint-Germain", lastLogin: "Today, 07:54", status: "Active" },
  ],
  subscriptions: [
    { id: "su-401", brand: "Maison Lune", plan: "Studio", cycle: "Yearly", stores: 14, devices: 32, status: "Active" },
    { id: "su-402", brand: "Northline Atelier", plan: "Growth", cycle: "Monthly", stores: 8, devices: 18, status: "Active" },
    { id: "su-403", brand: "Sora Studio", plan: "Starter", cycle: "Trial", stores: 3, devices: 6, status: "Trial" },
    { id: "su-404", brand: "Field & Form", plan: "Growth", cycle: "Monthly", stores: 6, devices: 12, status: "Suspended" },
    { id: "su-405", brand: "Aster Collective", plan: "Studio", cycle: "Yearly", stores: 11, devices: 26, status: "Active" },
  ],
  devices: [
    { id: "dv-501", name: "ML-MIR-014", store: "Le Marais", type: "SMART_MIRROR", version: "2.4.1", lastSeen: "2 min ago", status: "Online" },
    { id: "dv-502", name: "NL-MON-008", store: "Soho", type: "MONITOR", version: "2.4.1", lastSeen: "5 min ago", status: "Online" },
    { id: "dv-503", name: "SS-MIR-003", store: "Shibuya", type: "SMART_MIRROR", version: "2.3.8", lastSeen: "Yesterday", status: "Offline" },
    { id: "dv-504", name: "FF-MIR-011", store: "Brooklyn", type: "SMART_MIRROR", version: "2.4.0", lastSeen: "18 min ago", status: "Online" },
    { id: "dv-505", name: "AS-MON-021", store: "Saint-Germain", type: "MONITOR", version: "2.4.1", lastSeen: "3 min ago", status: "Online" },
  ],
  "audit-logs": [
    { id: "au-601", actor: "Amira Laurent", action: "Role updated", resource: "M. Blake · STAFF", time: "Nov 06, 2026 · 09:21", result: "Success" },
    { id: "au-602", actor: "Daniel Reed", action: "Device assigned", resource: "NL-MON-008 · Soho", time: "Nov 06, 2026 · 08:55", result: "Success" },
    { id: "au-603", actor: "Sofia Martin", action: "Product updated", resource: "Linen blazer · SKU-4102", time: "Nov 05, 2026 · 17:42", result: "Success" },
    { id: "au-604", actor: "System", action: "Subscription suspended", resource: "Field & Form", time: "Nov 05, 2026 · 13:10", result: "Review" },
    { id: "au-605", actor: "Amira Laurent", action: "Store settings changed", resource: "Le Marais", time: "Nov 04, 2026 · 11:08", result: "Success" },
  ],
  products: [
    { id: "pr-701", name: "Linen relaxed blazer", sku: "ML-4102", description: "A softly structured linen layer for everyday dressing.", category: "Tops", price: 248, salePrice: 198, sizes: "XS, S, M, L", colors: "Oat, Ink", stock: 18, status: "Active" },
    { id: "pr-702", name: "Sculpted midi dress", sku: "NL-2804", description: "A clean-lined midi with a defined waist.", category: "Dresses", price: 310, salePrice: 0, sizes: "XS, S, M, L, XL", colors: "Black, Olive", stock: 7, status: "Active" },
    { id: "pr-703", name: "Soft leather loafer", sku: "AS-1208", description: "A minimal leather loafer with a flexible sole.", category: "Footwear", price: 185, salePrice: 160, sizes: "36, 37, 38, 39, 40", colors: "Espresso", stock: 0, status: "Unavailable" },
    { id: "pr-704", name: "Mini crescent bag", sku: "ML-9021", description: "A compact shoulder bag with a curved profile.", category: "Accessories", price: 126, salePrice: 0, sizes: "One size", colors: "Sand, Black", stock: 24, status: "Active" },
    { id: "pr-705", name: "Cotton poplin shirt", sku: "NL-3310", description: "A crisp cotton shirt with a relaxed silhouette.", category: "Tops", price: 98, salePrice: 78, sizes: "XS, S, M, L", colors: "White, Sky", stock: 4, status: "Active" },
    { id: "pr-706", name: "Draped evening dress", sku: "SR-1088", description: "A fluid evening dress with a soft drape.", category: "Dresses", price: 420, salePrice: 0, sizes: "S, M, L", colors: "Midnight", stock: 0, status: "Draft" },
  ],
  categories: [
    { id: "ca-801", name: "Tops", products: 36, order: 1, status: "Active" },
    { id: "ca-802", name: "Dresses", products: 24, order: 2, status: "Active" },
    { id: "ca-803", name: "Pants", products: 18, order: 3, status: "Active" },
    { id: "ca-804", name: "Footwear", products: 11, order: 4, status: "Active" },
    { id: "ca-805", name: "Accessories", products: 29, order: 5, status: "Inactive" },
  ],
  inventory: [
    { id: "in-901", name: "Linen relaxed blazer", sku: "ML-4102", category: "Tops", stock: 18, status: "In stock" },
    { id: "in-902", name: "Cotton poplin shirt", sku: "NL-3310", category: "Tops", stock: 4, status: "Low stock" },
    { id: "in-903", name: "Soft leather loafer", sku: "AS-1208", category: "Footwear", stock: 0, status: "Out of stock" },
    { id: "in-904", name: "Sculpted midi dress", sku: "NL-2804", category: "Dresses", stock: 7, status: "In stock" },
    { id: "in-905", name: "Draped evening dress", sku: "SR-1088", category: "Dresses", stock: 0, status: "Unavailable" },
  ],
  staff: [
    { id: "sf-1001", name: "Lea Dubois", email: "lea@maisonlune.example", store: "Le Marais", permissions: "Catalog, devices", lastLogin: "Today, 08:34", status: "Active" },
    { id: "sf-1002", name: "Oliver Park", email: "oliver@northline.example", store: "Soho", permissions: "Catalog", lastLogin: "Yesterday", status: "Active" },
    { id: "sf-1003", name: "Hana Mori", email: "hana@sora.example", store: "Shibuya", permissions: "Try-on activity", lastLogin: "Oct 30, 2026", status: "Inactive" },
    { id: "sf-1004", name: "Camille Moreau", email: "camille@aster.example", store: "Saint-Germain", permissions: "Catalog, inventory", lastLogin: "Today, 07:12", status: "Active" },
  ],
}

export const PLATFORM_ACTIVITY = [
  { month: "Jun", brands: 34, stores: 68, sessions: 1850 },
  { month: "Jul", brands: 41, stores: 76, sessions: 2140 },
  { month: "Aug", brands: 38, stores: 83, sessions: 2370 },
  { month: "Sep", brands: 52, stores: 91, sessions: 2800 },
  { month: "Oct", brands: 48, stores: 103, sessions: 3140 },
  { month: "Nov", brands: 61, stores: 118, sessions: 3620 },
]

export const SUBSCRIPTION_DISTRIBUTION = [
  { status: "Active", count: 286 },
  { status: "Trial", count: 48 },
  { status: "Expired", count: 31 },
  { status: "Suspended", count: 12 },
]

export const PRODUCT_ACTIVITY = [
  { day: "Mon", sessions: 188, carts: 41 },
  { day: "Tue", sessions: 224, carts: 54 },
  { day: "Wed", sessions: 196, carts: 48 },
  { day: "Thu", sessions: 269, carts: 67 },
  { day: "Fri", sessions: 312, carts: 82 },
  { day: "Sat", sessions: 384, carts: 103 },
  { day: "Sun", sessions: 291, carts: 76 },
]
