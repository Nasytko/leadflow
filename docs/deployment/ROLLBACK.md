# LeadBridge — Rollback

## Quick rollback (code only)

1. Deploy previous known-good image / git tag
2. `npm ci && npm run build`
3. Restart web + worker
4. **Do not** run `prisma migrate reset` on production

## Database migrations

- If new migration was applied and causes issues:
  - Prefer forward-fix migration over manual down-migration
  - Prisma has no automatic down — restore from backup if schema is broken

## When to rollback

- OAuth broken for all users (code 190, invalid redirect)
- Webhook signature failures for all events
- Worker crash loop
- Encryption errors (`ENCRYPTION_KEY` mismatch — **cannot** decrypt existing tokens)

## ENCRYPTION_KEY warning

Changing `ENCRYPTION_KEY` invalidates all encrypted Facebook/Telegram tokens in DB. Users must reconnect. **Never rotate without migration plan.**

## Meta legacy cleanup rollback

`meta:cleanup-legacy-settings` only NULLs platform override fields in `integration_settings`. It does **not** delete:

- `facebook_connections`
- pages, forms, leads

No rollback needed unless you intentionally stored correct self-hosted secrets in DB (not used in SaaS).

## Post-rollback verification

Run [META_SMOKE_TEST.md](./META_SMOKE_TEST.md) on previous version.
