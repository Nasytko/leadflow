# Activity

## Definition

**Activity** is the append-only stream of everything ORVIX and operators do relative to Events and the workspace.

If something mattered, it left an Activity. Users answer “what happened?” from Activity — not from server logs alone.

---

## Two scopes

| Scope | Audience | Examples |
|-------|----------|----------|
| **Event Activity** | Operators handling one lead/message | Received, normalized, sent to Telegram, failed, replayed |
| **Workspace Activity** | Admins, audit | Connection refreshed, Flow published, user invited |

Both share the same **Activity model**; Event-scoped entries carry `eventId`.

---

## Activity attributes (logical)

| Field | Purpose |
|-------|---------|
| `id` | Unique |
| `workspaceId` | Tenant |
| `eventId` | Optional — null for workspace-level |
| `type` | Category (see below) |
| `actor` | `system`, `worker`, `user:{id}`, `ai:{model}` |
| `occurredAt` | Timestamp |
| `summary` | Short human line for timeline UI |
| `detail` | Structured payload for drill-down |
| `severity` | `info`, `success`, `warning`, `error` |
| `correlationId` | Trace across worker jobs |

---

## Activity types

### Event lifecycle

| Type | Summary example |
|------|-----------------|
| `event.received` | Event received from Meta |
| `event.normalized` | Payload normalized to schema v2 |
| `event.processing_started` | Decision Flow “Meta lead default” started |
| `event.decision` | Spam check passed |
| `event.routing` | Routed to Telegram + HubSpot |
| `event.delivered` | Delivered to Telegram |
| `event.delivery_failed` | Telegram failed: chat not found |
| `event.retry` | Delivery retry scheduled |
| `event.replay` | Event replayed from archive |
| `event.archived` | Moved to cold storage |
| `event.blocked` | Blocked by spam rule |

### AI

| Type | Summary example |
|------|-----------------|
| `ai.started` | Running summary step |
| `ai.completed` | Summary generated |
| `ai.failed` | Model timeout — using fallback |

### Connection & platform

| Type | Summary example |
|------|-----------------|
| `connection.connected` | Meta account connected |
| `connection.refresh` | Connection refreshed |
| `connection.error` | Meta token expired |
| `flow.published` | Decision Flow v3 published |
| `user.action` | Operator manually re-sent to CRM |

---

## Activity Stream (product surface)

**Activity** replaces “Logs” in information architecture (see [README](./README.md) terminology).

| Old mental model | Activity Stream |
|------------------|-----------------|
| System log file | Filterable timeline with severity |
| Delivery log per lead | Event timeline entries |
| Audit log | Workspace Activity with actor |

UI principles:

1. **Default filter: actionable** — errors and warnings first
2. **Every error has next step** — link to Connection, Flow, or Event
3. **No raw JSON first** — summary line, expand for detail
4. **Event detail = Activity timeline** — single pane of glass

---

## Activity vs Event.timeline

| Concept | Role |
|---------|------|
| `Activity` store | Source of truth, append-only |
| `Event.timeline` | Cached projection for fast Event detail UI |

On write: Activity persisted → timeline updated (async acceptable).

---

## Activity vs technical logs

| Technical logs | Activity |
|----------------|----------|
| Debug verbosity | Product-meaningful actions |
| May rotate / drop | Retained per policy |
| Engineer-facing | Operator-facing |

Workers still emit technical logs internally; **user-visible history is Activity**.

---

## Replay and audit

Replay creates explicit Activity:

```
event.replay — initiated by user:{id}, reason: “Telegram was down”
```

Regenerated deliveries reference same Event `id` with new idempotency attempt ids — history shows both tries.

Compliance exports: Activity + Event `payload` + `decisionHistory`.

---

## Principles

1. **Append-only** — no silent edits; corrections are new Activities
2. **Explain errors** — `delivery_failed` includes code + remediation hint
3. **Actor transparency** — AI and system actions labeled, not disguised as human
4. **Density without noise** — batch low-value steps in UI (“3 enrichments completed”) but store granular in `detail`

---

## v1 legacy mapping

| Today | Activity |
|-------|----------|
| `DeliveryLog` | `event.delivered` / `event.delivery_failed` |
| `SystemLog` (facebook.*) | `connection.*` workspace Activity |
| `AuditLog` | `user.action` / admin Activity |
| Webhook verification log | `connection.*` or `event.received` |

Convergence path: dual-write Activity while keeping existing tables, then migrate reads.
