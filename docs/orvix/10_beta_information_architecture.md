# ORVIX Beta Information Architecture — Epic 10

**Date:** 2026-07-05  
**Status:** Beta-ready product IA

---

## Principles

1. **One product surface** — no "Meta Center" in user-facing UI.
2. **Connections own integration UX** — Facebook, Telegram, Webhook/API.
3. **Data owns operational records** — Leads, Activity, Analytics.
4. **Workspace owns account & diagnostics** — Settings, Health.
5. **Legacy `/meta/*` URLs redirect** — bookmarks and old links keep working.

---

## Sidebar (canonical)

| Group | Item | Route |
|-------|------|-------|
| Overview | Mission Control | `/dashboard` |
| Overview | Wiki | `/wiki` |
| Connections | Facebook | `/connections/facebook` |
| Connections | Telegram | `/connections/telegram` |
| Connections | Webhook/API | `/connections/webhook` |
| Data | Leads | `/leads` |
| Data | Activity | `/activity` |
| Data | Analytics | `/analytics` |
| Workspace | Settings | `/settings` |
| Workspace | Health | `/health` |
| Admin | Admin Center | `/admin/*` (admins only) |

---

## Feature module layout

```
components/features/
  facebook/
    account/          — account-card, account-overview, action-center
    business/         — business-overview, business-setup-section
    pages/            — pages-overview, pages-setup-section
    forms/            — forms-overview, import-leads-card, forms-setup-panel
    ads/              — ad-accounts-overview
    health/           — health-panel, next-steps, webhook-diagnostics, test-lead-card
    activity/         — activity-timeline
    intelligence-dashboard.tsx
    setup-flow.tsx
  telegram/
    setup-flow.tsx
    telegram-intelligence-dashboard.tsx
    telegram-health-panel.tsx
    telegram-delivery-status.tsx
    telegram-activity-link.tsx
    telegram-templates-preview.tsx
    templates-gallery.tsx
  analytics/
    ad-audit-content.tsx
  health/
    workspace-health-content.tsx
  shared/
    connection-help-tip.tsx
  connections/
    connection-page-shell.tsx
    setup-stepper.tsx
    webhook/webhook-connection-content.tsx
```

---

## Facebook connected experience

When Facebook is connected, `/connections/facebook` shows **Intelligence Dashboard**:

1. Account + Health
2. Next steps
3. **Action Center** (single place for sync, import, test webhook, refresh)
4. Business / Pages / Forms + Import / Ad accounts / Activity

Section lists **do not duplicate sync buttons** — Action Center owns sync actions.

---

## Telegram connected experience

When Telegram is connected, `/connections/telegram` shows **Telegram Intelligence Dashboard**:

1. Overview (bot, chat, actions)
2. Health + Delivery status
3. Templates preview
4. Activity link → `/activity`

---

## Mission Control (Dashboard)

- **Lead pipeline:** Source → Processing → Delivery
- **Health strip:** Facebook, Telegram, Webhook (from stats API)
- **KPIs:** today / week / month leads
- **Problems:** delivery failures, setup incomplete

---

## Legacy redirects

| Legacy | Canonical |
|--------|-----------|
| `/meta` | `/dashboard` |
| `/meta/connect` | `/connections/facebook` |
| `/meta/telegram` | `/connections/telegram` |
| `/meta/webhook` | `/connections/webhook` |
| `/meta/forms`, `/pages`, `/businesses`, `/ad-accounts` | `/connections/facebook` |
| `/meta/audit`, `/ad-audit` | `/analytics` |
| `/meta/health`, `/meta/diagnostics`, `/facebook/health` | `/health` |
| `/meta/leads` | `/leads` |
| `/meta/telegram/messages` | `/connections/telegram` |
| `/logs` | `/activity` |
| `/forms` | `/connections/facebook` |
| `/facebook`, `/telegram` | `/connections/*` |

---

## Removed (Epic 10)

- `components/meta-center/**` — entire folder (19 files)
- `components/forms/**` — `forms-content.tsx`
- `components/telegram/telegram-content.tsx`, `telegram-messages-gallery.tsx`
- `components/facebook/**` — legacy section components (10 files)
- `components/features/connections/facebook/**` — duplicate Facebook UI (13 files)
- `components/features/connections/telegram/telegram-setup-flow.tsx`
- `components/features/meta/meta-account-card.tsx`
- `components/meta/ad-audit-content.tsx` — duplicate of `features/analytics/ad-audit-content.tsx`
- Duplicate sync buttons in Facebook section overviews
- User-visible "Meta Center" navigation

---

## Beta blockers (follow-up)

- E2E tests for redirect routes
- Migrate remaining `metaCenter.*` i18n keys to product namespaces (strings still used internally; no user-facing "Meta Center" in nav)
- `lib/meta-center-health.ts` still powers `/api/meta/center` (API-only; no UI surface)
- `components/meta/ad-audit-*` polish widgets could move under `features/analytics/` in a future cleanup
