# LeadBridge — Meta App Review Notes

Reference for Meta App Review submission and permission justification.

## App type

- **SaaS platform** — one Meta App, many tenant users
- Each user connects their own Facebook identity via OAuth
- Platform credentials in server env only (`DEPLOYMENT_MODE=saas`)

## Permissions requested

| Permission | Why |
|------------|-----|
| `public_profile`, `email` | Identify connected user |
| `pages_show_list` | List Pages user manages |
| `pages_read_engagement` | Page metadata |
| `leads_retrieval` | Fetch lead form submissions |
| `pages_manage_ads` | Lead forms on Pages |
| `ads_read` | Ad account / campaign insights (audit) |
| `business_management` | Business Manager assets |

**Not requested:** `ads_management` (no ad creation/editing in MVP)

## Login product

- Facebook Login for Business
- Configuration ID: `META_LOGIN_CONFIG_ID` (numeric, from Meta Console)
- Redirect URI: `FACEBOOK_REDIRECT_URI`

## Webhook

- Object: Page
- Field: `leadgen`
- Signature: HMAC SHA-256 with `META_APP_SECRET`
- Verify token: `META_WEBHOOK_VERIFY_TOKEN`

## Data handling

- User access tokens: AES-256-GCM encrypted at rest
- App Secret: env only in SaaS, never shown in UI
- Leads: stored per `userId`, isolated multi-tenant
- Telegram bot tokens: encrypted, never returned in API responses

## Reviewer test flow

1. Register / login on staging or production
2. Connect Facebook at `/meta/connect`
3. Select Page, enable Lead Form
4. Submit test lead via Lead Ads Testing Tool
5. Show lead in `/meta/leads` and Telegram notification

## Common rejection fixes

| Issue | Fix |
|-------|-----|
| Redirect URI mismatch | Exact match in Meta Login settings |
| Invalid config_id | Numeric Login Configuration ID in env |
| Webhook verify fails | Public HTTPS URL, matching verify token |
| Missing use case for permission | Document in review notes above |

## Privacy policy / terms

Ensure public URLs are set in Meta App settings before review.
