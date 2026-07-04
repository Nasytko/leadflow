# Navigation & Connection Setup Experience

Epic 5 — ORVIX product navigation and integration setup flows.

## Why double navigation was removed

Previously, users saw **two competing navigation systems**:

1. The global **sidebar** (Overview, Integrations, Data, System)
2. A horizontal **Meta Center tab bar** inside Facebook/Telegram pages (Overview, Connection, Pages, Forms, Webhook, Telegram, etc.)

This felt like a browser tab strip inside the product, not a guided setup scenario. Users could not tell which menu was authoritative.

**Decision:** The sidebar is the single primary navigation. Meta Center horizontal tabs are removed from the UI. Legacy `/meta/*` routes remain for deep links; primary entry points are `/connections/*`.

## New information architecture

| Group | Items | Routes |
|-------|-------|--------|
| **Overview** | Mission Control, Wiki | `/dashboard`, `/wiki` |
| **Connections** | Facebook, Telegram, Webhook/API | `/connections/facebook`, `/connections/telegram`, `/connections/webhook` |
| **Data** | Leads / Events, Activity, Analytics | `/leads`, `/logs`, `/meta/audit` |
| **Workspace** | Settings, Health | `/settings`, `/meta/health` |

Admin navigation is unchanged and appears only for admin users.

## Facebook setup flow

**Component:** `components/features/connections/facebook/facebook-setup-flow.tsx`  
**Step resolver:** `lib/connections/facebook-setup-state.ts`

### Steps

1. **Connect account** — OAuth via `MetaAccountCard`, login config diagnostics
2. **Choose business** — sync Business Manager portfolios
3. **Sync pages** — connect Facebook Pages for webhooks
4. **Select lead forms** — enable forms (`FormsContent` embedded)
5. **Verify webhook** — test lead + webhook diagnostics
6. **Complete** — success state

### Connected state

When setup is complete (`connected + pages + forms + webhookVerified`), the flow shows a **summary dashboard** instead of steps:

- Account card (avatar, name, token status, counts)
- Webhook health block
- Deep links to audit, ad accounts, Telegram templates (secondary, not nav)

### Desktop vs mobile

- **Desktop:** horizontal step grid + content panel; steps clickable when resolver provides statuses
- **Mobile:** compact dot stepper (`Step X of Y`) + Back/Next carousel; touch targets ≥ 44px

## Telegram setup flow

**Component:** `components/features/connections/telegram/telegram-setup-flow.tsx`  
**Step resolver:** `lib/connections/telegram-setup-state.ts`

### Steps

1. **Create bot in BotFather** — instructions + link
2. **Add bot token**
3. **Add chat ID** — save connection
4. **Send test message**
5. **Complete**

### Connected state

Summary with bot status, chat ID, test verification, template link, and actions: send test, update token/chat, view logs.

### Friendly errors

`mapTelegramErrorHint()` maps API errors to i18n keys under `connections.telegram.errors.*`, e.g. *"bot can't send messages to the bot"* → user guidance to press Start and use the correct user/group chat ID.

## Route compatibility

| Legacy URL | Behavior |
|------------|----------|
| `/meta/connect` | Renders `FacebookSetupFlow` |
| `/meta/telegram` | Renders `TelegramSetupFlow` |
| `/meta/webhook` | Renders webhook connection content |
| `/meta/pages`, `/meta/forms`, etc. | Still work; no horizontal nav in shell |
| `/facebook` | Redirect → `/connections/facebook` |
| `/telegram` | Redirect → `/connections/telegram` |
| `/meta` | Meta Center overview (nav removed) |

Query param `?step=forms` (etc.) selects a setup step on Facebook/Telegram pages.

## Moved to Beta

- **Telegram Disconnect** — no DELETE API yet; deferred
- **Full removal** of `MetaCenterNav` component file (kept, unused in UI)
- **Meta Center overview wizard** — still at `/meta`; may merge into Mission Control later
- **Dedicated Analytics hub** — audit remains at `/meta/audit`
- **Ad accounts / businesses** as standalone sidebar items — reachable via deep links from connected Facebook summary

## Tests

- `tests/facebook-setup-state.test.ts` — step resolver for Facebook
- `tests/telegram-setup-state.test.ts` — step resolver + error hint mapping

Run: `npm test`
