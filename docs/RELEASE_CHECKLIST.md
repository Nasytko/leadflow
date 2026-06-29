# LeadBridge — Release Checklist

Use before every production deploy.

## Pre-deploy

- [ ] `git status` clean or intentional changes only
- [ ] `npm run build` passes
- [ ] `npm run lint` passes (warnings OK if pre-existing)
- [ ] `npm run security:check` passes
- [ ] `npm run meta:credentials-check` passes
- [ ] `npx prisma validate` passes
- [ ] `npm run db:migrate:deploy` tested on staging (if schema changed)
- [ ] Env on production host matches [DEPLOY_PRODUCTION.md](./DEPLOY_PRODUCTION.md)
- [ ] `npm run production:readiness-check` on production host (with real `.env`)

## Meta credentials (SaaS)

- [ ] `DEPLOYMENT_MODE=saas`
- [ ] `META_APP_ID`, `META_APP_SECRET`, `META_LOGIN_CONFIG_ID` set in env (not DB)
- [ ] `META_LOGIN_CONFIG_ID` is numeric 5–20 digits (not email)
- [ ] `FACEBOOK_REDIRECT_URI` matches Meta App → Facebook Login → Valid OAuth Redirect URIs
- [ ] Legacy DB overrides cleared: `npm run meta:cleanup-legacy-settings` (once after deploy)

## Deploy

See [DEPLOY_PRODUCTION.md](./DEPLOY_PRODUCTION.md).

## Post-deploy smoke

See [META_SMOKE_TEST.md](./META_SMOKE_TEST.md).

- [ ] Health Center `/meta/health` — App Secret source: **env**
- [ ] OAuth connect works (no code 190)
- [ ] Webhook verify succeeds in Meta dashboard
- [ ] Test lead received
- [ ] Telegram delivery works

## Rollback plan

See [ROLLBACK.md](./ROLLBACK.md).

## App Review / permissions

See [META_APP_REVIEW.md](./META_APP_REVIEW.md).
