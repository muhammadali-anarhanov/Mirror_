import { DEMO_RECORDS, SECTION_DEFINITIONS, type AdminRecord, type SectionDefinition } from "@/lib/admin/demo-data"

const extendedDefinitions: Record<string, SectionDefinition> = {
  products: {
    title: "Products",
    description: "Manage your catalog, variants, imagery and branch availability.",
    addLabel: "Add product",
    columns: [
      { key: "name", label: "Product" }, { key: "sku", label: "SKU" }, { key: "category", label: "Category" },
      { key: "variants", label: "Variants" }, { key: "price", label: "Price" }, { key: "stock", label: "Stock" },
      { key: "aiStatus", label: "AI try-on" }, { key: "status", label: "Status" },
    ],
    fields: [
      { key: "name", label: "Product name", required: true }, { key: "description", label: "Description", multiline: true },
      { key: "category", label: "Category", options: ["Tops", "Dresses", "Footwear", "Accessories", "Pants"] , required: true },
      { key: "price", label: "Current selling price", type: "number", required: true },
      { key: "oldPrice", label: "Optional old / promotional price", type: "number" }, { key: "sku", label: "SKU", required: true },
      { key: "barcode", label: "Barcode" }, { key: "variants", label: "Variants (one per line: size · color · SKU)", multiline: true, required: true },
      { key: "status", label: "Status", options: ["Published", "Draft", "Archived", "Blocked"] },
    ],
    filters: [
      { key: "category", label: "All categories", options: ["Tops", "Dresses", "Footwear", "Accessories", "Pants"] },
      { key: "status", label: "All statuses", options: ["Published", "Draft", "Archived", "Blocked"] },
    ],
  },
  inventory: {
    title: "Inventory",
    description: "Review branch-level availability by individual size and color variant.",
    columns: [
      { key: "product", label: "Product" }, { key: "variant", label: "Variant" }, { key: "sku", label: "SKU" },
      { key: "branch", label: "Branch" }, { key: "available", label: "Available" }, { key: "blocked", label: "Blocked" }, { key: "status", label: "Availability" },
    ],
    fields: [
      { key: "product", label: "Product", required: true }, { key: "variant", label: "Size / color variant", required: true },
      { key: "sku", label: "Variant SKU", required: true }, { key: "branch", label: "Branch", required: true },
      { key: "available", label: "Available quantity", type: "number", required: true }, { key: "blocked", label: "Blocked quantity", type: "number", required: true },
      { key: "status", label: "Status", options: ["In stock", "Low stock", "Out of stock", "Blocked"] },
    ],
    filters: [
      { key: "branch", label: "All branches", options: ["Le Marais", "Saint-Germain", "Lyon Presqu’île"] },
      { key: "status", label: "All stock levels", options: ["In stock", "Low stock", "Out of stock", "Blocked"] },
    ],
  },
  "brand-branches": {
    title: "Branches",
    description: "Manage your brand locations, teams and store availability.",
    addLabel: "Add branch",
    columns: [
      { key: "name", label: "Branch" }, { key: "address", label: "Address" }, { key: "manager", label: "Manager" },
      { key: "contact", label: "Contact" }, { key: "products", label: "Products" }, { key: "devices", label: "Mirrors" }, { key: "status", label: "Status" },
    ],
    fields: [
      { key: "name", label: "Branch name", required: true }, { key: "address", label: "Address", required: true },
      { key: "city", label: "City", required: true }, { key: "country", label: "Country", required: true },
      { key: "manager", label: "Branch manager", required: true }, { key: "contact", label: "Contact email", type: "email", required: true },
      { key: "phone", label: "Contact phone", type: "text" }, { key: "products", label: "Assigned products", type: "number" },
      { key: "devices", label: "Smart mirrors", type: "number" }, { key: "status", label: "Status", options: ["Active", "Setup", "Inactive"] },
    ],
    filters: [{ key: "status", label: "All statuses", options: ["Active", "Setup", "Inactive"] }],
  },
  "brand-devices": {
    title: "Smart mirror devices",
    description: "Review devices installed in your branches. Statuses are sample data, not live telemetry.",
    addLabel: "Register device",
    columns: [
      { key: "name", label: "Device" }, { key: "deviceId", label: "Device ID" }, { key: "branch", label: "Branch" },
      { key: "version", label: "Software" }, { key: "lastActivity", label: "Last activity" }, { key: "status", label: "Status" },
    ],
    fields: [
      { key: "name", label: "Device name", required: true }, { key: "deviceId", label: "Device ID", required: true },
      { key: "branch", label: "Assigned branch", options: ["Le Marais", "Saint-Germain", "Lyon Presqu’île"] },
      { key: "version", label: "Software version" }, { key: "configuration", label: "Display configuration", multiline: true },
      { key: "lastActivity", label: "Last activity" }, { key: "status", label: "Status", options: ["Online", "Offline", "Inactive"] },
    ],
    filters: [{ key: "branch", label: "All branches", options: ["Le Marais", "Saint-Germain", "Lyon Presqu’île"] }, { key: "status", label: "All statuses", options: ["Online", "Offline", "Inactive"] }],
  },
  transfers: {
    title: "Stock transfers",
    description: "Move product variants between brand branches and review transfer history.",
    addLabel: "Create transfer",
    columns: [
      { key: "transferId", label: "Transfer" }, { key: "source", label: "From" }, { key: "destination", label: "To" },
      { key: "items", label: "Items" }, { key: "quantity", label: "Units" }, { key: "created", label: "Created" }, { key: "status", label: "Status" },
    ],
    fields: [
      { key: "source", label: "Source branch", options: ["Le Marais", "Saint-Germain", "Lyon Presqu’île"], required: true },
      { key: "destination", label: "Destination branch", options: ["Saint-Germain", "Lyon Presqu’île", "Le Marais"], required: true },
      { key: "items", label: "Product / size / color", required: true }, { key: "quantity", label: "Quantity", type: "number", required: true },
      { key: "created", label: "Transfer date", type: "date" }, { key: "status", label: "Status", options: ["Draft", "In transit", "Received", "Cancelled"] },
    ],
    filters: [{ key: "status", label: "All statuses", options: ["Draft", "In transit", "Received", "Cancelled"] }],
  },
  applications: {
    title: "Brand applications",
    description: "Review onboarding requests and approve access to the MIRROR platform.",
    columns: [
      { key: "brand", label: "Applicant" }, { key: "country", label: "Country" }, { key: "contact", label: "Contact" },
      { key: "submitted", label: "Submitted" }, { key: "stores", label: "Branches" }, { key: "status", label: "Status" },
    ],
    fields: [
      { key: "brand", label: "Brand name", required: true }, { key: "country", label: "Country", required: true },
      { key: "contact", label: "Business contact", type: "email", required: true }, { key: "submitted", label: "Submitted on", type: "date" },
      { key: "stores", label: "Planned branches", type: "number" }, { key: "status", label: "Status", options: ["Pending review", "Approved", "Rejected"] },
    ],
    filters: [{ key: "status", label: "All statuses", options: ["Pending review", "Approved", "Rejected"] }],
  },
  "audit-logs": {
    title: "Audit logs",
    description: "Review platform-level actions. Brand operations and customer data are not included.",
    readOnly: true,
    columns: [
      { key: "actor", label: "User" }, { key: "action", label: "Action" }, { key: "module", label: "Module" },
      { key: "time", label: "Date & time" }, { key: "result", label: "Status" },
    ],
    filters: [{ key: "result", label: "All statuses", options: ["Success", "Review"] }],
  },
  branches: {
    title: "Platform branches",
    description: "A platform-level directory of registered retail locations. No sales or inventory details are shown.",
    readOnly: true,
    columns: [
      { key: "name", label: "Branch" }, { key: "brand", label: "Brand" }, { key: "city", label: "City" },
      { key: "country", label: "Country" }, { key: "registered", label: "Registered" }, { key: "status", label: "Status" },
    ],
    filters: [{ key: "country", label: "All countries", options: ["France", "United Kingdom", "Japan", "United States"] }, { key: "status", label: "All statuses", options: ["Active", "Setup", "Inactive"] }],
  },
  campaigns: {
    title: "Platform campaigns",
    description: "Create platform-wide announcements and campaigns for all or selected brands.",
    addLabel: "Create campaign",
    columns: [
      { key: "name", label: "Campaign" }, { key: "target", label: "Audience" }, { key: "start", label: "Start date" },
      { key: "end", label: "End date" }, { key: "brands", label: "Brands" }, { key: "status", label: "Status" },
    ],
    fields: [
      { key: "name", label: "Campaign name", required: true }, { key: "description", label: "Description", multiline: true, required: true },
      { key: "target", label: "Target audience", options: ["All brands", "Selected brands"], required: true },
      { key: "start", label: "Start date", type: "date", required: true }, { key: "end", label: "End date", type: "date", required: true },
      { key: "brands", label: "Target brands" }, { key: "status", label: "Status", options: ["Draft", "Scheduled", "Live", "Archived"] },
    ],
    filters: [{ key: "status", label: "All statuses", options: ["Draft", "Scheduled", "Live", "Archived"] }],
  },
  notifications: {
    title: "Notifications",
    description: "Review platform announcements, operational alerts and account notices.",
    addLabel: "Create notification",
    columns: [
      { key: "title", label: "Notification" }, { key: "type", label: "Type" }, { key: "audience", label: "Audience" },
      { key: "date", label: "Date" }, { key: "status", label: "Status" },
    ],
    fields: [
      { key: "title", label: "Title", required: true }, { key: "message", label: "Message", multiline: true, required: true },
      { key: "type", label: "Type", options: ["Announcement", "Low stock", "Device", "Subscription"] },
      { key: "audience", label: "Audience", options: ["Brand admins", "Store teams", "All users"] },
      { key: "date", label: "Date", type: "date" }, { key: "status", label: "Status", options: ["Unread", "Read", "Scheduled", "Archived"] },
    ],
    filters: [{ key: "type", label: "All types", options: ["Announcement", "Low stock", "Device", "Subscription"] }, { key: "status", label: "All statuses", options: ["Unread", "Read", "Scheduled", "Archived"] }],
  },
  integrations: {
    title: "Integrations",
    description: "Preview POS, WMS, scanner, API and webhook connection states. No integrations are configured by this UI.",
    columns: [
      { key: "integration", label: "Integration" }, { key: "category", label: "Category" }, { key: "mode", label: "Mode" },
      { key: "lastActivity", label: "Last activity" }, { key: "status", label: "Preview status" },
    ],
    readOnly: true,
    filters: [{ key: "category", label: "All categories", options: ["POS", "Inventory / WMS", "Barcode scanner", "External API", "Webhooks"] }],
  },
  subscriptions: {
    title: "Platform subscriptions",
    description: "Review plan assignment and subscription state. Billing and payment processing are not connected.",
    addLabel: "Add plan",
    columns: [
      { key: "brand", label: "Brand" }, { key: "plan", label: "Plan" }, { key: "cycle", label: "Billing period" },
      { key: "branches", label: "Branches" }, { key: "devices", label: "Devices" }, { key: "status", label: "Status" },
    ],
    fields: [
      { key: "brand", label: "Brand", required: true }, { key: "plan", label: "Plan", options: ["Starter", "Growth", "Studio", "Enterprise"], required: true },
      { key: "cycle", label: "Billing period", options: ["Monthly", "Yearly", "Trial"] }, { key: "branches", label: "Branch limit", type: "number" },
      { key: "devices", label: "Mirror limit", type: "number" }, { key: "status", label: "Status", options: ["Active", "Trial", "Expired", "Suspended"] },
    ],
    filters: [{ key: "status", label: "All statuses", options: ["Active", "Trial", "Expired", "Suspended"] }],
  },
  staff: {
    ...SECTION_DEFINITIONS.staff,
    description: "Manage employees, branch assignments and role-based module visibility.",
    fields: [
      { key: "name", label: "Full name", required: true }, { key: "email", label: "Email", type: "email", required: true },
      { key: "branch", label: "Assigned branch", options: ["Le Marais", "Saint-Germain", "Lyon Presqu’île"], required: true },
      { key: "role", label: "Role", options: ["Brand Admin", "Store Admin", "Staff", "Analyst / Manager", "Custom Role"], required: true },
      { key: "permissions", label: "Allowed modules", multiline: true, required: true },
      { key: "lastLogin", label: "Last login" }, { key: "status", label: "Status", options: ["Active", "Invited", "Inactive"] },
    ],
  },
}

