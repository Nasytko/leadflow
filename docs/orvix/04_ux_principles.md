# ORVIX UX Principles

## 1. Always know what is happening

At any moment the user should answer:

- Is my integration connected?
- Are events flowing?
- Did the last action succeed?
- What should I do next?

Dashboard health, pipeline status, and logs exist to serve this principle.

## 2. Reversible important actions

Destructive or high-impact actions (disconnect, reset, delete) require:

- Clear confirmation
- Explanation of consequences
- Where possible, soft delete or recoverable state

Prefer "Disable" over "Delete" when the data model allows.

## 3. Errors explain cause and next step

Bad: `Error 500`

Good: `Webhook signature invalid. Verify META_APP_SECRET matches Meta App Dashboard → Settings.`

Every error surface should offer:

1. **What failed**
2. **Why** (if known)
3. **What to do next** (link to settings, wiki, or retry)

## 4. Empty states guide action

Empty is not dead end. Empty states must:

- State what is missing in plain language
- Suggest the single best next action (button or link)
- Avoid illustration clutter — one icon max, optional

## 5. Mobile is a separate UX

Mobile is not "desktop but narrower":

- Bottom navigation for top-level routes
- Touch targets ≥ 44px
- Tables become cards or horizontal scroll with care
- Complex flows → full page, not modals
- Drawers for filters, not multi-step modals

## 6. Modals for short actions only

Use modals for:

- Confirmations
- Quick edits (rename, toggle)
- Single-field input

Do **not** use modals for:

- Multi-step setup wizards
- Data tables
- Configuration with many fields → use dedicated page or drawer

## 7. Complex flows get dedicated space

Onboarding, integration setup, ad audit detail — these deserve **full pages** or **side drawers** with room to breathe.

## 8. Progressive disclosure

Show summary first, detail on demand. Example: lead row in table → detail sheet with full payload and delivery history.

## 9. Consistent navigation mental model

Users build spatial memory:

- **Sidebar** — where am I in the product?
- **Header** — account, theme, language (utilities only)
- **Content** — what am I doing here?

Do not duplicate page titles in header and hero without reason.

## 10. Respect attention

- No interrupting modals on login
- No auto-playing anything
- Notifications (future) must be actionable and rare

## 11. i18n parity

Russian and English must receive equal UX care. No truncated strings that break layout in one locale.

## 12. Accessibility baseline

- Keyboard focus visible
- Semantic headings (one h1 per page)
- `sr-only` for icon-only buttons
- Sufficient contrast on muted text
