# ORVIX Codebase Cleanup Audit — Epic 9

**Date:** 2026-07-05  
**Scope:** Routes, components, feature recovery, duplicate logic, safe cleanup plan  
**Constraints:** No Prisma/OAuth/webhook security/encryption changes; old URLs preserved via redirect.

---

## Executive summary

After Epics 5–8, ORVIX has a **dual-layer UI**: modern **Connections** flows (`/connections/*`) and legacy **Meta Center** sections (`/meta/*`). Epic 9 inventories both, redirects primary entry points, unifies hooks/helpers, and removes provably dead code.

| Metric | Before Epic 9 | After Epic 9 |
|--------|---------------|--------------|
| Unused nav component | `MetaCenterNav` (dead) | **Deleted** |
| Dead Facebook UI components | 4 files, 0 imports | **Deleted** |
| Canonical Facebook/Telegram/Webhook | `/connections/*` + duplicate `/meta/*` pages | `/meta/connect\|telegram\|webhook` → **redirect** |
| Canonical Leads | `/leads` → `/meta/leads` | **`/leads` canonical**, `/meta/leads` redirect |
| Sync/import hooks | Scattered in components | **`use-facebook-sync-actions`**, existing `use-facebook-lead-import`, **`use-telegram-actions`** |
| Error mapping | Facebook-only in `facebook-sync-errors` | **`action-errors.ts`** (shared) |

---

## 1. Current Routes Inventory

### 1.1 Dashboard routes (`app/[locale]/(dashboard)/*`)

| Path | Purpose | Status | Depends on | Replacement / notes |
|------|---------|--------|------------|---------------------|
| `/dashboard` | Mission Control KPIs | **active** | `dashboard-content` | — |
| `/wiki` | Product wiki | **active** | `wiki-content` | — |
| `/connections/facebook` | Facebook setup + Intelligence Dashboard | **active** | `facebook-setup-flow`, `facebook-intelligence-dashboard` | Primary Facebook UX |
| `/connections/telegram` | Telegram setup flow | **active** | `telegram-setup-flow` | Primary Telegram UX |
| `/connections/webhook` | Webhook test + diagnostics | **active** | `webhook-connection-content` | Primary webhook UX |
| `/leads` | Leads list, filters, detail | **active** | `leads-content` | Canonical (Epic 9) |
| `/logs` | Activity / delivery logs | **active** | logs content | — |
| `/meta/audit` | Ad audit analytics | **active** | `ad-audit-content` | Sidebar "Analytics" |
| `/settings` | User settings | **active** | `settings-content` | — |
| `/meta/health` | Meta deployment health | **active** | `meta-health-center` | Sidebar "Health" |
| `/meta` | Meta Center overview + wizard | **legacy-compatible** | `meta-center-overview` | Deep link; wizard links updated to `/connections/*` |
| `/meta/connect` | Was Facebook setup | **redirect-only** | — | → `/connections/facebook` |
| `/meta/telegram` | Was Telegram setup | **redirect-only** | — | → `/connections/telegram` |
| `/meta/webhook` | Was webhook page | **redirect-only** | — | → `/connections/webhook` |
| `/meta/leads` | Was leads via Meta shell | **redirect-only** | — | → `/leads` |
| `/meta/pages` | Pages management | **legacy-compatible** | `meta-pages-section` → `FacebookPagesSection` | Also in Intelligence Dashboard |
| `/meta/forms` | Forms + import | **legacy-compatible** | `meta-forms-section` → `FormsContent` | Import also on `/connections/facebook` |
| `/meta/businesses` | Business Manager | **legacy-compatible** | `meta-businesses-section` | Also in Intelligence Dashboard |
| `/meta/ad-accounts` | Ad accounts | **legacy-compatible** | `meta-ad-accounts-section` | Also in Intelligence Dashboard |
| `/meta/telegram/messages` | Telegram templates gallery | **legacy-compatible** | `telegram-messages-gallery` | No `/connections` equivalent yet |
| `/meta/diagnostics` | Health alias | **redirect-only** | — | → `/meta/health` |
| `/facebook` | Old shortcut | **redirect-only** | — | → `/connections/facebook` |
| `/facebook/health` | Old health shortcut | **redirect-only** | — | → `/meta/health` |
| `/telegram` | Old shortcut | **redirect-only** | — | → `/connections/telegram` |
| `/forms` | Old forms shortcut | **redirect-only** | — | → `/meta/forms` |
| `/ad-audit` | Old audit shortcut | **redirect-only** | — | → `/meta/audit` |
| `/admin/*` | Admin center | **active** | admin components | Unchanged |