const extendedRecords: Record<string, AdminRecord[]> = {
  products: [
    { id: "prod-01", image: "/images/admin/linen-blazer.png", name: "Linen relaxed blazer", sku: "ML-4102", barcode: "890104410201", description: "A softly structured linen layer for everyday dressing.", category: "Tops", collection: "Autumn 2026", price: 198, oldPrice: 248, variants: "XS · Oat · 6 units\nS · Oat · 8 units\nM · Ink · 4 units", stock: 18, branch: "All branches", aiStatus: "Ready", status: "Published" },
    { id: "prod-02", image: "/images/admin/midi-dress.png", name: "Sculpted midi dress", sku: "NL-2804", barcode: "890104280401", description: "A clean-lined midi with a defined waist.", category: "Dresses", collection: "Studio edit", price: 310, oldPrice: 0, variants: "XS · Black · 2 units\nS · Olive · 5 units\nM · Black · 4 units", stock: 11, branch: "Le Marais", aiStatus: "Ready", status: "Published" },
    { id: "prod-03", image: "/images/admin/leather-loafer.png", name: "Soft leather loafer", sku: "AS-1208", barcode: "890104120801", description: "A minimal leather loafer with a flexible sole.", category: "Footwear", collection: "Core essentials", price: 185, oldPrice: 0, variants: "37 · Espresso · 0 units\n38 · Espresso · 2 units\n39 · Espresso · 3 units", stock: 5, branch: "Saint-Germain", aiStatus: "Needs image", status: "Draft" },
    { id: "prod-04", image: "/images/admin/crescent-bag.png", name: "Mini crescent bag", sku: "ML-9021", barcode: "890104902101", description: "A compact shoulder bag with a curved profile.", category: "Accessories", collection: "Autumn 2026", price: 126, oldPrice: 0, variants: "One size · Sand · 14 units\nOne size · Black · 10 units", stock: 24, branch: "All branches", aiStatus: "Ready", status: "Published" },
    { id: "prod-05", image: "/images/admin/linen-blazer.png", name: "Cotton poplin shirt", sku: "NL-3310", barcode: "890104331001", description: "A crisp cotton shirt with a relaxed silhouette.", category: "Tops", collection: "Core essentials", price: 78, oldPrice: 98, variants: "XS · White · 2 units\nS · Sky · 2 units", stock: 4, branch: "Lyon Presqu’île", aiStatus: "Processing", status: "Published" },
    { id: "prod-06", image: "/images/admin/midi-dress.png", name: "Draped evening dress", sku: "SR-1088", barcode: "890104108801", description: "A fluid evening dress with a soft drape.", category: "Dresses", collection: "Studio edit", price: 420, oldPrice: 0, variants: "S · Midnight · 0 units\nM · Midnight · 0 units", stock: 0, branch: "Le Marais", aiStatus: "Needs image", status: "Draft" },
  ],
  inventory: [
    { id: "inv-01", product: "Linen relaxed blazer", variant: "S · Oat", sku: "ML-4102-S-OAT", branch: "Le Marais", available: 8, blocked: 1, status: "In stock" },
    { id: "inv-02", product: "Linen relaxed blazer", variant: "M · Ink", sku: "ML-4102-M-INK", branch: "Saint-Germain", available: 4, blocked: 0, status: "Low stock" },
    { id: "inv-03", product: "Sculpted midi dress", variant: "S · Olive", sku: "NL-2804-S-OLV", branch: "Le Marais", available: 5, blocked: 0, status: "In stock" },
    { id: "inv-04", product: "Soft leather loafer", variant: "37 · Espresso", sku: "AS-1208-37-ESP", branch: "Saint-Germain", available: 0, blocked: 0, status: "Out of stock" },
    { id: "inv-05", product: "Cotton poplin shirt", variant: "S · Sky", sku: "NL-3310-S-SKY", branch: "Lyon Presqu’île", available: 2, blocked: 0, status: "Low stock" },
    { id: "inv-06", product: "Mini crescent bag", variant: "One size · Sand", sku: "ML-9021-OS-SND", branch: "Le Marais", available: 14, blocked: 2, status: "In stock" },
    { id: "inv-07", product: "Draped evening dress", variant: "M · Midnight", sku: "SR-1088-M-MID", branch: "Le Marais", available: 0, blocked: 2, status: "Blocked" },
  ],
  "brand-branches": [
    { id: "bb-01", name: "Le Marais", address: "18 Rue de Bretagne, Paris", city: "Paris", country: "France", manager: "Amira Laurent", contact: "paris@maisonlune.example", phone: "+33 1 42 78 10 24", products: 84, devices: 3, status: "Active" },
    { id: "bb-02", name: "Saint-Germain", address: "42 Rue de Rennes, Paris", city: "Paris", country: "France", manager: "Sofia Martin", contact: "saintgermain@maisonlune.example", phone: "+33 1 45 48 12 30", products: 72, devices: 2, status: "Active" },
    { id: "bb-03", name: "Lyon Presqu’île", address: "6 Rue de la République, Lyon", city: "Lyon", country: "France", manager: "Camille Moreau", contact: "lyon@maisonlune.example", phone: "+33 4 78 28 40 11", products: 58, devices: 2, status: "Setup" },
    { id: "bb-04", name: "Nice Carré d’Or", address: "21 Rue Masséna, Nice", city: "Nice", country: "France", manager: "Juliette Blanc", contact: "nice@maisonlune.example", phone: "+33 4 93 80 15 22", products: 43, devices: 1, status: "Active" },
  ],
  "brand-devices": [
    { id: "bd-01", name: "Le Marais — Mirror 01", deviceId: "ML-MIR-014", branch: "Le Marais", version: "2.4.1", configuration: "Portrait · 60s idle · EN / FR", lastActivity: "2 minutes ago", status: "Online" },
    { id: "bd-02", name: "Le Marais — Mirror 02", deviceId: "ML-MIR-015", branch: "Le Marais", version: "2.4.1", lastActivity: "8 minutes ago", status: "Online" },
    { id: "bd-03", name: "Saint-Germain — Mirror 01", deviceId: "ML-MIR-021", branch: "Saint-Germain", version: "2.4.0", lastActivity: "Yesterday", status: "Offline" },
    { id: "bd-04", name: "Lyon — Mirror 01", deviceId: "ML-MIR-031", branch: "Lyon Presqu’île", version: "2.4.1", lastActivity: "12 minutes ago", status: "Online" },
  ],
  transfers: [
    { id: "tr-01", transferId: "TR-2026-018", source: "Le Marais", destination: "Saint-Germain", items: "Linen relaxed blazer · M / Ink", quantity: 2, created: "2026-11-10", status: "In transit" },
    { id: "tr-02", transferId: "TR-2026-017", source: "Lyon Presqu’île", destination: "Le Marais", items: "Cotton poplin shirt · S / Sky", quantity: 4, created: "2026-11-08", status: "Received" },
    { id: "tr-03", transferId: "TR-2026-016", source: "Saint-Germain", destination: "Lyon Presqu’île", items: "Mini crescent bag · One size / Sand", quantity: 3, created: "2026-11-06", status: "Draft" },
  ],
  "audit-logs": [
    { id: "audit-platform-01", actor: "M. Anarhanov", action: "Brand application reviewed", module: "Brand onboarding", time: "Nov 11, 2026 · 09:40", result: "Success" },
    { id: "audit-platform-02", actor: "Platform Admin", action: "Campaign scheduled", module: "Platform campaigns", time: "Nov 10, 2026 · 16:12", result: "Success" },
    { id: "audit-platform-03", actor: "System", action: "Subscription state updated", module: "Platform subscriptions", time: "Nov 10, 2026 · 11:08", result: "Review" },
    { id: "audit-platform-04", actor: "M. Anarhanov", action: "Security preference changed", module: "Platform settings", time: "Nov 09, 2026 · 14:22", result: "Success" },
  ],
  applications: [
    { id: "ap-01", brand: "Atelier Serein", country: "France", contact: "hello@atelierserein.example", submitted: "2026-11-10", stores: 4, status: "Pending review" },
    { id: "ap-02", brand: "Kanso Form", country: "Japan", contact: "team@kansoform.example", submitted: "2026-11-08", stores: 2, status: "Pending review" },
    { id: "ap-03", brand: "Studio Aalto", country: "Finland", contact: "apply@studioaalto.example", submitted: "2026-11-06", stores: 6, status: "Pending review" },
    { id: "ap-04", brand: "Forma North", country: "Sweden", contact: "hello@formanorth.example", submitted: "2026-11-05", stores: 3, status: "Pending review" },
    { id: "ap-05", brand: "Casa Nube", country: "Spain", contact: "ops@casanube.example", submitted: "2026-11-04", stores: 2, status: "Pending review" },
    { id: "ap-06", brand: "Onda Studio", country: "Portugal", contact: "team@ondastudio.example", submitted: "2026-11-03", stores: 4, status: "Pending review" },
    { id: "ap-07", brand: "Forma Objects", country: "Canada", contact: "apply@formaobjects.example", submitted: "2026-11-02", stores: 2, status: "Pending review" },
    { id: "ap-08", brand: "Nami Collective", country: "South Korea", contact: "hello@namicollective.example", submitted: "2026-11-01", stores: 5, status: "Pending review" },
    { id: "ap-09", brand: "Casa Nube Archive", country: "Spain", contact: "archive@casanube.example", submitted: "2026-10-30", stores: 3, status: "Approved" },
  ],
  branches: [
    { id: "pb-01", name: "Le Marais", brand: "Maison Lune", city: "Paris", country: "France", registered: "2025-08-16", status: "Active" },
    { id: "pb-02", name: "Soho", brand: "Northline Atelier", city: "London", country: "United Kingdom", registered: "2025-09-03", status: "Active" },
    { id: "pb-03", name: "Shibuya", brand: "Sora Studio", city: "Tokyo", country: "Japan", registered: "2026-01-21", status: "Active" },
    { id: "pb-04", name: "Brooklyn", brand: "Field & Form", city: "New York", country: "United States", registered: "2026-02-12", status: "Inactive" },
    { id: "pb-05", name: "Saint-Germain", brand: "Aster Collective", city: "Paris", country: "France", registered: "2026-03-10", status: "Active" },
  ],
  campaigns: [
    { id: "ca-01", name: "Autumn fit week", target: "All brands", start: "2026-10-15", end: "2026-11-15", brands: "128 brands", status: "Live" },
    { id: "ca-02", name: "Mirror-ready collection", target: "Selected brands", start: "2026-11-20", end: "2026-12-10", brands: "12 brands", status: "Scheduled" },
    { id: "ca-03", name: "Platform onboarding", target: "All brands", start: "2026-09-01", end: "2026-09-30", brands: "128 brands", status: "Archived" },
  ],
  notifications: [
    { id: "nt-01", title: "Device offline: Shibuya", type: "Device", audience: "Store teams", date: "2026-11-11", status: "Unread" },
    { id: "nt-02", title: "New brand application received", type: "Announcement", audience: "Brand admins", date: "2026-11-10", status: "Unread" },
    { id: "nt-03", title: "Subscription renewal reminder", type: "Subscription", audience: "Brand admins", date: "2026-11-08", status: "Read" },
    { id: "nt-04", title: "Inventory below threshold", type: "Low stock", audience: "Store teams", date: "2026-11-07", status: "Read" },
  ],
  "brand-notifications": [
    { id: "bn-01", title: "Low stock: Cotton poplin shirt", type: "Low stock", audience: "Le Marais", date: "2026-11-11", status: "Unread" },
    { id: "bn-02", title: "Mirror offline: Saint-Germain", type: "Device", audience: "Saint-Germain", date: "2026-11-10", status: "Unread" },
    { id: "bn-03", title: "New staff invitation sent", type: "Announcement", audience: "Maison Lune", date: "2026-11-09", status: "Read" },
    { id: "bn-04", title: "Subscription renewal approaching", type: "Subscription", audience: "Maison Lune", date: "2026-11-05", status: "Read" },
  ],
  integrations: [
    { id: "int-01", integration: "Retail POS", category: "POS", mode: "Demo connection", lastActivity: "Sample sync · 09:40", status: "Demo connected" },
    { id: "int-02", integration: "Inventory / WMS", category: "Inventory / WMS", mode: "Preview only", lastActivity: "Not synchronized", status: "Not connected" },
    { id: "int-03", integration: "Barcode scanner", category: "Barcode scanner", mode: "Simulated input", lastActivity: "Last simulated · Today", status: "Demo ready" },
    { id: "int-04", integration: "External API", category: "External API", mode: "Contract preview", lastActivity: "No live requests", status: "Not connected" },
    { id: "int-05", integration: "Webhooks", category: "Webhooks", mode: "Preview only", lastActivity: "No events delivered", status: "Not connected" },
  ],
  subscriptions: [
    { id: "ps-01", brand: "Maison Lune", plan: "Studio", cycle: "Yearly", branches: 14, devices: 32, status: "Active" },
    { id: "ps-02", brand: "Northline Atelier", plan: "Growth", cycle: "Monthly", branches: 8, devices: 18, status: "Active" },
    { id: "ps-03", brand: "Sora Studio", plan: "Starter", cycle: "Trial", branches: 3, devices: 6, status: "Trial" },
    { id: "ps-04", brand: "Field & Form", plan: "Growth", cycle: "Monthly", branches: 6, devices: 12, status: "Suspended" },
  ],
  staff: [
    { id: "staff-01", name: "Lea Dubois", email: "lea@maisonlune.example", branch: "Le Marais", role: "Staff", permissions: "Catalog, stock receiving, device status", lastLogin: "Today, 08:34", status: "Active" },
    { id: "staff-02", name: "Amira Laurent", email: "amira@maisonlune.example", branch: "All branches", role: "Brand Admin", permissions: "All brand modules", lastLogin: "Today, 09:42", status: "Active" },
    { id: "staff-03", name: "Sofia Martin", email: "sofia@maisonlune.example", branch: "Saint-Germain", role: "Store Admin", permissions: "Catalog, inventory, staff", lastLogin: "Today, 07:54", status: "Active" },
    { id: "staff-04", name: "Nina Morel", email: "nina@maisonlune.example", branch: "All branches", role: "Analyst / Manager", permissions: "Dashboard, analytics", lastLogin: "Yesterday", status: "Active" },
  ],
}

export const ADMIN_SECTION_DEFINITIONS: Record<string, SectionDefinition> = {
  ...SECTION_DEFINITIONS,
  ...extendedDefinitions,
  "brand-notifications": { ...extendedDefinitions.notifications, description: "Low-stock, device, staff and subscription notices for your brand workspace." },
  "stock-receiving": { title: "Stock receiving", description: "Receive inventory by barcode, product variant and destination branch.", columns: [] },
  receiving: {
    title: "Stock receiving",
    description: "Receive inventory by barcode, product variant and destination branch.",
    columns: [],
  },
  subscription: {
    title: "Subscription",
    description: "Review your current plan, usage and billing period. Payment actions are preview-only.",
    columns: [],
  },
  analytics: {
    ...SECTION_DEFINITIONS.analytics,
    description: "Explore virtual try-on sessions, product interest, branches and device usage.",
    columns: [],
  },
  "store-settings": { ...SECTION_DEFINITIONS["store-settings"], title: "Settings" },
}

export const ADMIN_DEMO_RECORDS: Record<string, AdminRecord[]> = {
  ...DEMO_RECORDS,
  ...extendedRecords,
}
