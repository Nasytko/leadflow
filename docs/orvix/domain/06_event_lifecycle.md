# Event Lifecycle

End-to-end journey of an Event through ORVIX — from ingress to archive. This is the **operational state machine** the product is built around.

```
Receive → Normalize → AI → Decision → Routing → Delivery → Monitoring → Replay → Archive
```

Stages may be skipped when a Decision Flow has no step of that kind (e.g. no AI). Stages are **ordered within a Flow execution**, not globally mandatory.

---

## Stage 1: Receive

**What happens**

- Source adapter accepts input (webhook, poll, upload, API)
- Auth and signature validation
- Idempotency check — duplicate `sourceEventId` → no duplicate Event (return existing)
- Event created: `status: received`, `payload` stored, `receivedAt` set

**Activity**

- `event.received`
- On duplicate: `event.duplicate_suppressed` (info)

**Failure modes**

| Failure | Outcome |
|---------|---------|
| Invalid signature | Reject at ingress; workspace Activity `connection.error` |
| Unknown connection | 401/404; no Event |
| Payload too large | Reject with explainable limit |

---

## Stage 2: Normalize

**What happens**

- Decision Flow normalize step (or Source default normalizer)
- `normalizedPayload` produced and schema-validated
- `status: normalized`

**Activity**

- `event.normalized` with schema version

**Failure modes**

| Failure | Outcome |
|---------|---------|
| Unmappable payload | `status: failed` or quarantine queue for manual mapping |
| Partial data | Normalize what is possible; flag missing required fields in `decisionHistory` |

---

## Stage 3: AI (optional)

**What happens**

- AI Decision steps run in Flow order
- Outputs merged into processing **context** (not overwriting `payload`)
- May influence later rules (priority, route branch)

**Activity**

- `ai.started`, `ai.completed` or `ai.failed`

**Failure modes**

| Failure | Outcome |
|---------|---------|
| Timeout | Flow policy: skip, block, or human queue |
| Policy block | `event.blocked` with explanation |

AI never skips Activity — operators see that AI ran or failed.

---

## Stage 4: Decision

**What happens**

- Rule, filter, assign, enrich, transform steps execute
- Each appends to `decisionHistory`
- Terminal decisions: `block`, `hold` (human), or proceed to routing

**Activity**

- `event.decision` per material step

**Failure modes**

| Failure | Outcome |
|---------|---------|
| Rule error | `status: failed`; retry if transient |
| Human hold | `status: processing` until operator acts |

---

## Stage 5: Routing

**What happens**

- `route` step resolves Destination list + templates + mappings
- Event `destinations[]` populated with `pending` states
- `status: routing`

**Activity**

- `event.routing` with destination ids

**Failure modes**

| Failure | Outcome |
|---------|---------|
| No destination configured | `partial` or `failed` based on flow policy |
| Invalid mapping | Fail before queue; surface in Connections UI |

---

## Stage 6: Delivery

**What happens**

- Worker executes per-destination `deliver()`
- Retries per `retryPolicy`
- Per-destination status updated
- Event `status`: `delivered`, `partial`, or `failed`

**Activity**

- `event.delivered`, `event.delivery_failed`, `event.retry`

**Failure modes**

| Failure | Outcome |
|---------|---------|
| Retryable (5xx, rate limit) | Backoff retry |
| Permanent (403, invalid chat) | Stop retry; operator notified |
| Partial multi-dest | `partial` — show which succeeded |

---

## Stage 7: Monitoring

**What happens**

- Continuous, not a single transition
- Health checks on Sources and Destinations
- Anomaly signals: volume drop, error rate spike, queue lag
- May emit `type: signal` Events into same engine

**Product surfaces**

- Mission Control aggregates
- Health module per connection
- Insights (analytics layer on Events + Activity)

Monitoring does not mutate Event `status` unless a remedial Flow is triggered.

---

## Stage 8: Replay

**What happens**

- Operator or system re-runs processing for an existing Event
- Idempotency on **delivery**, not on Event identity
- Same `event.id`; new execution id; new Activity chain

**When**

- Destination was down; now fixed
- Decision Flow version fixed mapping error
- Manual “resend to CRM”

**Activity**

- `event.replay` with actor and reason

**Rules**

- Replay does not duplicate Event at ingress
- Replay may skip normalize if `normalizedPayload` unchanged (policy)

---

## Stage 9: Archive

**What happens**

- Event moves to long-term retention tier
- Hot index trimmed; `status: archived`
- Analytics aggregates retained

**Triggers**

- Retention policy (age, volume)
- Explicit block/spam terminal state
- Compliance deletion workflows (separate policy)

**Activity**

- `event.archived`

Archived Events are **read-only**; replay requires explicit unarchive or copy-to-new-execution policy (product decision at implementation time).

---

## State diagram (summary)

```
received → normalized → processing → routing → delivered
                ↓           ↓          ↓         partial
              failed     blocked    failed      failed
                ↓           ↓          ↓
            archived ← ← ← ← ← ← ← ← ← ←
```

`processing` covers Decision + AI + human hold.

---

## Correlation across stages

| Id | Purpose |
|----|---------|
| `event.id` | Business record |
| `execution.id` | One run through Decision Flow |
| `delivery.id` | One destination attempt |
| `correlationId` | Cross-service trace |

---

## Time expectations (product SLOs — directional)

| Stage | Target perception |
|-------|-------------------|
| Receive → normalized | Sub-second for webhooks |
| Decision (no AI) | Sub-second |
| AI step | Seconds, async UI |
| Delivery | Seconds; retries invisible to operator unless failing |
| Activity visible | Near real-time in UI |

---

## Lifecycle and analytics

Analytics reads **completed** Events:

- Volume by `type`, `source`, time
- Conversion through Decision steps (funnel)
- Destination success rates
- Time-to-deliver

Event lifecycle is the **fact table**; Activity is the **event log** for operations.

---

## v1 today

Meta webhook → worker → Telegram maps roughly to:

```
Receive → Normalize (implicit) → Decision (implicit pass) → Routing (fixed) → Delivery
```

Epic 4 makes this path **explicit, configurable, and source-agnostic** without changing v1 behavior until migration phases execute.
