# LeadFlow

**Facebook Lead Ads → Telegram** — multi-tenant SaaS platform.

Connect Facebook Lead Ads to Telegram through a UI-driven setup: register, configure Meta App, connect Facebook, enable forms, connect Telegram, receive leads automatically.

## Features

- Multi-tenant SaaS (isolated data per user)
- Facebook Login for Business OAuth
- Per-user Meta App configuration (encrypted secrets)
- Page and lead form management
- Telegram bot notifications (RU/EN)
- Meta webhook processing with BullMQ workers
- Manual lead import, delivery retries (1m, 5m, 15m)
- Dashboard with KPIs, leads table, logs
- Knowledge base (Wiki) with setup guides
- Russian and English UI (next-intl)
- Dark/light mode
- AES-256-GCM token encryption

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, TypeScript, TailwindCSS |
| i18n | next-intl (ru default) |
| Backend | Next.js Route Handlers |
| Database | PostgreSQL 16 + Prisma |
| Queue | BullMQ + Redis 7 |
| Auth | NextAuth v5 |
| Deploy | Docker, Railway, VPS |

## Production Deployment

**See [DEPLOY.md](DEPLOY.md)** for the complete deployment guide (server requirements, Docker Compose, Railway, Meta setup, checklist).

Quick requirements:
- **Web** + **Worker** + **PostgreSQL** + **Redis** (all required)
- Public HTTPS domain
- `NODE_ENV=production`

## Local Development

```bash
git clone <repo-url>
cd LEAD
cp .env.example .env
npm install

# Start infrastructure
docker compose up postgres redis -d

# Database
npm run db:migrate:dev

# Terminal 1 — Web
npm run dev

# Terminal 2 — Worker (required)
npm run worker
```

Open http://localhost:3000/ru

## Environment Variables

See [`.env.example`](.env.example).

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection |
| `REDIS_URL` | Yes | Redis connection |
| `NEXTAUTH_SECRET` | Yes | Session secret |
| `NEXTAUTH_URL` | Yes (prod) | Public app URL |
| `ENCRYPTION_KEY` | Yes | 64-char hex encryption key |
| `META_*` | Optional | Platform Meta defaults |

## Scripts

```bash
npm run dev                # Development server
npm run build              # Production build
npm run start              # Production server
npm run worker             # BullMQ worker (required)
npm run db:migrate:dev     # Dev migrations
npm run db:migrate:deploy  # Production migrations
npm run db:studio          # Prisma Studio
```

## Docker (full stack)

```bash
# Set NEXTAUTH_SECRET, NEXTAUTH_URL, ENCRYPTION_KEY in .env
docker compose up --build -d
```

## Documentation

| File | Description |
|------|-------------|
| [DEPLOY.md](DEPLOY.md) | Full production deployment guide (RU) |
| [RAILWAY.md](RAILWAY.md) | Railway-specific guide |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System architecture |

## Security

- Facebook/Telegram tokens encrypted at rest (AES-256-GCM)
- Tokens never exposed to frontend
- Redis-based rate limiting
- Webhook verification
- Multi-tenant data isolation
- CSRF protection on mutations

## License

Proprietary — All rights reserved.
