# ORVIX — Cursor Development Rules

Rules for AI-assisted and human development in this repository.

## Before any change

1. **Read** `docs/orvix/README.md` and the relevant topic doc.
2. **Search** `components/ui/` and `components/layout/` for existing primitives.
3. **Check** if the change is product-necessary — no features without manifesto alignment.

## Design & UI

| Rule | Detail |
|------|--------|
| No new colors without reason | Extend `app/globals.css` tokens + update `05_design_system.md` |
| No inline styles | Use Tailwind + ORVIX utilities |
| No random shadows/gradients | Borders and typography carry structure |
| No dashboard-template patterns | See `03_design_principles.md` anti-patterns |
| Typography utilities | `.type-display`, `.type-title`, `.type-body`, `.type-caption`, `.type-label` |
| Status | `StatusBadge` (dot + text), not colored pills |
| Surfaces | `.surface` or `Card` — no shadow |

Visual language changes require **doc update in the same PR**.

## Architecture

| Rule | Detail |
|------|--------|
| `app/` routes | Composition only — delegate to feature components |
| `components/ui/` | Primitives only — no API, no feature logic |
| Feature code | `components/<feature>/` — use ui + layout |
| No duplicates | Extend existing component, do not fork |
| i18n | All user strings in `messages/*.json` |

## Scope boundaries (unless explicitly requested)

Do **not** change in UI-only tasks:

- Prisma schema / migrations
- API route business logic
- Auth flows
- Integration credentials handling
- Worker / queue processing

## Quality gate

Before considering work complete:

```bash
npm run build
npm run lint          # if touching TS/TSX
npm test              # if tests exist for changed area
```

Fix build errors before reporting done.

## Commit / PR reporting

End with a concise report:

1. **What changed** (product/design intent, not just file list)
2. **Files touched**
3. **Checks run** and results
4. **Docs updated** (if applicable)
5. **Follow-ups** (if any)

## Conflict resolution

When user request conflicts with ORVIX docs:

1. Flag the conflict explicitly
2. Prefer docs unless user overrides for explicit business reason
3. If overriding, note that docs need updating

## Source of truth hierarchy

1. `docs/orvix/` — product, brand, UX, design system
2. `app/globals.css` — implemented tokens
3. `components/ui/` — implemented primitives
4. `.cursor/rules/orvix-product.mdc` — condensed enforcement

If 2 or 3 diverge from 1, fix the implementation or update 1 — do not silently ignore.
