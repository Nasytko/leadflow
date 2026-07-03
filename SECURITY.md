# Security Policy

## Supported versions

| Version | Supported |
|---------|-----------|
| Public Alpha (main) | Yes |

## Reporting a vulnerability

**Do not** open a public GitHub issue for security vulnerabilities.

Please report via:

- GitHub **Security Advisories** (Preferred): Repository → Security → Report a vulnerability
- Or email the maintainer listed in the repository profile

Include:

- Description of the issue
- Steps to reproduce
- Impact assessment
- Suggested fix (if any)

We aim to acknowledge reports within 72 hours.

## Security practices (ORVIX)

- OAuth tokens encrypted at rest (`ENCRYPTION_KEY`)
- Meta webhooks: `X-Hub-Signature-256` required in production
- CSRF tokens on state-changing API routes
- Rate limiting via Redis
- Multi-tenant isolation in Prisma queries
- Password reset tokens stored as hashes

Run `npm run security:check` locally to validate env configuration.

## Secrets

Never commit `.env`, tokens, or `ENCRYPTION_KEY`. Use `.env.example` as reference only.
