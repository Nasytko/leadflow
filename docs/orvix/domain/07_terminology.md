# Terminology

Recommendations for converging product language toward the Event Engine. **No code or route changes in Epic 4** — this guides future epics.

---

## Proposed renames

| Current | Proposed | Rationale |
|---------|----------|-----------|
| **Dashboard** | **Mission Control** | Aligns with [product vision](../01_product_vision.md): operational command center, not generic analytics home |
| **Automation** (future) | **Decision Flows** | Emphasizes business decisions, explainability, versioning — not opaque zap chains |
| **Logs** | **Activity** | Operator-facing timeline; distinguishes from engineering logs |
| **Settings** (tenant) | **Workspace Settings** | Clarifies multi-tenant scope; platform admin stays separate |
| **Meta Center** / **Integrations** | **Connections** | Sources + Destinations in one mental model |
| **Pipeline** (internal) | **Decision Flow** | Customer language; “pipeline” reserved for technical docs |
| **Delivery log** | **Activity** (event-scoped) | Part of unified stream |

---

## Leads vs Events

### Option A: Rename UI to **Events**

| Pros | Cons |
|------|------|
| Future-proof for all signal types | Confusing for current users who only care about leads |
| Honest domain model | “Event” is abstract; marketing weaker for lead-gen ICP |
| Single list, filters by `type` | SEO and onboarding copy need extra explanation |

### Option B: Keep **Leads** in UI, Events in architecture

| Pros | Cons |
|------|------|
| Zero disruption for v1 ICP | Two names for same thing — documentation burden |
| Clear commercial meaning | Second channel (messages) needs new nav item anyway |
| Gradual education | Risk of permanent dual vocabulary |

### Recommendation (hybrid)

| Layer | Term |
|-------|------|
| **Domain / API / DB** (future) | Event |
| **Primary nav (v1–v2)** | **Events** with default filter `type: lead` |
| **Marketing / Meta-specific copy** | “Leads” where channel-specific (“Meta leads”) |
| **Legacy routes** | `/leads` redirects or alias until deprecation window ends |

**Label in Mission Control KPIs:** keep “Leads today” until Insights module owns cross-type metrics.

**Decision:** Do not force “Events” in every sentence. Use **Events** as the module name, **lead** as the dominant type filter for the current product wedge.

---

## Terms to keep

| Term | Why |
|------|-----|
| **ORVIX** | Brand |
| **Workspace** | Tenant (already implicit in multi-user SaaS) |
| **Connection** | Instance of Source or Destination |
| **Health** | Operational status — clear, not renamed |
| **Insights** | Analytics module — decision-oriented, not “Reports” |
| **Wiki** | Internal knowledge — optional rename to **Guides** later |

---

## Terms to avoid in product copy

| Avoid | Use instead |
|-------|-------------|
| CRM | “Destination”, “contact sync”, or vendor name |
| Zap / workflow | Decision Flow |
| Connector | Connection (Source / Destination) |
| Pipeline (user-facing) | Decision Flow |
| Record (alone) | Event with type, or “submission” |

---

## i18n note

Russian equivalents need equal care:

| EN | RU direction |
|----|--------------|
| Mission Control | Центр управления / Mission Control (loanword acceptable for premium B2B) |
| Decision Flow | Сценарий решений / Поток решений |
| Activity | Журнал активности |
| Events | События (default filter: лиды) |

---

## Glossary (canonical)

| Term | Definition |
|------|------------|
| **Event** | Canonical business occurrence in ORVIX |
| **Source** | Adapter that ingests Events |
| **Destination** | Adapter that delivers outcomes |
| **Decision Flow** | Versioned business process on Events |
| **Decision** | Single step in a Flow |
| **Activity** | Append-only record of what happened |
| **Connection** | Configured Source or Destination instance |
| **Workspace** | Tenant boundary |
| **Normalize** | Map payload to `normalizedPayload` |
| **Replay** | Re-process existing Event |
| **Mission Control** | Primary operational overview |
