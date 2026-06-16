# LeadFlow — Railway Deployment Guide

> Полное руководство по публикации (требования к серверу, Docker, чеклист): **[DEPLOY.md](DEPLOY.md)**

## Overview

LeadFlow requires four Railway services:

1. **Web** — Next.js application
2. **Worker** — BullMQ lead processor
3. **PostgreSQL** — Database
4. **Redis** — Queue and rate limiting

## Step 1: Create Railway Project

1. Go to [railway.app](https://railway.app) and create a new project
2. Add **PostgreSQL** plugin
3. Add **Redis** plugin

## Step 2: Deploy Web Service

1. Connect your GitHub repository
2. Railway will detect `Dockerfile` and `railway.json`
3. Set the following environment variables:

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
NEXTAUTH_SECRET=<generate-32-byte-secret>
NEXTAUTH_URL=https://your-app.up.railway.app
ENCRYPTION_KEY=<64-hex-characters>
META_APP_ID=<from-meta-developers>
META_APP_SECRET=<from-meta-developers>
META_WEBHOOK_VERIFY_TOKEN=<your-verify-token>
FACEBOOK_REDIRECT_URI=https://your-app.up.railway.app/api/facebook/callback
NODE_ENV=production
```

### Generate secrets

```bash
# NEXTAUTH_SECRET
openssl rand -base64 32

# ENCRYPTION_KEY (64 hex chars)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Step 3: Deploy Worker Service

1. Add a new service from the same repository
2. Set **Dockerfile Path** to `Dockerfile.worker`
3. Share the same environment variables as the web service (except `NEXTAUTH_URL` is optional)
4. The worker does not need a public port

## Step 4: Run Database Migrations

From Railway shell or locally with production `DATABASE_URL`:

```bash
npx prisma migrate deploy
```

## Step 5: Configure Meta App

### Facebook Login for Business

1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Create a Business app
3. Add **Facebook Login for Business** product
4. Configure OAuth redirect URI:
   ```
   https://your-app.up.railway.app/api/facebook/callback
   ```
5. Request permissions:
   - `pages_show_list`
   - `pages_read_engagement`
   - `leads_retrieval`
   - `ads_read`
   - `pages_manage_ads`

### Webhooks

1. In Meta App → Webhooks → Page
2. Callback URL:
   ```
   https://your-app.up.railway.app/api/webhooks/meta
   ```
3. Verify Token: same as `META_WEBHOOK_VERIFY_TOKEN`
4. Subscribe to `leadgen` field

## Step 6: Custom Domain (Optional)

1. Railway → Settings → Domains → Add custom domain
2. Update `NEXTAUTH_URL` and `FACEBOOK_REDIRECT_URI`
3. Update Meta app redirect URI and webhook URL

## Architecture on Railway

```
┌─────────────┐     ┌─────────────┐
│   Web App   │────▶│  PostgreSQL │
│  (Next.js)  │     └─────────────┘
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌─────────────┐
│    Redis    │◀────│   Worker    │
│   (BullMQ)  │     │ (lead-proc) │
└─────────────┘     └─────────────┘
       ▲
       │
┌──────┴──────┐
│ Meta Webhook│
└─────────────┘
```

## Health Checks

- Web: `GET /ru/login` returns 200
- Worker: check logs for "LeadFlow worker ready"

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Facebook OAuth fails | Verify `FACEBOOK_REDIRECT_URI` matches Meta app exactly |
| Webhook not receiving events | Ensure page is connected and subscribed to leadgen |
| Telegram not sending | Check bot token, chat ID, and worker logs |
| Leads not processing | Verify Redis connection and worker is running |
| Token encryption errors | Ensure `ENCRYPTION_KEY` is identical on web and worker |

## Scaling

- **Web**: increase replicas for more traffic
- **Worker**: increase replicas or `concurrency` in `lib/queue.ts`
- **Redis/Postgres**: upgrade Railway plugin tiers as needed
