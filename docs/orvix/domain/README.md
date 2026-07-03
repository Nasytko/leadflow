# ORVIX Domain Model

This folder defines the **long-term product architecture** for ORVIX — the Event Engine foundation.

It is the source of truth for how business data moves through the platform. It does not describe current Prisma schemas, API routes, or UI. Those will converge toward this model over time.

## Core thesis

**Event is the central entity.** Lead, message, form submission, webhook payload, import row, API call — all are Events with different `type` and `source`, processed by the same engine.

```
Source → Event → Decision Flow → Decision → Destination → Activity → Analytics
```

## Reading order

| # | Document | Topic |
|---|----------|-------|
| 01 | [Event](./01_event.md) | Central entity, attributes, taxonomy |
| 02 | [Source](./02_source.md) | Ingestion contract, adapters |
| 03 | [Destination](./03_destination.md) | Delivery contract, adapters |
| 04 | [Decision](./04_decision.md) | Decision Flows, business logic layer |
| 05 | [Activity](./05_activity.md) | Observable action stream |
| 06 | [Lifecycle](./06_event_lifecycle.md) | End-to-end processing stages |
| 07 | [Terminology](./07_terminology.md) | Naming recommendations |
| 08 | [Information architecture](./08_information_architecture.md) | App structure target |

## Relationship to today

| Today (v1) | Future (Event Engine) |
|------------|------------------------|
| Lead | Event (`type: lead`) |
| Meta webhook → worker → Telegram | Source adapter → Event → Decision Flow → Destination |
| Delivery logs | Activity on Event timeline |
| System logs | Platform Activity + Event-scoped Activity |
| Facebook / Telegram settings | Connections (Sources + Destinations) |

Migration is **additive and gradual**. Existing Meta/Telegram behavior must keep working while the event model is introduced behind stable facades.

## For builders

Before adding integrations, pipelines, or new data models, read this folder. If a proposal introduces a parallel concept (e.g. a second “message” entity unrelated to Event), reconcile it here first.
