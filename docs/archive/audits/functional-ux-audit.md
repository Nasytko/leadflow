# Functional UX Audit — Desktop + Mobile

**Date:** 2026-07-03  
**Scope:** ORVIX Epic 3 — core flows, Meta Center, responsive behavior  
**Method:** Code review + component/API inspection (build/lint/test validation)

## Summary

| Area | Desktop | Mobile | Notes |
|------|---------|--------|-------|
| Dashboard | OK | OK | KPI surfaces, pipeline, skeletons; bottom nav via `MobileNav` |
| Leads | OK | Partial | Table → detail sheet on mobile; filters dense at 390px |
| Meta Connect | **Improved** | **Improved** | New `MetaAccountCard`, actions, bottom sheet |
| Meta Pages | OK | OK | Card layout (not table); touch targets on toggle |
| Settings | OK | OK | Standard form layout |
| Login / Register | OK | OK | ORVIX symbol, centered card, footer compact |
| Empty states | OK | OK | `EmptyState` on dashboard/leads/forms |
| Loading | Partial | Partial | Meta connect now uses skeletons; some sections still plain text |
| Error states | OK | OK | Toasts + inline error blocks with next-step copy |
| Legacy brand | OK | OK | No LeadBridge/LeadFlow in user-facing i18n |
| Old visual style | Partial | Partial | Meta pages section still uses Facebook blue accents (functional, not redesigned) |

## Findings by viewport

### 390px (mobile)

- **OK:** Bottom navigation (`MobileNav`), auth cards, meta account card stacked actions (≥44px), leads detail sheet.
- **Risk:** Leads filter row wraps heavily; consider drawer filters in a future pass.
- **Risk:** Forms list in Meta Center can feel long — already card-based, no horizontal scroll.
- **Fixed:** Meta Connect had minimal connected-state info and one CTA — replaced with full account card + action sheet.

### 768px (tablet)

- **OK:** Sidebar hidden, mobile nav active; meta account card shows primary actions inline.
- **OK:** Dashboard grid collapses to single column KPIs.

### 1024px+ (desktop)

- **OK:** Sidebar + content; meta account card shows full action grid with inline disconnect confirm.
- **OK:** Page headers and section spacing follow ORVIX type scale.

## Meta / Facebook connection (before → after)

### Before

- Connect page showed name only when connected.
- No unified connection status model in UI.
- Actions scattered (reconnect on same button as connect).
- No refresh flow combining token check + pages + forms.
- Email not persisted.

### After (Epic 3)

- `MetaAccountCard` shows avatar, name, email, user ID, status, token status, pages/forms counts, dates.
- `lib/meta/meta-connection-status.ts` — unified status: `connected`, `needs_reconnect`, `expired`, `not_connected`, `error`.
- Actions: Refresh, Reconnect, Disconnect (confirm), Sync pages, Sync forms, Test lead, View logs.
- `POST /api/facebook/refresh` — check token/profile + sync pages + forms.
- `facebookUserEmail` migration — stored when Graph API returns email (requires `email` scope, already in OAuth).

## Pages audited

| Page | Route | Empty | Loading | Error |
|------|-------|-------|---------|-------|
| Dashboard | `/dashboard` | Yes | Skeleton | Toast + retry |
| Leads | `/leads` | Yes | Yes | Toast |
| Meta Overview | `/meta` | Partial | Yes | — |
| Meta Connect | `/meta/connect` | Yes | **Skeleton** | OAuth alert + card error |
| Meta Pages | `/meta/pages` | Yes | Skeleton | Inline warning |
| Meta Forms | `/meta/forms` | Yes | Skeleton | Toast |
| Settings | `/settings` | — | Yes | Toast |
| Login | `/login` | — | — | Toast |
| Register | `/register` | — | — | Toast |

## Intentionally not changed

- Visual language / design tokens (per Epic 3 scope).
- Auth, webhook, OAuth routes, token encryption.
- Facebook blue on legacy `FacebookPagesSection` buttons (functional accent for Meta brand recognition).

## Recommended next steps

1. Leads: mobile filter drawer instead of stacked selects.
2. Meta Pages: migrate Facebook blue buttons to ORVIX neutral + accent pattern.
3. Logs: deep-link filter for `source=facebook` on “View connection logs”.
4. Generate `apple-touch-icon.png` (from Epic 2 TODO).
5. Add E2E smoke for Meta connect happy path with mocked Graph API.

## Verification

```bash
npm run build
npm run lint
npm test
```

See Epic 3 implementation report for results.