### 1.2 API routes (`app/api/*`) — summary

All API routes remain **active**. Epic 9 does not remove any API handlers.

| Group | Key endpoints | Used by |
|-------|---------------|---------|
| Facebook | `/api/facebook/connect`, `callback`, `refresh`, `reset`, `pages`, `overview`, `status` | Connections, Meta Center |
| Forms | `GET/POST /api/forms`, `PATCH /api/forms/[id]` | Intelligence Dashboard, FormsContent |
| Leads import | `POST /api/meta/leads/import` | `use-facebook-lead-import` |
| Telegram | `GET/POST /api/telegram`, `POST /api/telegram/test`, `/templates` | `use-telegram-actions`, templates page |
| Webhook | `/api/webhooks/meta`, `/api/webhooks/diagnostics` | Webhook content |
| Meta | `/api/meta/center`, `/api/meta/ad-accounts`, `/api/meta/ad-audit` | Meta Center, audit |
| Leads | `/api/leads`, `/api/leads/[id]` | LeadsContent |
| Logs | `/api/logs` | Activity page |

---

## 2. UI Components Inventory

### 2.1 `components/features/connections/` — **Keep (primary)**

| Component | Used by | Business logic |
|-----------|---------|----------------|
| `facebook-setup-flow` | `/connections/facebook`, `/meta/connect` (redirect) | Setup stepper, embeds MetaAccountCard, Intelligence Dashboard when connected |
| `facebook-intelligence-dashboard` | setup-flow when connected | Overview, next steps, action center, import |
| `facebook-action-center` | intelligence-dashboard | Refresh, sync, import, disconnect |
| `facebook-import-leads-card` | intelligence-dashboard | Lead import UI |
| `facebook-*-overview` | intelligence-dashboard | Pages, forms, businesses, ad accounts |
| `telegram-setup-flow` | `/connections/telegram` | Token, chat, test — uses `use-telegram-actions` |
| `webhook-connection-content` | `/connections/webhook` | Test lead + diagnostics |

### 2.2 `components/meta-center/` — **Keep (legacy shell, no nav)**

| Component | Used by | Can delete? |
|-----------|---------|-------------|
| `meta-center-nav` | **Nothing** | **Deleted Epic 9** — 0 imports since Epic 5 |
| `meta-center-overview` | `/meta` | Keep — wizard hub for power users |
| `meta-onboarding-wizard` | overview | Keep — links updated to `/connections/*` |
| `meta-section-shell` | All meta sections | Keep — thin wrapper |
| `meta-*-section` | `/meta/*` pages | Keep until sections merged into Connections |
| `meta-health-center` | `/meta/health` | Keep — deployment diagnostics |

### 2.3 `components/facebook/` — partial legacy

| Component | Imports | Logic | Epic 9 action |
|-----------|---------|-------|---------------|
| `facebook-oauth-error-alert` | setup-flow, meta-connect | OAuth errors | **Keep** |
| `facebook-login-config-card` | setup-flow, meta-connect | Login config | **Keep** |
| `facebook-pages-section` | setup-flow, meta-pages | Page toggle/sync | **Keep** — candidate **Move** to `features/connections/facebook/` |
| `facebook-businesses-section` | setup-flow, meta-businesses | Business sync | **Keep** — candidate **Move** |
| `facebook-webhook-diagnostics` | webhook content, meta-webhook | Webhook status | **Keep** |
| `facebook-test-lead-card` | webhook content, meta-webhook | Test lead | **Keep** |
| `facebook-identity-card` | **None** | — | **Deleted** |
| `facebook-status-card` | **None** | — | **Deleted** |
| `facebook-manual` | **None** | — | **Deleted** |
| `facebook-setup-wizard` | **None** (type only) | Types moved to `lib/connections/meta-wizard-state.ts` | **Deleted** |

