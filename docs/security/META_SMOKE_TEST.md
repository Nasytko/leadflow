# LeadBridge — Meta Smoke Test (post-deploy)

~15 minutes. Run as admin + test user.

## 1. Platform credentials (admin)

1. Open `/admin/platform`
2. Confirm:
   - Deployment mode: `saas`
   - App ID source: **env**
   - App Secret: configured, source **env**
   - Login Config ID: valid numeric ID, source **env**
   - No legacy DB override warning (or run cleanup)

CLI:

```bash
npm run meta:credentials-check
npm run production:readiness-check
```

## 2. Health Center

1. `/meta/health` as admin → enable live test
2. OAuth section:
   - `appSecret` → source env
   - `loginConfig` → valid, source env
   - `redirectUri` → matches Meta console
3. As regular user: no raw env names, no secrets, human-readable OAuth errors

## 3. OAuth connect

1. `/meta/connect` → **Подключить Facebook**
2. Complete Meta consent
3. Expect: redirect back, connection status **connected**
4. **Fail if:** OAuthException 190, email in OAuth URL `config_id`

## 4. Sync pipeline

1. `/meta/businesses` — businesses listed
2. `/meta/ad-accounts` — sync ad accounts
3. `/meta/pages` — pages listed, connect at least one
4. `/meta/forms` — forms synced, enable one form

## 5. Webhook

1. Meta App → Webhooks → Page → Subscribe `leadgen`
2. Callback URL: `{NEXTAUTH_URL}/api/webhooks/meta`
3. Verify token matches `META_WEBHOOK_VERIFY_TOKEN`
4. `/meta/webhook` — last verification success

## 6. Test lead

1. Meta Lead Ads Testing Tool → create test lead for connected page/form
2. Within 1–2 min:
   - `/meta/leads` shows new lead
   - `/logs` shows webhook + delivery
3. Duplicate webhook should not create duplicate lead (`userId + leadgenId` unique)

## 7. Telegram

1. `/meta/telegram` — bot connected
2. Health Center → Test Telegram
3. Resend lead from lead detail → message in chat

## 8. Ad audit (optional)

1. `/meta/audit` — select ad account, run audit
2. No Graph permission errors for `ads_read`

## Cleanup legacy (one-time)

```bash
npm run meta:cleanup-legacy-settings
```

Or SQL:

```sql
UPDATE integration_settings
SET "metaAppSecretEncrypted" = NULL, "metaLoginConfigId" = NULL, "metaAppId" = NULL, "configured" = false
WHERE "metaAppSecretEncrypted" IS NOT NULL OR "metaLoginConfigId" IS NOT NULL;
```
