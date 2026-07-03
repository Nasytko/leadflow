# Destination

## Definition

A **Destination** is any channel where ORVIX delivers the **outcome** of Event processing.

Destinations are symmetric to Sources: adapters behind one contract. Telegram, HubSpot, a customer webhook, and Google Sheets must share delivery semantics — attempt, retry, record Activity, surface errors.

---

## Destination contract

### 1. Identity

| Field | Purpose |
|-------|---------|
| `kind` | `telegram`, `email`, `slack`, `webhook`, `google_sheets`, `hubspot`, `bitrix24`, `salesforce`, `crm`, … |
| `connectionId` | Workspace-scoped instance |
| `displayName` | UI label |

### 2. Delivery

| Capability | Description |
|------------|-------------|
| `deliver(event, context)` | Send normalized outcome; `context` includes decision outputs, template id, routing key |
| `format(event)` | Map `normalizedPayload` → destination-specific shape |
| `validateConfig()` | Pre-flight: token ok, sheet exists, field mapping complete |

Delivery is **always triggered by Decision Flow routing**, never by Source adapters directly (v1 Telegram send is legacy exception to migrate behind Destination).

### 3. Reliability

| Capability | Description |
|------------|-------------|
| `idempotencyKey(event, destination)` | Prevent duplicate sends on replay |
| `retryPolicy` | Backoff, max attempts, dead-letter behavior |
| `deliveryResult` | Success / retryable / permanent failure + machine-readable code |

### 4. Health

Same operator expectations as Sources:

- Last successful delivery
- Failure rate (windowed)
- Test delivery action
- Credential / permission status

### 5. Templates & mapping

| Concept | Purpose |
|---------|---------|
| **Template** | Presentation layer (Telegram message, email body) |
| **Field mapping** | CRM column ← normalized fields |
| **Routing key** | Which chat, pipeline stage, sheet tab |

Templates are Destination-scoped configuration, not Event fields.

---

## Destination kinds (catalog)

| Kind | Outcome shape | Typical use |
|------|---------------|-------------|
| **telegram** | Message | Instant alerts to managers |
| **email** | MIME message | Digests, escalations |
| **slack** | Block kit / text | Team channels |
| **webhook** | HTTP POST | Customer automation |
| **google_sheets** | Row append | Lightweight ops |
| **hubspot** | Contact / deal API | CRM sync |
| **bitrix24** | Lead / deal API | CRM sync |
| **salesforce** | Lead / custom object | Enterprise CRM |

**Generic `crm` kind** — optional abstraction when mappings share 80% of behavior; specific kinds when OAuth and object models diverge.

---

## One Event, many Destinations

Decision Flow may route a single Event to:

```
Telegram (immediate alert)
  +
HubSpot (create contact)
  +
Webhook (customer ERP)
```

Event tracks **per-destination status**:

| Destination state | Meaning |
|-------------------|---------|
| `pending` | Queued |
| `in_flight` | Worker executing |
| `delivered` | Confirmed success |
| `failed_retryable` | Will retry |
| `failed_permanent` | Needs human fix |
| `skipped` | Rule said do not send |

Event-level `status` aggregates required destinations (see [01_event.md](./01_event.md)).

---

## Delivery vs Activity

| Delivery | Activity |
|----------|----------|
| Side effect on external system | Record inside ORVIX |
| May fail and retry | Append-only truth |
| Implemented by worker | Read by operators |

Every delivery attempt creates **Activity** entries whether or not it succeeds.

---

## Principles

1. **Destinations are dumb pipes plus formatting** — business rules live in Decision Flows.
2. **No silent drops** — skipped delivery still logs Activity with reason.
3. **Replay-safe** — idempotency keys survive Event replay.
4. **Explain errors** — “HubSpot 403: missing scope `crm.objects.contacts.write`” not “Error 500”.

---

## v1 legacy mapping

| Today | Destination model |
|-------|-------------------|
| Telegram bot + template | `kind: telegram` + template config |
| `telegramStatus` on Lead | Event destination state for telegram connection |
| Delivery logs | Activity `type: delivery` |

Meta is a **Source**, not a Destination — except when ORVIX writes back to Meta (future), which would be a separate Destination kind.

---

## Extension without architecture change

Adding Bitrix24:

1. Destination adapter + OAuth connection
2. Field mapping UI under Connections
3. Decision Flow node “Deliver to Bitrix24”
4. No change to Event schema — only `destinations[]` entries