### 2.4 Other legacy folders

| Folder | Status | Notes |
|--------|--------|-------|
| `components/forms/forms-content` | **Keep** | Legacy `/meta/forms`; uses `use-facebook-lead-import` |
| `components/telegram/telegram-content` | **Keep** | Used by `meta-telegram-section` only |
| `components/leads/leads-content` | **Keep** | Canonical leads UI |
| `components/features/meta/meta-account-card` | **Keep** | Connect step + meta-connect section |

---

## 3. Feature Recovery Inventory

### 3.1 Facebook / Meta

| Feature | Old location | New location (Epic 8–9) | Status |
|---------|--------------|-------------------------|--------|
| Connect account | Meta Center, `/meta/connect` | `/connections/facebook` setup step | ✅ |
| Reconnect / disconnect / refresh | MetaAccountCard, account overview | **Action Center** | ✅ |
| Sync pages / forms / ad accounts | MetaAccountCard, scattered buttons | **Action Center** + section sync buttons | ✅ (duplicate sync buttons remain — Beta cleanup) |
| Enable/disable forms | FormsContent, `/meta/forms` | Intelligence Dashboard forms list | ✅ |
| Import existing leads | FormsContent only (Epic 7 regression) | **Import card** + Action Center | ✅ Epic 8 |
| Send imported to Telegram | Import card checkbox | ✅ | ✅ |
| Send test lead | `/meta/webhook` | Action Center → `/connections/webhook` | ✅ Epic 9 link fix |
| Webhook verify/check | Setup webhook step, `/connections/webhook` | ✅ | ✅ |
| View activity/logs | Various "View activity" links | `/logs` | ✅ |
| Ad audit | `/meta/audit` | Sidebar Analytics | ✅ |
| Pages/forms/business/ad overview | Meta sections | Intelligence Dashboard | ✅ |

### 3.2 Telegram

| Feature | Location | Status |
|---------|----------|--------|
| Save bot token / chat ID | `telegram-setup-flow` | ✅ via `use-telegram-actions` |
| Send test message | setup-flow summary + test step | ✅ |
| Message templates | `/meta/telegram/messages` | ✅ legacy route (no redirect yet) |
| Update token/chat | Connected summary buttons | ✅ |
| Delivery errors | `mapTelegramErrorHint` + i18n | ✅ |
| View activity | Link to `/logs` in summary | ✅ |

### 3.3 Leads

| Feature | Location | Status |
|---------|----------|--------|
| List / filters / search | `leads-content` at `/leads` | ✅ |
| Detail sheet | leads-content | ✅ |
| Export | Check API — UI if present | Partial — export via API exists; verify in QA |
| Retry delivery | Lead detail | ✅ (existing) |

### 3.4 Logs / Activity

| Feature | Location | Status |
|---------|----------|--------|
| Delivery / webhook / system logs | `/logs` | ✅ |
| Filters | logs content | ✅ |

---

## 4. Duplicate Logic Inventory

| Logic | Locations | Epic 9 resolution |
|-------|-----------|-------------------|
| Sync pages/forms/ad accounts | `use-meta-account-actions`, intelligence dashboard inline, section buttons | **`use-facebook-sync-actions`** for dashboard; account actions keep refresh/reconnect/disconnect |
| Import leads | `FormsContent`, import card | Shared **`use-facebook-lead-import`** |
| Telegram save/test/load | `telegram-setup-flow`, `telegram-content` | **`use-telegram-actions`** in setup-flow; `telegram-content` still duplicate — **Merge candidate Beta** |
| Connection status | `facebook-health`, overview service, setup-state | **`facebook-health.ts`**, **`facebook-setup-state.ts`** — keep |
| Telegram status | setup-state only | **`telegram-health.ts`** added (Epic 9) |
| API error → toast | Multiple components | **`action-errors.ts`** (`mapConnectionApiError`) |
| Action disabled reasons | action-center | **`facebook-actions.ts`** |
| Next steps | intelligence dashboard | **`facebook-next-steps.ts`** |
| Date formatting | `lib/utils.formatDate` | ✅ centralized |

---

## PHASE 2 — Safe Refactor Plan

