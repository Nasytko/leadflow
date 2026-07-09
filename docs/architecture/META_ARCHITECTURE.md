# LeadBridge Meta Architecture

## Platform model (multi-tenant SaaS)

| Layer | Responsibility |
|-------|----------------|
| **Platform** | One Meta App (`META_APP_ID` / `META_APP_SECRET`), one OAuth callback, one webhook URL |
| **Tenant (User)** | Own Facebook OAuth token, businesses, ad accounts, pages, forms, leads, insights |

`FacebookConnection` = **MetaConnection** (OAuth user token per `userId`, `@unique`).

`IntegrationSettings` is optional per-user override for self-hosted; **SaaS uses env credentials only** (see `lib/meta-platform-credentials.ts`).

### Platform credentials source of truth

| `DEPLOYMENT_MODE` | App ID / Secret / Login Config / Webhook verify token |
|-------------------|--------------------------------------------------------|
| `saas` | **env only** — DB fields in `integration_settings` are ignored for OAuth |
| `self_hosted` | DB override if valid, else env fallback |

Env variables:

- `META_APP_ID`
- `META_APP_SECRET`
- `META_LOGIN_CONFIG_ID` (or `FACEBOOK_LOGIN_CONFIG_ID`)
- `META_WEBHOOK_VERIFY_TOKEN`
- `FACEBOOK_REDIRECT_URI`

### Legacy DB cleanup (production)

If OAuth fails with code 190 or logs show invalid Login Config ID (e.g. email in DB), clear legacy overrides:

```bash
npm run meta:cleanup-legacy-settings
```

Or SQL (safe — does not touch `facebook_connections`, pages, forms, or leads):

```sql
UPDATE integration_settings
SET
  "metaAppSecretEncrypted" = NULL,
  "metaLoginConfigId" = NULL,
  "metaAppId" = NULL,
  "configured" = false
WHERE "metaAppSecretEncrypted" IS NOT NULL
   OR "metaLoginConfigId" IS NOT NULL
   OR "metaAppId" IS NOT NULL;
```

Verify after deploy: `/admin/platform` or `/meta/health` — active source should be `env`.


## Entity map

| Target name | Prisma model | Scope |
|-------------|--------------|-------|
| MetaConnection | `FacebookConnection` | 1 per user |
| MetaBusiness | `FacebookBusiness` | N per user |
| MetaPage | `FacebookPage` | N per user |
| MetaLeadForm | `FacebookForm` | N per page |
| MetaAdAccount | `MetaAdAccount` | N per user |
| MetaCampaign | `MetaCampaign` | N per ad account |
| MetaAdSet | `MetaAdSet` | N per ad account |
| MetaAd | `MetaAd` | N per ad account |
| MetaInsightSnapshot | `MetaInsightSnapshot` | audit history |

## OAuth scopes (MVP)

`public_profile`, `email`, `pages_show_list`, `pages_read_engagement`, `leads_retrieval`, `pages_manage_ads`, `ads_read`, `business_management`

**Not requested:** `ads_management` (write access deferred).

## Post-OAuth sync pipeline

1. `GET /me` — profile
2. `debug_token` — scopes
3. `GET /me/businesses` → `FacebookBusiness`
4. `GET /me/adaccounts` → `MetaAdAccount`
5. `GET /me/accounts` → `FacebookPage` + page tokens
6. `GET /{pageId}/leadgen_forms` → `FacebookForm`
7. Optional: `POST /{pageId}/subscribed_apps` on page connect

## Ad audit

- `GET /api/meta/ad-audit?adAccountId=&period=last_7d|last_30d`
- Graph: `act_{id}/insights` (account, campaign, ad level)
- CPL = spend / max(insight leads, local leads)
- Snapshots stored in `MetaInsightSnapshot`
- UI: `/ad-audit`

## Lead attribution

`Lead` stores Meta IDs (denormalized) + optional FKs:

- `pageDbId`, `businessDbId`
- `adAccountDbId`, `campaignDbId`, `adSetDbId`, `adDbId`

Resolved via `resolveLeadAttributionLinks()` on webhook/import.

## Multi-tenant isolation checklist

| Area | Status |
|------|--------|
| API routes `userId` from session | OK |
| Pages/forms/leads queries scoped | OK |
| Ad accounts/campaigns scoped | OK |
| Webhook page routing by Meta `page_id` | OK (collision guard) |
| Webhook signature secret | **Gap:** platform secret via `getWebhookAppSecret()` — fix for BYO-app |
| `WebhookEvent.userId` at ingest | Partial — set after job |

## Audit findings (legacy assumptions)

1. **`primaryBusinessId`** — first business from sync order; never used in UI (no single-business assumption in API).
2. **`ads_read`** — was in OAuth but unused; now drives ad account sync.
3. **No single ad account hardcode** — clean.
4. **One Meta identity per app user** — by design (`FacebookConnection.userId @unique`).

## API surface

| Endpoint | Purpose |
|----------|---------|
| `/api/facebook/*` | OAuth, pages, businesses, status |
| `/api/meta/ad-accounts` | List/sync ad accounts |
| `/api/meta/ad-accounts/[id]/sync-campaigns` | Sync campaigns/adsets/ads |
| `/api/meta/ad-audit` | Insights + warnings + snapshot |
| `/api/forms`, `/api/leads` | Lead pipeline (unchanged paths) |

## Onboarding wizard (9 steps)

Facebook → Business → Ad account → Pages → Forms → Webhook → Telegram → Test lead → Ad audit
