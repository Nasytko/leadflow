# ORVIX Brand Book

## Identity

| Attribute | Value |
|-----------|-------|
| **Name** | ORVIX |
| **Tagline** | Decide. Connect. Deliver. |
| **Category** | Premium B2B SaaS — operations platform for business events |
| **Tone** | Confident, calm, precise. Never playful, never corporate-bloated. |

## Visual references (inspiration, not copy)

Use as **direction**, not pixel-perfect targets:

- **Linear** — typography, spacing, neutral shell, quiet navigation
- **Stripe** — clarity, trust, restrained color
- **Vercel** — clean surfaces, developer-grade polish
- **Raycast** — density when needed, never clutter

## Color palette

### Light mode (primary)

| Token | Hex | Usage |
|-------|-----|-------|
| Background | `#FAFAFA` | App shell, sidebar |
| Foreground | `#171717` | Primary text |
| Card | `#FFFFFF` | Surfaces on background |
| Muted text | `#737373` | Captions, labels (brand book: `#6B7280` acceptable in marketing) |
| Border | `#E8E8E8` | Dividers, surface edges |
| Primary accent | `#5E6AD2` | Links, focus rings, rare emphasis — not dominant fills |
| Destructive | `#E5484D` | Errors only |

### Dark mode

Neutral near-black backgrounds (`#0A0A0A`), elevated cards (`#141414`), muted text `#A1A1A1`, primary accent `#8B95F5`.

### Rules

- **No glassmorphism**
- **No decorative gradients** on cards, headers, or backgrounds
- **No heavy drop shadows** — borders carry structure
- **Accent sparingly** — most UI is monochrome; color signals meaning

## Typography

- **Font:** Geist Sans (via Next.js), system fallback
- **Mono:** Geist Mono for code, IDs, technical values
- **Hierarchy:** typography-first — size and weight, not color boxes
- **Numbers:** tabular figures for metrics

See [05_design_system.md](./05_design_system.md) for the type scale.

## Iconography

- **Library:** Lucide
- **Stroke:** 1.5px default
- **Size:** 16–18px inline; 20px max in navigation
- **Style:** Outline only; no filled icon sets

## Logo & mark

- Wordmark: **ORVIX** — semibold, tight tracking
- No mascot, no illustrative logos in product UI
- Product icon (if needed): simple geometric mark, single color

## Voice & copy

- Short sentences. Active voice.
- Explain state: "Webhook not verified" not "Error 403"
- Russian and English supported (next-intl); tone must match in both
- Avoid: "awesome", "supercharge", "revolutionize"

## Legacy naming

User-facing UI, emails, and i18n strings use **ORVIX**. Internal identifiers (`leadflow` package name, `leadbridge` signature enum, `leadBridgeLeads` metrics keys, env vars, database names) remain unchanged to avoid breaking deploys and stored data.

## Brand assets

### File locations

| Asset | Path | Use |
|-------|------|-----|
| Symbol | `public/brand/orvix-symbol.svg` | Favicon, compact UI, app icon base |
| Wordmark | `public/brand/orvix-wordmark.svg` | Text-only branding where space is tight |
| Logo (symbol + wordmark) | `public/brand/orvix-logo.svg` | Sidebar, marketing headers |
| Favicon | `public/favicon.svg` | Browser tab (same mark as symbol) |
| App icon | `public/icon.svg` | PWA / generic icon reference |
| Apple touch icon | `public/apple-touch-icon.svg` | iOS home screen (SVG; see TODO below) |

React component: `components/brand/orvix-logo.tsx` — `variant="symbol" | "wordmark" | "logo"`.

### When to use symbol

- Favicon and browser chrome
- Auth screens (login, register) in a small container
- Any context below ~32px where the wordmark would be illegible
- Telegram message signature area (conceptual mark only — product uses text signature)

### When to use wordmark

- Footer or inline text references where a pictorial mark is unnecessary
- Export/print contexts that require text-only branding

### When to use logo (symbol + wordmark)

- Sidebar header
- Login/marketing hero areas with enough horizontal space
- Default choice for product shell branding

### Favicon usage

- `app/layout.tsx` references `/favicon.svg` and `/apple-touch-icon.svg`
- Do not substitute unrelated icons; keep the decision-node symbol consistent

### Logo integrity rules

- **Do not** stretch, skew, or rotate the mark
- **Do not** add drop shadows, gradients, or outlines not in the source SVG
- **Do not** change accent color `#5E6AD2` on the center node without design review
- **Do not** place the logo on busy or low-contrast backgrounds without a clear container
- Minimum clear space: at least the height of the center node around the symbol
- Dark mode: prefer the default SVG on elevated surfaces; invert only via approved dark assets if added later

### TODO

- **Apple touch icon PNG:** Generate `public/apple-touch-icon.png` (180×180) from `orvix-symbol.svg` for older iOS versions that prefer PNG. Until then, `apple-touch-icon.svg` is used.
