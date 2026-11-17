export type MarketingSection = {
  title: string;
  body: string;
  bullets?: string[];
};

export type MarketingPageContent = {
  eyebrow: string;
  title: string;
  description: string;
  sections: MarketingSection[];
};

export const marketingPages: Record<string, MarketingPageContent> = {
  "how-it-works": {
    eyebrow: "How it works",
    title: "From trying on to shopping — a simple path",
    description:
      "MIRROR brings digital catalogs and physical stores together. Shoppers browse, try on and choose their next step.",
    sections: [
      {
        title: "Prepare your catalog",
        body: "Manage products, variants and prices in your brand catalog. Product images are linked to real catalog data.",
        bullets: ["Products and variants", "Real prices and availability", "Presentation that fits your brand"],
      },
      {
        title: "Explore the virtual mirror",
        body: "Shoppers choose a category and grant permission before using the camera. The interface adapts to phones, tablets and store kiosks.",
        bullets: ["Camera starts only after your choice", "Registration is optional", "Language and screen direction support"],
      },
      {
        title: "Continue in store",
        body: "MIRROR displays catalog details and availability by branch. The shopping flow can be adapted to your store operations.",
        bullets: ["Product view by branch", "Clear next step to purchase", "Management dashboard for your team"],
      },
    ],
  },
  features: {
    eyebrow: "Features",
    title: "Fitting room and retail management in one experience",
    description:
      "MIRROR connects the shopper interface with the daily work of brand and store teams.",
    sections: [
      {
        title: "Virtual try-on",
        body: "A kiosk interface for visually exploring clothing, footwear and accessories.",
        bullets: ["Landscape and portrait screens", "Camera permission and error states", "Category and variant selection"],
      },
      {
        title: "Products and inventory",
        body: "Manage products, variants, branch assignments and stock in a single catalog.",
        bullets: ["Variant and SKU information", "Availability by branch", "Product status and change history"],
      },
      {
        title: "Team management",
        body: "Dedicated workspaces for brand, store and staff roles with extensible permissions.",
        bullets: ["Role-specific workspace", "Branch-scoped access", "Audit trail for important actions"],
      },
    ],
  },
  "for-brands": {
    eyebrow: "For brands",
    title: "Bring your brand experience into the store",
    description:
      "MIRROR brings your brand catalog, virtual fitting and branch product information into one flow.",
    sections: [
      {
        title: "A look that matches your brand",
        body: "Kiosk and product presentation can match your brand identity while keeping shoppers focused on the product.",
        bullets: ["Brand name and catalog", "Product details", "Mobile and kiosk screens"],
      },
      {
        title: "Keep branches organized",
        body: "Plan branch and device views, product assignments and operational status within your brand.",
        bullets: ["Assortment by branch", "Device and branch status", "Extensible team roles"],
      },
    ],
  },
  pricing: {
    eyebrow: "Pricing",
    title: "An approach that fits your business scale",
    description:
      "Every business has different branches, devices and feature needs. Pricing is discussed around your actual requirements.",
    sections: [
      {
        title: "Start with your needs",
        body: "During the demo we review your catalog, stores and workflows. We do not show unconfirmed prices or limits.",
        bullets: ["Number of branches and devices", "Catalog and inventory requirements", "Integration with existing systems"],
      },
      {
        title: "A clear proposal with transparent scope",
        body: "Your proposal clearly describes features, support and implementation scope.",
        bullets: ["Agreed scope in advance", "Discuss additional requirements separately", "Demo requests are free"],
      },
    ],
  },
  "privacy-security": {
    eyebrow: "Privacy and security",
    title: "Trust is part of the experience",
    description:
      "Users should control decisions about cameras, accounts and personal data. MIRROR is built around this principle.",
    sections: [
      {
        title: "Camera permission starts with you",
        body: "We explain why the camera is needed before requesting permission. You can browse the page even if you decline.",
        bullets: ["Camera starts only when the user chooses", "An alternative when no camera is available", "You can withdraw consent at any time"],
      },
      {
        title: "Only necessary information",
        body: "Contact details submitted with a demo request are used to review it. Our privacy policy explains data use and retention.",
        bullets: ["A clear purpose for the request form", "Inputs are validated on the server", "Administrative actions have an audit trail"],
      },
    ],
  },
  about: {
    eyebrow: "About us",
    title: "Helping shoppers make clearer choices in store",
    description:
      "MIRROR is a virtual fitting and operations platform for fashion retail.",
    sections: [
      {
        title: "The product comes first",
        body: "Technology should help shoppers understand products. MIRROR simplifies browsing and choosing without complicating the store experience.",
      },
      {
        title: "For shoppers and teams",
        body: "Shoppers use the virtual fitting room while teams organize catalogs, variants and branch information in one workspace.",
      },
    ],
  },
  faq: {
    eyebrow: "FAQ",
    title: "Frequently asked questions about MIRROR",
    description: "Short answers about virtual fitting, privacy, catalogs and demos.",
    sections: [],
  },
};

export const faqItems = [
  {
    question: "Do I need an account to use the virtual mirror?",
    answer: "No account is needed to explore the mirror and browse the catalog. AI generation and shopping actions require an appropriate session.",
  },
  {
    question: "When does the camera turn on?",
    answer: "The camera starts only after the user chooses and grants permission. If permission is denied, a camera-free state is shown.",
  },
  {
    question: "Where do product prices and availability come from?",
    answer: "Product data comes from the brand catalog and branch information. We can discuss your current data sources during the demo.",
  },
  {
    question: "How is pricing determined?",
    answer: "Pricing depends on branches, devices and required features. We do not publish unconfirmed prices.",
  },
  {
    question: "How do I request a demo?",
    answer: "Submit the short form on the demo page. Our team will review your request and contact you.",
  },
];
