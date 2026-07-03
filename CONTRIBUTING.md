# Contributing to ORVIX

Thank you for helping improve ORVIX Public Alpha.

## Before you start

1. Read [docs/orvix/README.md](docs/orvix/README.md) for product principles.
2. For UI changes, align with the ORVIX design system — calm, minimal, no decorative gradients.
3. Do not change Prisma schema or API contracts without an issue discussion first.

## Development setup

See [README.md](README.md#quick-start-local). You need **web + worker + Postgres + Redis**.

## Pull requests

1. Fork and create a branch from `main`.
2. Keep PRs focused — one concern per PR.
3. Run before submitting:

```bash
npm run lint
npm test
npm run build
```

4. Update i18n (`messages/en.json` and `messages/ru.json`) for user-facing copy.
5. Fill out the PR template.

## Code style

- TypeScript strict; match existing patterns.
- Use `components/ui/` primitives; avoid duplicate button/card variants.
- Status: dot + text (`StatusBadge`), not pill overload.

## Issues

Use GitHub issue templates. Include steps to reproduce for bugs.

## Security

Do not open public issues for vulnerabilities. See [SECURITY.md](SECURITY.md).
