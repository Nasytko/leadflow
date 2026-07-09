# ORVIX Post-Cleanup QA Checklist — Epic 9

Manual verification after codebase cleanup. Test at **390px**, **768px**, and **1024px** where noted.

---

## Navigation

- [ ] Sidebar shows single nav (no horizontal Meta Center tabs inside pages)
- [ ] Connections → Facebook, Telegram, Webhook open correct pages
- [ ] No dead links in sidebar
- [ ] Old URLs redirect without 404:
  - [ ] `/meta/connect` → `/connections/facebook`
  - [ ] `/meta/telegram` → `/connections/telegram`
  - [ ] `/meta/webhook` → `/connections/webhook`
  - [ ] `/meta/leads` → `/leads`
  - [ ] `/facebook` → `/connections/facebook`
  - [ ] `/telegram` → `/connections/telegram`
- [ ] Query `?step=forms` preserved on Facebook redirect

---

## Facebook (`/connections/facebook`)

- [ ] Connect account (OAuth) works when disconnected
- [ ] Connected state shows Intelligence Dashboard (account, health, next steps)
- [ ] **Action Center — Refresh connection** shows toast, reloads overview
- [ ] **Sync pages** — success toast, pages list updates
- [ ] **Sync forms** — success toast, forms list updates
- [ ] **Sync ad accounts** — success toast
- [ ] **Enable/disable form** toggle works on a form card
- [ ] **Import existing leads** — visible card, import runs, summary shown
- [ ] **Send imported leads to Telegram** checkbox respects Telegram connected state
- [ ] **Send test lead** opens `/connections/webhook`
- [ ] **View activity** opens `/logs`
- [ ] **Reconnect / Disconnect** work (disconnect requires confirm)
- [ ] CSRF/session error shows readable message (not generic "Sync failed")
- [ ] Mobile: Action Center buttons stack, min touch target ~44px

---

## Webhook (`/connections/webhook`)

- [ ] Webhook diagnostics load
- [ ] Test lead card visible
- [ ] Link to Meta Lead Ads Testing Tool works

---

## Telegram (`/connections/telegram`)

- [ ] Save bot token + chat ID
- [ ] Send test message — success updates verified status
- [ ] Error when bot cannot send (wrong chat ID) shows friendly hint
- [ ] Connected summary: Update token, Update chat, Send test
- [ ] Templates link opens `/meta/telegram/messages`
- [ ] View activity → `/logs`

---

## Leads (`/leads`)

- [ ] List loads
- [ ] Search and filters work
- [ ] Open lead detail (sheet)
- [ ] Mobile card layout, no horizontal scroll
- [ ] Link from Facebook form "View leads" filters correctly (`?formId=`)

---

## Activity (`/logs`)

- [ ] Logs list loads
- [ ] Filters work
- [ ] Empty state with CTAs when no data

---

## Legacy compatibility

- [ ] `/meta/forms` still works (FormsContent, import via hook)
- [ ] `/meta` overview loads wizard (links point to `/connections/*`)
- [ ] `/meta/health` diagnostics load
- [ ] `/meta/audit` ad audit loads

---

## Regression

- [ ] Login / logout
- [ ] Dashboard Mission Control loads
- [ ] Settings page loads
- [ ] Admin (if applicable) unchanged

---

## Automated (run before release)

```bash
npm run build
npm run lint
npm test
npm run security:check
```

All must pass.
