# Decision & Decision Flow

## Definition

A **Decision** is a single evaluable step that changes what happens to an Event: pass, block, enrich, assign, route, delay, or branch.

A **Decision Flow** is an ordered (often branching) **business process** applied to Events of matching criteria. It is the heart of ORVIX — not a technical pipeline diagram, but the operational logic a business owner would recognize.

```
Meta Lead
  → Normalize
  → AI Summary
  → Spam Detection
  → Assign owner
  → Telegram
  → CRM
  → Done
```

Technically, a Flow compiles to steps executed by workers. Conceptually, it is **how the company wants to handle this kind of event**.

---

## Decision Flow vs automation

| Term (avoid) | Term (use) | Why |
|--------------|------------|-----|
| Zap | Decision Flow | Implies opaque connector magic |
| Pipeline (alone) | Decision Flow | Pipeline sounds technical; Flow sounds operational |
| Automation | Decision Flow / Decision step | “Automation” is generic; ORVIX sells **decisions** |
| Workflow (generic) | Decision Flow | Workflow is overloaded (n8n, CRM, HR) |

Decision Flows are **versioned**, **auditable**, and **named by the business** (“New Meta lead → Sales Telegram + HubSpot”).

---

## Structure

### Flow metadata

| Field | Purpose |
|-------|---------|
| `id` | Flow identity |
| `version` | Immutable published versions; Events pin to version processed |
| `name` | Operator-facing |
| `description` | When to use this flow |
| `trigger` | Which Events enter: `type`, `source`, filters |
| `status` | `draft`, `published`, `archived` |
| `workspaceId` | Tenant scope |

### Steps (nodes)

Each step is a **Decision** with a kind:

| Step kind | Purpose | Example |
|-----------|---------|---------|
| `normalize` | Ensure `normalizedPayload` | Map Meta fields |
| `enrich` | External lookup | Geo, duplicate contact check |
| `ai` | Model-assisted step | Summary, intent, urgency score |
| `rule` | Deterministic logic | IF budget > X THEN route A |
| `assign` | Ownership | Round-robin, territory |
| `filter` | Block / allow | Spam, denylist |
| `route` | Select destinations | Telegram + CRM |
| `delay` | Wait | Quiet hours, batch window |
| `human` | Manual gate | Approve before CRM |
| `transform` | Shape for next step | Custom JSON for webhook dest |

Steps produce entries in Event `decisionHistory` with:

- Step id and version
- Input snapshot (hash or reference)
- Outcome (`pass`, `block`, `route`, `error`)
- **Explanation** — human-readable, required for AI and rules
- Duration

### Branching

Flows may branch on Decision outcomes:

```
Spam Detection
  ├─ pass → Assign → Route
  └─ block → Archive (terminal)
```

Branches are **explicit**, never implicit fall-through.

---

## AI in Decision Flows

AI steps are **first-class Decisions**, not sidecars.

Rules:

1. **Explainability** — store model id, prompt version, structured output, confidence if applicable
2. **Optional by default** — flows work without AI
3. **Fail-safe** — AI timeout → configurable fallback (skip, block, human queue)
4. **No black-box routing** — “AI said send to Telegram” must show summary reason in `decisionHistory`

Example AI steps:

- Summarize lead message for Telegram
- Detect spam / low quality
- Suggest priority (operator can override — creates Activity)

---

## Example: Meta lead (reference flow)

| Step | Business meaning | Outcome |
|------|------------------|---------|
| Normalize | Standardize name, phone, attribution | `normalizedPayload` filled |
| AI Summary | One-line context for managers | Text in context for Telegram template |
| Spam Detection | Drop obvious junk | `block` or `pass` |
| Assign | Pick owner or queue | `ownerId` in context |
| Route Telegram | Alert sales chat | Destination job queued |
| Route CRM | Create/update contact | Second destination job |
| Done | Terminal | Event → `delivered` or `partial` |

This is the **reference template** for v2 — not hard-coded, configurable per workspace.

---

## Default flows

On Source connection, ORVIX may suggest a **default Decision Flow**:

| Source connected | Suggested flow |
|------------------|----------------|
| Meta | Lead → Normalize → Telegram |
| Website form | Submission → Normalize → Email + Webhook |
| Generic webhook | Receive → Transform → Route (manual config) |

Defaults accelerate time-to-value; power users fork and version flows.

---

## Decision Flow and Event types

| Rule | Description |
|------|-------------|
| One Event, one Flow execution | Re-processing creates new execution or explicit replay |
| Flow trigger is declarative | `type=lead AND source=meta` — no hidden coupling |
| Multiple flows | Priority order; first match wins unless `parallel` explicitly allowed |

---

## What Decision Flow is not

- **Not a Source adapter** — does not fetch from Meta
- **Not a Destination** — does not call Telegram API directly (calls `route` → delivery queue)
- **Not a dashboard** — Mission Control observes Flow outcomes via Events and Activity

---

## Governance

| Concern | Approach |
|---------|----------|
| Change management | Publish new version; old Events keep old version in history |
| Testing | Dry-run Event through draft Flow; show simulated `decisionHistory` |
| Permissions | Who can publish flows vs view (workspace roles — future) |
| Compliance | Block / retention steps auditable for GDPR-style requests |

---

## Relation to core cycle

| ORVIX phase | Decision Flow role |
|-------------|-------------------|
| Connect | Sources emit Events |
| Understand | Normalize + enrich steps |
| Decide | Rules, AI, assign, filter |
| Deliver | Route step → Destinations |
| Observe | Activity + analytics on decisions |

Decision Flow **is** the product’s expression of Connect → Observe for event handling.
