# Information Architecture

Proposed application structure for ORVIX Event Engine — **target state** over 2–4 years. Current routes (`/dashboard`, `/leads`, `/meta/*`) remain until phased migration.

---

## Top-level map

```
Workspace
├── Mission Control      ← operational home
├── Events               ← all Events (default filter: leads)
├── Decision Flows       ← business logic
├── Connections          ← Sources + Destinations
├── Activity             ← workspace timeline
├── Insights             ← analytics on Events
├── Health               ← integration + platform health
└── Workspace Settings   ← tenant config, users, billing
```

Platform admin (separate): users, queue, platform Meta app, audit — outside workspace IA.

---

## Module definitions

### Mission Control

**Was:** Dashboard

**Purpose:** Answer in 10 seconds: Is everything connected? Are events flowing? What needs attention?

**Contents:**

- Source / Destination health summary
- Event volume (24h / 7d) by type
- Failed deliveries and blocked Events
- Decision Flow execution errors
- Quick actions: refresh connection, view latest errors

**Why rename:** “Dashboard” implies passive charts. Mission Control implies **command with accountability** — matches manifesto.

**Not:** Deep analytics (→ Insights), connection setup (→ Connections).

---

### Events

**Was:** Leads (partially)

**Purpose:** Search, inspect, and act on individual Events.

**Contents:**

- Filterable list (`type`, `source`, status, date, attribution)
- Event detail: payload, normalized view, decision history, destination status
- Event timeline (Activity projection)
- Actions: replay, manual route, block, export

**Why:** Single pane for any signal type. Meta lead is a filtered view, not a separate product silo.

**Default:** Filter `type: lead` for current ICP.

---

### Decision Flows

**Was:** (implicit — fixed Meta→Telegram path)

**Purpose:** Define and version how Events are handled.

**Contents:**

- Flow list (draft / published)
- Visual or step editor (future)
- Test with sample Event
- Version history and diff
- Templates per Source kind

**Why:** Heart of product — business owns logic without engineering.

**Not:** Connection credentials (→ Connections).

---

### Connections

**Was:** Meta Center, Telegram settings, future integrations nav

**Purpose:** Manage Sources and Destinations — connect, health, test, sync metadata.

**Contents:**

- **Sources:** Meta, TikTok, Webhook, REST, CSV, Website, …
- **Destinations:** Telegram, Email, CRMs, Webhook, Sheets, …
- Unified card pattern (account, status, token, counts, actions)
- Per-connection diagnostics

**Why:** One place for “what is plugged in” — symmetric mental model.

**Structure:**

```
Connections
  Sources
    Meta
    Webhook
    …
  Destinations
    Telegram
    HubSpot
    …
```

---

### Activity

**Was:** Logs, delivery logs, parts of admin audit

**Purpose:** Workspace-wide timeline of meaningful actions.

**Contents:**

- Filter: severity, type, actor, connection, Event id
- Errors first default
- Export for audit

**Why:** Operators live here when debugging. Replaces hunting system logs.

**Event detail** still shows Event-scoped timeline — Activity module is cross-event.

---

### Insights

**Was:** Ad audit, dashboard charts (partially)

**Purpose:** Decision-oriented analytics on Events — not vanity dashboards.

**Contents:**

- Volume, sources, destinations success rate
- Campaign / attribution (where payload supports)
- Funnel through Decision steps
- CPL and spend (Meta slice today; generalize later)

**Why:** Separates **monitoring** (Mission Control) from **analysis** (Insights).

---

### Health

**Was:** Meta Health, diagnostics, worker status

**Purpose:** Deep operational diagnostics — integrations, queue, webhook, workers.

**Contents:**

- Per-connection health suites
- Platform checks (Redis, worker, signature)
- Self-test runs
- For power users and admins

**Why:** Mission Control shows summary; Health shows **depth** without cluttering home.

---

### Workspace Settings

**Was:** Settings

**Purpose:** Tenant configuration unrelated to a single Connection.

**Contents:**

- Users, roles, invites
- Locale, notifications (future)
- Retention policies (future)
- API keys for REST Source (future)
- Billing (future)

**Why:** “Workspace” clarifies scope vs platform admin.

---

## Navigation model

| Surface | Desktop | Mobile |
|---------|---------|--------|
| Primary nav | Sidebar: Mission Control, Events, Flows, Connections, Activity, Insights, Health | Bottom nav: Mission Control, Events, Connections, Activity |
| Secondary | Settings, Wiki/Guides | Settings in profile menu |
| Utilities | Header: theme, locale, account | Same |

Decision Flows and Insights may be secondary on mobile initially — acceptable progressive disclosure.

---

## Migration from v1 nav

| v1 | Target |
|----|--------|
| `/dashboard` | `/mission-control` (alias `/dashboard`) |
| `/leads` | `/events?type=lead` |
| `/meta/*` | `/connections/sources/meta/*` |
| `/meta/telegram` | `/connections/destinations/telegram` |
| `/meta/audit` | `/insights/campaigns` or Meta slice |
| `/logs` | `/activity` |
| `/settings` | `/workspace/settings` |
| `/wiki` | `/guides` (optional) |

Aliases preserve bookmarks during transition.

---

## IA principles

1. **Operational before configurational** — Mission Control and Events before Flows editor.
2. **Symmetric connections** — Sources and Destinations feel like siblings.
3. **One Event detail pattern** — all types share layout.
4. **Activity is always reachable** — from errors, Mission Control, Event detail.
5. **Admin is not workspace** — platform operators do not mix with tenant nav.

---

## What we deliberately omit from top nav

| Capability | Where it lives |
|------------|----------------|
| Wiki / onboarding | Guides (link from Mission Control) |
| Platform Meta App ID | Platform admin only |
| Queue / worker admin | Platform admin |
| Per-page Meta forms | Under Connections → Meta → Pages |

Keeps nav calm — ORVIX UX principle.
