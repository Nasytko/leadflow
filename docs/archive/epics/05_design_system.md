# ORVIX Design System

Living reference for the current implementation. Tokens live in `app/globals.css`. Components live in `components/ui/`.

When tokens or patterns change, update this file in the same change.

---

## Typography scale

Utility classes defined in `globals.css`:

| Class | Size | Weight | Tracking | Use |
|-------|------|--------|----------|-----|
| `.type-display` | 28px (1.75rem) | semibold | -0.03em | Page title (one per view) |
| `.type-title` | 15px | medium | -0.01em | Section titles, card titles |
| `.type-body` | 14px | regular | normal | Body text, table cells |
| `.type-caption` | 13px | regular | normal | Descriptions, meta, timestamps |
| `.type-label` | 12px | medium | +0.01em | Labels, nav groups, table headers |

**Numbers:** use `tabular-nums` on metrics and table counts.

**Font stack:** `var(--font-geist-sans)` → system UI fallback.

---

## Spacing

| Context | Value |
|---------|-------|
| Page horizontal padding | `px-6` → `lg:px-12` |
| Page vertical padding | `py-10` → `lg:py-14` |
| Max content width | `1080px` (`max-w-[1080px]`) |
| Section gap | `mb-16` – `mb-20` (64–80px) |
| Surface inner padding | `px-6 py-6` → `sm:px-8 sm:py-8` |
| Card header/content | `px-6 pt-6 pb-4` / `px-6 pb-6` |
| Nav item padding | `px-2.5 py-[7px]` |

Prefer spacing scale over arbitrary margins.

---

## Radius

| Token | Value |
|-------|-------|
| `--radius` | `0.5rem` (8px) |
| Components | `rounded-lg` (8px) default |
| Buttons, inputs | `rounded-lg` |
| Avatars | `rounded-full` |

Avoid `rounded-2xl` on product surfaces unless explicitly needed.

---

## Borders

| Token | Light |
|-------|-------|
| `--border` | `#E8E8E8` |
| Surface border | `border-border/70` – `border-border/80` |
| Dividers | `.hairline-b`, `.hairline-y` |

No shadows on static surfaces. Structure comes from borders and background contrast (`#FAFAFA` shell vs `#FFFFFF` card).

---

## Color tokens

See [02_brand_book.md](./02_brand_book.md). Use Tailwind semantic tokens:

- `bg-background`, `text-foreground`
- `bg-card`, `text-muted-foreground`
- `bg-primary`, `text-primary` (sparingly)
- `border-border`

---

## Buttons (`components/ui/button.tsx`)

| Variant | Use |
|---------|-----|
| `default` | Primary CTA — foreground on background (dark fill) |
| `outline` | Secondary actions |
| `ghost` | Tertiary, toolbar, table actions |
| `destructive` | Irreversible delete only |
| `link` | Inline navigation |

Sizes: `sm` (toolbar), `default`, `lg` (rare), `icon` (32px).

**Rules:** no shadow on buttons except none; no gradient fills.

---

## Cards & surfaces

**Card** (`components/ui/card.tsx`): `rounded-lg border border-border/70 bg-card` — no shadow.

**Surface utility** (`.surface`): same as card — use for standalone panels.

**KpiCard** (`components/ui/kpi-card.tsx`):

- `minimal` — metric cell inside divided grid (preferred on dashboard)
- default — bordered surface for isolated metrics

**SectionHeader** (`components/ui/section-header.tsx`): title + optional description + optional action — use instead of card header for sectioned pages.

---

## Tables

- Header row: `.type-label`, `hairline-b`
- Body: `.type-body` for primary column, `.type-caption` for secondary
- Row hover: `hover:bg-foreground/[0.02]` — subtle
- Right-align numeric columns with `tabular-nums`
- Wrap in `.surface.overflow-hidden` — not nested cards

---

## Badges & status

**StatusBadge** (`components/ui/status-badge.tsx`): dot (1.5px circle) + muted text. No pill borders.

**Badge** (`components/ui/badge.tsx`): legacy shadcn — prefer StatusBadge for system health; use Badge only for tags/labels where needed.

---

## Forms

- **Input, Textarea, Select** — `components/ui/*`
- **FieldLabel** — consistent label spacing
- Labels: `.type-label` or `Label` component
- Error text: `text-destructive text-sm` below field
- Full-width inputs in forms; max-width ~480px for settings

---

## Layout shell

### Sidebar (`components/layout/sidebar.tsx`)

- Width: `240px`
- Background: `--sidebar` (= background)
- Border-right: `--sidebar-border`
- Active item: `.nav-item-active` (`bg-foreground/6%`)
- Group labels: `.type-label`
- User block at bottom — avatar initials, name, email

### Header (`components/layout/header.tsx`)

- Height: `48px` (`h-12`)
- Utility bar only: language, theme, avatar, logout
- No page title duplication when content has display title

### Main (`app/[locale]/(dashboard)/layout.tsx`)

- `.app-shell-bg`
- Children provide own `max-w-[1080px] mx-auto`

### Mobile nav

- Fixed bottom, border-top, icon + label
- Active: foreground color — not colored pills

### Footer (`components/layout/footer.tsx`)

- Minimal single row — copyright + links
- Large top margin (`mt-20`) to separate from content

---

## Page header

**PageHeader** (`components/ui/page-header.tsx`): `.type-display` title + body subtitle + action slot. No gradient, no icon box.

Used on: Leads, Forms, Settings, Wiki, Logs, etc.

---

## Charts (`components/dashboard/dashboard-charts.tsx`)

- Primary line: `#5E6AD2`
- Fill gradient: low opacity only under line chart
- Donut: thin stroke, neutral track
- No chartjunk — no heavy grid lines

---

## Loading states

**Skeleton** (`components/ui/skeleton.tsx`): match target geometry, `rounded-lg`.

Prefer skeleton over spinners for page-level load. Spinners only for inline refresh (e.g. refresh button).

---

## Empty states

**EmptyState** (`components/ui/empty-state.tsx`):

- Centered, generous `py-16`
- Single muted icon (opacity ~30%)
- `.type-title` + `.type-caption`
- One CTA button max

---

## Dark mode

All components must use semantic tokens — never hardcode `#FFFFFF` or `#171717` in components. Test light + dark before merge.

---

## Anti-patterns (do not use)

- `rounded-2xl` + `shadow-lg` card grids
- Purple gradient page headers
- Icon in colored 40px box per KPI
- Uppercase screaming section labels (except `.type-label` nav groups)
- `bg-emerald-500/10` filled KPI cards
- Inline `style={{ color: ... }}` for product UI
