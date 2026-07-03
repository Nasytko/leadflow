# ORVIX Frontend Architecture

## Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 App Router |
| Language | TypeScript |
| Styling | Tailwind CSS v4 + CSS variables in `app/globals.css` |
| Components | shadcn/ui patterns, customized for ORVIX |
| i18n | next-intl (`messages/ru.json`, `messages/en.json`) |
| Auth | NextAuth v5 (session in server components) |

## Directory model

```
app/                          # Routes — composition only
  [locale]/
    (dashboard)/              # Authenticated shell
      layout.tsx              # Sidebar + Header + Footer
      dashboard/page.tsx      # Thin page → feature component
  api/                        # Route handlers (no UI)

components/
  ui/                         # Design system primitives
  layout/                     # App shell (sidebar, header, footer)
  dashboard/                  # Dashboard feature
  leads/                      # Leads feature
  meta-center/                # Meta integration hub
  meta/                       # Meta sub-features (audit, etc.)
  admin/                      # Admin center
  settings/                   # User settings
  ...                         # Other feature modules

lib/                          # Shared utilities, no UI
services/                     # Business logic (server)
hooks/                        # Client hooks
types/                        # Shared TypeScript types
messages/                     # i18n strings
docs/orvix/                   # Product & design source of truth
```

### Target: `components/features/`

Long-term, feature modules may move under `components/features/<name>/`. Today features live in top-level `components/<feature>/` — **do not duplicate** during migration; rename in a dedicated refactor.

## Layer responsibilities

### `app/**/page.tsx` — composition only

```tsx
// Good
export default function LeadsPage() {
  return <LeadsContent />;
}

// Bad — 200 lines of UI in page.tsx
```

Pages: auth check (if not in layout), metadata, render one feature component.

### `components/ui/` — primitives

Reusable, product-agnostic building blocks:

- Button, Card, Input, Select, Dialog, Sheet
- PageHeader, SectionHeader, KpiCard, StatusBadge, EmptyState

**Rules:**

- No API calls
- No `useSession` (except providers)
- Props-driven, documented variants

### `components/layout/` — shell

- Sidebar, Header, Footer, MobileNav
- ThemeToggle, LanguageSwitcher

One shell for authenticated product. Admin uses `admin-shell.tsx` variant.

### Feature folders — product blocks

- `*-content.tsx` — main page body
- Section components for large domains
- May fetch client-side or receive props from server page

**Rules:**

- Use `components/ui` — never reimplement Button
- Use ORVIX typography utilities (`.type-display`, etc.)
- Strings via `useTranslations` — no hardcoded user-facing text

## Data flow

```
page.tsx (server)
  → optional server data fetch
  → <FeatureContent initialData={...} />

FeatureContent (client)
  → fetch /api/* for interactive updates
  → CSRF header on mutations (CsrfProvider)
```

Do not call Prisma from client components.

## Styling rules

1. **Tokens** from `globals.css` — `bg-background`, `text-muted-foreground`, etc.
2. **Utilities** from ORVIX layer: `.surface`, `.type-display`, `.nav-item-active`
3. **No inline styles** for product UI
4. **cn()** from `lib/utils` for conditional classes
5. New colors → update `globals.css` + `docs/orvix/05_design_system.md`

## i18n

- Keys grouped by domain: `dashboard.*`, `leads.*`, `nav.*`
- Both `ru` and `en` required for new keys
- ORVIX branding in new strings; legacy LeadBridge keys migrated gradually

## Adding a new page

1. Read `docs/orvix/` (at minimum principles + design system)
2. Create `app/[locale]/(dashboard)/<route>/page.tsx` — thin
3. Create `components/<feature>/<feature>-content.tsx`
4. Use `PageHeader` or dashboard-style display title
5. Add nav entry in `components/layout/sidebar.tsx` + i18n
6. Run `npm run build` && `npm run lint`

## What not to do

- Duplicate `KpiCard` as `MetricCard` with slightly different styles
- Create `components/ui/button-v2.tsx`
- Put business logic in `components/ui`
- Add page-specific global CSS
- Bypass layout shell for authenticated routes

## Related docs

- [05_design_system.md](./05_design_system.md)
- [07_cursor_rules.md](./07_cursor_rules.md)
- [ARCHITECTURE.md](../../ARCHITECTURE.md) — backend & infra