### Keep

- All `app/api/*` routes
- `components/features/connections/*` (primary UX)
- `components/meta-center/*` except deleted nav
- `components/facebook/*` remaining shared sections (oauth, pages, webhook, test lead)
- `FormsContent`, `LeadsContent`, `TelegramContent` for legacy routes until Beta merge

### Move (Beta — not Epic 9)

- `components/facebook/facebook-*-section.tsx` → `components/features/connections/facebook/`
- `components/forms/forms-content.tsx` → `components/features/leads/` or deprecate when `/meta/forms` redirects to Connections forms section only

### Merge (Beta)

- `telegram-content` + `telegram-setup-flow` shared hook usage (`use-telegram-actions` in both)
- Remove duplicate sync buttons from Pages/Forms/Ad Accounts sections when Action Center is sufficient
- `use-meta-account-actions` sync methods → delegate fully to `use-facebook-sync-actions`

### Redirect (implemented Epic 9)

| From | To |
|------|-----|
| `/meta/connect` | `/connections/facebook` |
| `/meta/telegram` | `/connections/telegram` |
| `/meta/webhook` | `/connections/webhook` |
| `/meta/leads` | `/leads` |
| `/facebook`, `/telegram`, `/forms`, `/ad-audit`, `/facebook/health`, `/meta/diagnostics` | (already existed) |

### Delete (implemented Epic 9)

| File | Proof |
|------|-------|
| `components/meta-center/meta-center-nav.tsx` | 0 imports; removed from UI Epic 5 |
| `components/facebook/facebook-identity-card.tsx` | 0 imports |
| `components/facebook/facebook-status-card.tsx` | 0 imports |
| `components/facebook/facebook-manual.tsx` | 0 imports |
| `components/facebook/facebook-setup-wizard.tsx` | 0 component imports; types → `lib/connections/meta-wizard-state.ts` |

### Do NOT delete until Beta

- `components/meta-center/**` (sections still routed)
- `components/forms/forms-content.tsx` (serves `/meta/forms` via redirect from `/forms`)
- `components/telegram/telegram-content.tsx` (serves meta-telegram-section)
- `/meta` overview page
- `/meta/telegram/messages` (templates — no Connections equivalent)

---

## New / updated modules (Epic 9)

| Module | Role |
|--------|------|
| `lib/connections/meta-wizard-state.ts` | Wizard step types for Meta Center API |
| `lib/connections/action-errors.ts` | Human-readable API errors (Facebook, Telegram) |
| `lib/connections/facebook-actions.ts` | Action disabled reason helper |
| `lib/connections/telegram-health.ts` | Telegram connection health score |
| `hooks/use-facebook-sync-actions.ts` | Unified pages/forms/adAccounts sync |
| `hooks/use-telegram-actions.ts` | Telegram load/save/test |

---

## Tests

| Test file | Coverage |
|-----------|----------|
| `tests/facebook-next-steps.test.ts` | Next steps resolver |
| `tests/facebook-health.test.ts` | Facebook health score |
| `tests/facebook-sync-errors.test.ts` | Error mapping + disabled reasons (imports from new modules) |
| `tests/telegram-health.test.ts` | Telegram health score |
| `tests/telegram-setup-state.test.ts` | Telegram setup + error hints |

Route redirect behavior: **not unit-tested** (requires Next.js integration/e2e). Verified via page implementation review.

---

## Remaining risks

1. **Duplicate sync UI** — Action Center + per-section sync buttons on Facebook page.
2. **`/meta/forms` still renders FormsContent** — full duplicate of forms/import UX vs Intelligence Dashboard.
3. **Meta Center overview** (`/meta`) still reachable but not in sidebar — intentional deep link.
4. **Telegram templates** only at `/meta/telegram/messages` — add Connections link in Beta.
5. **`telegram-content` vs `telegram-setup-flow`** — two Telegram UIs for meta vs connections paths.

---

## What cannot be deleted before Beta

- Meta Center section components and `/meta/*` sub-routes (except redirected entry points)
- `FormsContent` until `/meta/forms` is redirected or merged
- All API routes and Prisma models
- OAuth callback routes and webhook handlers
- Admin center
