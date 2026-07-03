# Source

## Definition

A **Source** is any channel through which business Events enter ORVIX.

Sources are **adapters** behind a single product contract. Meta, TikTok, a customer webhook, CSV upload, and a REST endpoint must behave identically from the Event Engine’s perspective: authenticate, ingest, emit Events, report health.

---

## Source contract

Every Source implementation must provide:

### 1. Identity

| Capability | Description |
|------------|-------------|
| `kind` | Stable enum: `meta`, `tiktok`, `telegram`, `whatsapp`, `webhook`, `rest`, `csv`, `website`, `email`, … |
| `connectionId` | Workspace-scoped connection instance |
| `displayName` | Human label in Connections UI |

### 2. Ingestion

| Capability | Description |
|------------|-------------|
| `receive(rawInput)` | Accept raw input (HTTP body, file row, poll result, bot update) |
| `validate()` | Signature, auth, schema checks — fail fast with explainable errors |
| `toEvents(rawInput)` | Produce one or more Event drafts (`payload`, `sourceEventId`, `occurredAt`) |
| `idempotencyKey` | Derive stable key per source semantics |

Ingestion modes:

| Mode | Examples |
|------|----------|
| **Push** | Webhooks, Telegram bot updates |
| **Pull** | Meta Graph sync, scheduled imports |
| **Upload** | CSV, batch files |
| **Submit** | REST API POST from customer systems |

### 3. Normalization

| Capability | Description |
|------------|-------------|
| `normalize(eventDraft)` | Map to `normalizedPayload` for known `type` |
| `schemaVersion` | Declare normalization schema version for migrations |

Normalization may be **source-owned** (Meta lead shape) or **workspace-configured** (custom webhook field mapping).

### 4. Health & operations

| Capability | Description |
|------------|-------------|
| `healthCheck()` | Token validity, webhook verified, last success, error class |
| `capabilities` | What this connection can emit: `leads`, `messages`, `webhooks`, … |
| `refresh()` | Re-sync metadata (pages, forms, catalogs) without re-OAuth when possible |

Health surfaces in **Connections** and **Health** — same status model for all sources (see [meta-connection-status pattern](../../audits/functional-ux-audit.md) as v1 precedent).

### 5. Credentials

| Rule | Description |
|------|-------------|
| Encrypted at rest | Tokens, secrets never plain in DB |
| Scoped per workspace | No platform-wide user tokens in tenant paths |
| Rotation-friendly | Refresh without breaking Event idempotency |

---

## Source kinds (catalog)

Architectural targets — not a commitment to build all at once.

| Kind | Ingestion | Typical Event types | Notes |
|------|-----------|---------------------|-------|
| **meta** | OAuth + webhook + Graph | `lead` | v1 implemented |
| **tiktok** | OAuth + webhook | `lead` | Same contract as Meta |
| **website** | Embed + REST | `form_submission`, `lead` | First-party forms |
| **webhook** | HTTP POST | `webhook` → may promote | Generic ingress |
| **rest** | Authenticated API | `submission`, `record` | Customer systems |
| **csv** | Upload / SFTP | `record`, `lead` | Batch → many Events |
| **telegram** | Bot long-poll / webhook | `message` | Inbound + outbound dest overlap |
| **whatsapp** | Business API | `message` | Paired with Destination |
| **email** | Inbound parse | `message` | Optional future |

Each kind registers:

- Default Decision Flow suggestion
- Required Connection setup steps
- Health check suite

---

## Source vs Connection

| Term | Meaning |
|------|---------|
| **Source (kind)** | Type of integration (Meta, Webhook, …) |
| **Connection** | Workspace’s configured instance (credentials, options) |

UI lives under **Connections**. Domain language prefers **Source** for ingestion logic.

---

## Uniform behavior guarantees

Regardless of kind, operators must always see:

1. **Connected / degraded / disconnected** — same severity model
2. **Last event received** — timestamp and count
3. **Last error** — what failed and next step
4. **Test ingress** — “send test event” where applicable

---

## Boundaries

| Source does | Source does not |
|-------------|-----------------|
| Validate and accept input | Choose CRM vs Telegram (Decision Flow) |
| Emit Event drafts | Deliver to destinations |
| Report connection health | Store long-term analytics aggregates |

---

## Extension without architecture change

Adding TikTok in year 3:

1. Implement Source adapter (`kind: tiktok`)
2. Register normalization for `type: lead`
3. Attach default Decision Flow template
4. No new central entity — Events flow through existing engine

That is the 5–10 year bet: **new channels are adapters, not product forks.**
