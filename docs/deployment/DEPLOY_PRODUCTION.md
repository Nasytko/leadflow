# LeadBridge — Production Deploy

## Required environment variables

```env
NODE_ENV=production
DEPLOYMENT_MODE=saas

# App
NEXTAUTH_URL=https://fb.nasytko.ru
NEXTAUTH_SECRET=<random 32+ bytes>
ENCRYPTION_KEY=<64 hex chars = 32 bytes AES key>

# Database & queue
DATABASE_URL=postgresql://...
REDIS_URL=redis://...

# Meta platform (single app for all tenants)
META_APP_ID=1543348640634245
META_APP_SECRET=<from Meta Developer Console>
META_LOGIN_CONFIG_ID=1045043297861606
FACEBOOK_REDIRECT_URI=https://fb.nasytko.ru/api/facebook/callback
META_WEBHOOK_VERIFY_TOKEN=<your verify token>
META_WEBHOOK_SIGNATURE_REQUIRED=true

# Optional
TURNSTILE_SECRET_KEY=...
SMTP_*=...
```

Generate keys:

```bash
openssl rand -hex 32   # ENCRYPTION_KEY
openssl rand -base64 32  # NEXTAUTH_SECRET
```

## Deploy steps

1. Pull release tag / branch on server
2. `npm ci`
3. `npx prisma migrate deploy`
4. `npm run build`
5. Restart app process (PM2 / Docker / systemd)
6. Restart worker: `npm run worker`
7. On first deploy after credentials fix:
   ```bash
   npm run meta:cleanup-legacy-settings
   ```

## Verify env (no secrets printed)

```bash
npm run production:readiness-check
```

## Meta Developer Console

| Setting | Value |
|---------|-------|
| OAuth Redirect URI | `FACEBOOK_REDIRECT_URI` |
| Webhook Callback URL | `{NEXTAUTH_URL}/api/webhooks/meta` |
| Webhook Verify Token | `META_WEBHOOK_VERIFY_TOKEN` |
| Webhook fields | `leadgen` |

## Admin checks after deploy

- `/admin/platform` — credential sources show **env**
- `/meta/health` — login config valid, secret source env
- Clear legacy warning if present → **Очистить legacy Meta settings**

## Architecture note

In SaaS mode, `integration_settings` platform fields (`metaAppSecretEncrypted`, `metaLoginConfigId`) are **ignored** for OAuth. Env is the only source of truth. See `docs/META_ARCHITECTURE.md`.
