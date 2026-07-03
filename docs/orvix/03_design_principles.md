# ORVIX Design Principles

## 1. Tool, not template

The interface is a **professional instrument** — like Linear or a code editor — not a Bootstrap admin theme. If a pattern appears in "50 Tailwind dashboard" galleries, question it.

## 2. Less decoration, more confidence

Remove before you add:

- Gradient headers
- Icon boxes behind every label
- Colored card variants per metric
- Pill badges for neutral states
- Drop shadows on static content

Confidence comes from **alignment, spacing, and typography** — not ornament.

## 3. One primary action per screen

Each view should have a single obvious next step. Secondary actions are ghost or outline. Tertiary actions are links or menu items.

Example: Dashboard → primary: view leads; secondary: refresh.

## 4. Air is a feature

Whitespace is not wasted space. Section gaps of 64–80px, generous padding inside surfaces (24–32px), constrained content width (~1080px) for readability.

## 5. Hairlines over boxes

Prefer `1px` borders and dividers to separate regions. Avoid nesting bordered boxes inside bordered boxes.

## 6. Calm color

Default UI is neutral gray. Color means:

- **Primary accent** — focus, links, rare CTA
- **Green dot** — healthy / success
- **Amber dot** — attention / degraded
- **Red dot** — failure / blocked

Never use color as decoration.

## 7. Typography-first hierarchy

| Level | Role |
|-------|------|
| Display | Page title — one per view |
| Title | Section headers |
| Body | Primary reading text |
| Caption | Supporting context |
| Label | Field names, table headers, nav groups |

Do not use font size alone to fix layout problems.

## 8. Status: dot + text

Statuses are communicated as a **small colored dot** and **muted label text** — not filled pill badges with borders.

## 9. Surfaces, not colorful boxes

Cards are **surfaces**: white (or dark elevated) background, subtle border, no shadow. KPI metrics may share one surface with internal dividers.

Utility classes: `.surface`, `.hairline-b`, `.hairline-y`.

## 10. Motion with purpose

Transitions are short (150ms), subtle (opacity, border-color). No bouncy animations. Loading uses skeletons matching surface geometry.

## 11. Dark mode is first-class

Every new component must work in light and dark. Test both before shipping.

## 12. Document changes

If you introduce a new pattern, update [05_design_system.md](./05_design_system.md) in the same PR.
