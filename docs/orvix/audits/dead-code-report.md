# Dead Code Audit — Epic 11

**Date:** 2026-07-06  
**Tools:** TypeScript import graph, `depcheck`, `ts-prune` (`npm run unused`)

---

## Summary

| Action | Count |
|--------|------:|
| Files deleted | 28 |
| Files moved | 18 |
| Redirect routes removed (→ `next.config.ts`) | 19 |
| i18n namespace removed | 1 (`metaCenter`) |

---

## Deleted files

| File | Reason | Last reference |
|------|--------|----------------|
| `app/api/meta/center/route.ts` | No client callers after Epic 10 UI removal | None |
| `lib/meta-center-health.ts` | Only used by deleted `/api/meta/center` | Deleted route |
| `lib/connections/meta-wizard-state.ts` | Zero imports | None |
| `components/meta/meta-ad-accounts-section.tsx` | Zero imports | None |
| `components/meta/ad-audit-*.tsx` (3) | Moved to `features/analytics/` | Updated imports |
| `components/meta/` folder | Empty after moves | — |
| `components/dashboard/` (6 files) | Moved to `features/dashboard/` | App pages updated |
| `components/leads/leads-content.tsx` | Moved to `features/leads/` | `leads/page.tsx` |
| `components/logs/logs-content.tsx` | Moved to `features/activity/` | `activity/page.tsx` |
| `components/telegram/telegram-message-preview.tsx` | Moved to `features/telegram/` | `templates-gallery.tsx` |
| `app/.../meta/**/page.tsx` (14) | Replaced by `next.config.ts` redirects | Bookmarks |
| `app/.../facebook/**/page.tsx` (2) | Centralized redirect | Bookmarks |
| `app/.../telegram/page.tsx` | Centralized redirect | Bookmarks |
| `app/.../forms/page.tsx` | Centralized redirect | Bookmarks |
| `app/.../logs/page.tsx` | Centralized redirect | Bookmarks |
| `app/.../ad-audit/page.tsx` | Centralized redirect | Bookmarks |

---

## Moved files

| From | To |
|------|-----|
| `components/dashboard/*` | `components/features/dashboard/` |
| `components/leads/leads-content.tsx` | `components/features/leads/` |
| `components/logs/logs-content.tsx` | `components/features/activity/` |
| `components/meta/ad-audit-*.tsx` | `components/features/analytics/` |
| `components/telegram/telegram-message-preview.tsx` | `components/features/telegram/` |
| `messages metaCenter.*` | `workspaceHealth`, `connections.facebook.*`, `admin.platformMeta` |
| Epic docs `docs/orvix/*` | `docs/archive/epics/`, `docs/product/` |
| Ops docs | `docs/deployment/`, `docs/security/`, `docs/architecture/` |

---

## i18n migration

| Old | New |
|-----|-----|
| `metaCenter` (health UI) | `workspaceHealth` |
| `metaCenter.accountCard` | `connections.facebook.accountCard` |
| `metaCenter.help` | `connections.shared.help` |
| `metaCenter.adminPlatform` | `admin.platformMeta` |
| `metaCenter.errors` | `connections.facebook.oauthErrors` |

---

## Remaining legacy (intentional)

| Item | Reason |
|------|--------|
| `package.json` name `leadflow` | npm package identity |
| `/api/meta/*` routes | Facebook platform API naming |
| `lib/meta-*` modules | Graph API integration layer |
| `leadbridge` telegram signature enum | Persisted user setting value |
| `leadBridgeLeads` analytics field | Internal metric name |

---

## Protection tools

```bash
npm run unused   # depcheck + ts-prune
```

---

## Validation

All checks pass: `build`, `lint`, `test` (46), `security:check`, `unused`.
