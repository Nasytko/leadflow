# Event

## Definition

An **Event** is a discrete business occurrence that entered ORVIX from a **Source**, was interpreted by the platform, optionally transformed by **Decision Flows**, and may have outcomes delivered to one or more **Destinations**.

An Event is not a UI label. It is the canonical record of *something that happened* and *what ORVIX did about it*.

| Concept today | Event Engine view |
|---------------|-------------------|
| Facebook lead | `type: lead`, `source: meta` |
| Inbound Telegram message | `type: message`, `source: telegram` |
| Webhook POST body | `type: webhook`, `source: http` |
| CSV import row | `type: record`, `source: csv` |
| REST API submission | `type: submission`, `source: api` |

**Any Lead is an Event.** Not every Event is a Lead.

---

## Why Event, not Lead

Lead-centric modeling made sense for v1 (Meta Lead Ads → Telegram). It breaks when ORVIX adds:

- Non-lead signals (delivery failures, campaign thresholds, bot messages)
- Multiple sources emitting the same semantic outcome
- One inbound signal fanning out to many destinations
- Replay, audit, and analytics across channels

Event is **channel-agnostic** and **outcome-oriented**. Attribution (campaign, form, page) lives in `payload` and `normalizedPayload`, not in the entity name.

---

## Event attributes

These are **logical fields** — the product contract. Physical storage may split tables for performance; the domain model stays unified.

### Identity & classification

| Field | Purpose |
|-------|---------|
| `id` | Globally unique, immutable. Stable across replay and references. |
| `type` | Semantic category: `lead`, `message`, `form_submission`, `webhook`, `record`, `signal`, `system`, … |
| `source` | Reference to Source that produced the Event (id + kind). |
| `sourceEventId` | External id from source when available (e.g. Meta `leadgen_id`). Idempotency key component. |
| `workspaceId` | Tenant boundary. All Events belong to exactly one workspace. |

### Time

| Field | Purpose |
|-------|---------|
| `receivedAt` | When ORVIX accepted the Event (ingestion clock). |
| `occurredAt` | When the event happened in the real world, if known (source timestamp). |
| `processedAt` | When processing reached a terminal or paused state. |

### Payload

| Field | Purpose |
|-------|---------|
| `payload` | Raw, source-faithful representation. Immutable after ingest (append-only corrections via new Activity). |
| `normalizedPayload` | ORVIX canonical shape for decisions, UI, and destinations. Schema-versioned. |
| `attachments` | Binary or structured enrichments: files, images, exports. References, not inline blobs in hot path. |

`normalizedPayload` examples:

- Lead: `{ name, phone, email, fields, attribution: { campaign, ad, form, page } }`
- Message: `{ text, chatId, sender, media }`
- Webhook: `{ headers, body, signatureVerified }`

Normalization rules are **per source + per type**, not global one-size-fits-all.

### Processing state

| Field | Purpose |
|-------|---------|
| `status` | High-level lifecycle state (see [06_event_lifecycle.md](./06_event_lifecycle.md)). |
| `decisionFlowId` | Active or completed Decision Flow version. |
| `decisionHistory` | Ordered list of decisions applied: rule id, outcome, actor (system / AI / human), timestamp, explanation. |
| `destinations` | Planned and actual delivery targets: destination id, status per destination, last error. |

### Observability

| Field | Purpose |
|-------|---------|
| `timeline` | Denormalized view of Activity entries for fast UI (or pointer to Activity stream). |
| `metadata` | Non-business tags: ingestion path, correlation ids, debug flags, schema version, locale. |

`metadata` is for operators and tracing. **Decisions must not depend on opaque metadata** — use `normalizedPayload` or explicit decision inputs.

---

## Event status (summary)

Detailed transitions in [06_event_lifecycle.md](./06_event_lifecycle.md).

| Status | Meaning |
|--------|---------|
| `received` | Accepted, not yet normalized |
| `normalized` | Canonical shape ready |
| `processing` | Inside Decision Flow |
| `routing` | Destinations selected, delivery pending |
| `delivered` | All required destinations succeeded |
| `partial` | Some destinations succeeded, some failed |
| `failed` | Terminal failure (no successful required delivery) |
| `blocked` | Intentionally stopped (spam, policy, manual hold) |
| `archived` | Retained for analytics, no further processing |

---

## Event taxonomy (types)

Types are **extensible**. Core set for the next 5–10 years:

| Type | Typical sources | Notes |
|------|-----------------|-------|
| `lead` | Meta, TikTok, website forms, CSV | High-value conversion signal |
| `message` | Telegram, WhatsApp, email inbound | Conversational |
| `form_submission` | Website, REST | May or may not be a “lead” commercially |
| `webhook` | HTTP, partner systems | Generic envelope; may promote to typed Event |
| `record` | CSV, API bulk | Batch-derived unit Event |
| `signal` | Health, thresholds, schedules | Operational, not customer-facing |
| `system` | ORVIX internal | Replay, migration, admin actions |

Subtypes via `normalizedPayload.subtype` when needed — avoid exploding top-level `type` enum.

---

## Principles

1. **Immutability of truth** — `payload` is never silently rewritten. Corrections are new Activities or explicit superseding Events.
2. **Explainability** — `decisionHistory` must answer “why was this routed / blocked / delayed?”
3. **Idempotency** — `(workspaceId, source, sourceEventId)` prevents duplicate Events when sources retry.
4. **Lineage** — Every Destination delivery links back to Event `id`.
5. **Workspace isolation** — Events never cross tenant boundaries.

---

## What Event is not

- **Not a CRM contact.** Contacts may be derived; Event is the occurrence.
- **Not a queue job.** Jobs implement processing; Event is the business record.
- **Not a log line.** Logs are implementation detail; Activity is the product-facing stream.

---

## Legacy mapping (v1 → Event Engine)

| v1 concept | Event Engine |
|------------|--------------|
| `Lead` row | Event `type: lead` |
| `fieldData` / attribution | `normalizedPayload` |
| `rawData` from Meta | `payload` |
| `telegramStatus` on lead | Destination delivery state on Event |
| Lead detail “delivery history” | Event `timeline` / Activity |

This mapping guides migration without forcing a big-bang rename in UI or database.
