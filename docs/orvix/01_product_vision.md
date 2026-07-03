# ORVIX Product Vision

## Mission

**ORVIX becomes Mission Control for business events** — the place operators open every morning to know that everything connected, everything flowing, and everything explainable.

## Today (v1 — implemented)

| Capability | Expression |
|------------|------------|
| Source | Meta Lead Ads (Facebook / Instagram forms) |
| Destination | Telegram notifications |
| Connect | OAuth, pages, forms, webhook |
| Observe | Dashboard KPIs, logs, health cards, ad audit |
| Deliver | Worker queue, delivery retries, templates |

The current codebase (`leadflow`) implements this slice as a multi-tenant SaaS.

## Near-term evolution

Generalize the mental model without breaking existing users:

```
Sources → Events → Pipelines → Decisions → Destinations
```

| Layer | Description |
|-------|-------------|
| **Sources** | Channels that emit business events (Meta, Telegram inbound, webhooks, imports) |
| **Events** | Normalized records with payload, attribution, timestamps, and lineage |
| **Pipelines** | Defined paths: what happens to an event from intake to outcome |
| **Decisions** | Rules, filters, routing, human actions — all auditable |
| **Destinations** | Where outcomes go (Telegram, email, webhooks, CRM sync — future) |

## Future modules (not yet built)

These are **directional**. Do not implement without product spec and ORVIX doc updates.

| Module | Role |
|--------|------|
| **Flows** | Visual pipeline builder: Source → Processing → Logic → Destination |
| **Automations** | Trigger → Condition → Action with history |
| **AI** | Summaries, anomaly hints, routing suggestions — always explainable |
| **Analytics** | Traffic, campaigns, cohorts, conversion — decision-oriented, not vanity |
| **Health** | Integrations, queues, workers, API — operational truth |
| **Activity** | Unified event timeline across the platform |
| **Integrations** | Connection store with status, credentials, and diagnostics |

## Information architecture (target)

```
Overview
  Dashboard, Wiki

Integrations
  Meta Platform, Telegram, (future sources)

Data
  Events (Leads), Analytics, Logs

System
  Health, Queues, Settings

Admin (platform)
  Users, Platform config, Audit
```

Navigation and naming should converge toward this map over time.

## Success criteria

ORVIX succeeds when:

1. An operator trusts the dashboard without opening Meta or Telegram separately.
2. A failure is diagnosable in under 60 seconds from in-app signals.
3. The product feels like Linear or Stripe — not like an admin template.
4. New modules plug into the same event model, not parallel silos.

## What we will not do

- Become a generic CRM
- Ship AI that cannot show its reasoning
- Add integrations without health observability
- Sacrifice calm UX for feature checklists
