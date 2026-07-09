# ORVIX Product System

ORVIX is an operations platform for business events — not a CRM, not a connector dashboard.

This folder is the **source of truth** for product philosophy, brand, UX, design system, and frontend architecture. All major UI, UX, and structural changes must align with these documents.

## Reading order

| # | Document | Purpose |
|---|----------|---------|
| 00 | [Manifesto](./00_manifesto.md) | Why ORVIX exists |
| 01 | [Product vision](./01_product_vision.md) | Where we are going |
| 02 | [Brand book](./02_brand_book.md) | Visual identity |
| 03 | [Design principles](./03_design_principles.md) | How interfaces should feel |
| 04 | [UX principles](./04_ux_principles.md) | How users should experience the product |
| 05 | [Design system](./05_design_system.md) | Tokens, components, patterns |
| 06 | [Frontend architecture](./06_frontend_architecture.md) | Code organization |
| 07 | [Cursor rules](./07_cursor_rules.md) | AI-assisted development guardrails |

## Domain model (Event Engine)

Long-term product architecture — read before new integrations or data models:

| | Document | Topic |
|---|----------|-------|
| — | [Domain index](./domain/README.md) | Event Engine overview |
| 01 | [Event](./domain/01_event.md) | Central entity |
| 02 | [Source](./domain/02_source.md) | Ingestion contract |
| 03 | [Destination](./domain/03_destination.md) | Delivery contract |
| 04 | [Decision](./domain/04_decision.md) | Decision Flows |
| 05 | [Activity](./domain/05_activity.md) | Activity stream |
| 06 | [Lifecycle](./domain/06_event_lifecycle.md) | Processing stages |
| 07 | [Terminology](./domain/07_terminology.md) | Naming recommendations |
| 08 | [Information architecture](./domain/08_information_architecture.md) | App structure target |

## Relationship to the codebase

The repository (`leadflow`) is the implementation of ORVIX. User-facing UI, metadata, and i18n use the **ORVIX** brand; internal package and infrastructure names may still use `leadflow` / `leadbridge` where required for compatibility.

## When to update

Update these docs when you:

- Change design tokens in `app/globals.css`
- Add or rename core UI components
- Introduce a new layout pattern or navigation structure
- Expand product scope (new modules: Flows, Decision Flows, Sources, Destinations, etc.)
- Change the domain model — update `domain/` first

Do **not** update docs for one-off page tweaks that already follow the system.
