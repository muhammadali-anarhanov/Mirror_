# MIRROR Design System

## Product character
Premium, calm, modern retail software: editorial fashion sensibility with enterprise clarity. Avoid generic dashboard clutter and fabricated business metrics. The customer's kiosk is a focused, touch-first fitting experience; administrative workspaces prioritize legibility and efficient operations.

## Color and typography
- Brand palette: deep charcoal, warm off-white, forest green, muted sage, and quiet neutral borders. Reserve status colors for meaning, not decoration.
- Use semantic CSS variables and shadcn tokens (`background`, `foreground`, `primary`, `muted`, `border`, `destructive`) instead of hard-coded per-component colors.
- Keep to two font families maximum: a refined serif for selected editorial display headlines and a highly legible sans-serif for interface text and data.
- Existing global tokens are mostly neutral grayscale and the kiosk uses a separate warm visual system. Unify these incrementally; preserve the kiosk's distinct contrast needs.

## Layout and hierarchy
- Use a consistent admin shell with a collapsible sidebar, current workspace/scope, breadcrumb, searchable content, notifications/profile actions, and a clear page title.
- Use tables for structured records, charts for trends, and cards only for high-priority summaries or grouped actions.
- Use flexbox for most alignment, CSS grid for data-heavy/two-dimensional layouts, and responsive mobile-first spacing.
- Kiosk layouts are separate for landscape and portrait; do not scale one dense layout down to phone dimensions.

## Components and interaction
- Prefer existing shadcn components and semantic variants. Use one dominant primary action per section; secondary, tertiary, destructive, disabled, loading, and success/error states must be distinct.
- Forms have persistent labels, required markers, inline validation, help text, save/cancel, and unsaved-change protection where needed.
- Tables support search/filter/sort/pagination, empty/loading/error states, and safe row actions. Bulk changes require clear selection and confirmation.
- Destructive actions identify the target, explain consequences, and require deliberate confirmation; permanent deletion may require typing the name.
- Use focus-visible states, keyboard operation, `aria-current`, live status announcements, reduced-motion support, and meaningful image alt text.

## Responsive and international layouts
- Test at mobile, tablet, large desktop, and touchscreen landscape/portrait sizes.
- Provide Kazakh, English, Russian, Uzbek, Arabic, and Turkish through a real locale dictionary, not mixed hard-coded copy.
- Arabic must set `dir="rtl"` and mirror directional layout as appropriate without reversing numerical data or icons indiscriminately.
- Test long translated labels, zoom, keyboard navigation, and contrast in both light/dark modes; the product marketing surface can remain intentionally light while the kiosk uses its own dark/warm environment.

## Content integrity
Never show sample financial metrics, fake customer logos, fictitious product availability, or simulated changes as real. If a demo environment remains, label it visibly and explain that data is illustrative and session-only.
