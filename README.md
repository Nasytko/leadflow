# ORVIX

**Lead operations platform** — connect Meta Lead Ads, automate delivery, and observe every event.

ORVIX is a multi-tenant B2B SaaS for teams that need Facebook/Instagram leads in Telegram (and beyond) without writing integration code. Built as a calm, premium operations tool — not a CRM, not a connector dashboard.

> **Public Alpha** — production-ready core; API and domain model will evolve toward the [Event Engine](docs/orvix/domain/README.md).

<!-- TODO: Add screenshots — Mission Control, Meta Connect, Leads list -->

## Features

| Area | What you get |
|------|----------------|
| **Meta** | OAuth (Facebook Login for Business), pages, forms, webhook, ad audit |
| **Telegram** | Bot connection, message templates, delivery retries |
| **Leads** | Search, filters, detail sheet, CRM status, CSV export |
| **Mission Control** | KPIs, integration pipeline, health signals |
| **Meta Health** | Full diagnostics with actionable fixes |
| **Security** | Encrypted tokens, webhook signatures, CSRF, rate limits |
| **i18n** | Russian + English |
| **Theming** | Light / dark mode |

## Architecture

```
Meta Webhook / Graph API
        ↓
   Next.js API (auth, CSRF, rate limit)
        ↓
   PostgreSQL (Prisma)  ←→  Redis (BullMQ)
        ↓
   Worker (lead processing, Telegram delivery)
```

| Component | Technology |
|-----------|------------|
| Web | Next.js 15, TypeScript, Tailwind |
| i18n | next-intl |
| DB | PostgreSQL 16 + Prisma |
| Queue | BullMQ + Redis 7 |
| Auth | NextAuth v5 |

See [ARCHITECTURE.md](ARCHITECTURE.md) and [docs/orvix/](docs/orvix/) for product system and long-term [Event Engine domain model](docs/orvix/domain/README.md).

## Quick start (local)

```bash
git clone https://github.com/your-org/orvix.git
cd orvix
cp .env.example .env
# Edit .env — set NEXTAUTH_SECRET, ENCRYPTION_KEY, DATABASE_URL, REDIS_URL

npm install
docker compose up postgres redis -d
npm run db:migrate:dev

# Terminal 1 — web
npm run dev

# Terminal 2 — worker (required for webhooks & Telegram)
npm run worker
```

Open http://localhost:3000/ru

## Docker (full stack)

```bash
# Set NEXTAUTH_SECRET, NEXTAUTH_URL, ENCRYPTION_KEY in .env
docker compose up --build -d
```

Production: see [DEPLOY.md](DEPLOY.md), [VPS_DEPLOY.md](VPS_DEPLOY.md), or [RAILWAY.md](RAILWAY.md).

## Environment variables

See [`.env.example`](.env.example). Required for production:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL |
| `REDIS_URL` | Queue + rate limiting |
| `NEXTAUTH_SECRET` | Sessions |
| `NEXTAUTH_URL` | Public app URL |
| `ENCRYPTION_KEY` | 64-char hex — token encryption |
| `META_APP_ID` / `META_APP_SECRET` | Platform Meta app (SaaS mode) |
| `META_LOGIN_CONFIG_ID` | Facebook Login for Business |

Run `npm run security:check` after configuring env.

## Scripts

```bash
npm run dev              # Development server
npm run build            # Production build
npm run start            # Production server
npm run worker           # Background worker
npm run lint             # ESLint
npm test                 # Unit tests
npm run db:migrate:deploy  # Production migrations
```

## Security

- AES-256-GCM encryption for OAuth tokens at rest
- Meta webhook `X-Hub-Signature-256` validation
- CSRF on authenticated mutations
- Redis rate limiting (login, register, API)
- Multi-tenant data isolation

Report vulnerabilities: see [SECURITY.md](SECURITY.md).

## Roadmap

| Version | Focus |
|---------|--------|
| **Alpha (now)** | Meta → Telegram, Mission Control, Health, Ad Audit |
| **Beta 0.2** | Events naming, Activity stream, Connections IA |
| **0.3+** | Decision Flows UI, webhook Source, second destinations |

Full product direction: [docs/orvix/01_product_vision.md](docs/orvix/01_product_vision.md).

## Documentation

| Path | Description |
|------|-------------|
| [docs/orvix/](docs/orvix/) | Brand, UX, design system |
| [docs/orvix/domain/](docs/orvix/domain/) | Event Engine architecture |
| [DEPLOY.md](DEPLOY.md) | Production deployment (RU) |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). We welcome issues and PRs for Alpha.

## License

MIT — see [LICENSE](LICENSE).

---

Built by [Pavel Nasytko](https://github.com/Nasytko).
