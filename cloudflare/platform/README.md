# Cloudflare platform foundation

Status: staging data layer only. This directory does not replace production
authentication or expose a public database API. Supabase remains in production
until the migration gates in `docs/NGEBLOGGING-CLOUDFLARE-BUILD-BRIEF.md` pass.

## Implemented

- D1 schema for accounts, profiles/social URLs, sites/memberships, article/page
  metadata, media, domain states, AdSense, API-key hashes, orders, payment events,
  subscriptions, security events, notification outbox and migration checkpoints.
- SQL-enforced quotas: 12 sites, 5,000 articles across an account, all article
  statuses counted. The 13th site/5,001st article is rejected.
- Composite foreign keys prevent site/account mismatch; unreviewed account/site
  transfers are rejected.
- Internal repository functions for profile persistence, authorized content
  listing, and AdSense verification settings.
- Profiles default private; social links are links, not OAuth connections.
- Upload budget defaults to zero until costs and quotas are agreed.

## Not implemented or activated

Cloudflare-native authentication/sessions/MFA, production migration, public API
routes, database admin console, profile UI integration, R2 uploads, actual
Midtrans checkout/webhooks, email delivery, Google approval/ads rendering,
domain onboarding and new AI runtime. Tables do not constitute these features.

`repository.mjs` only accepts a server-verified actor. An arbitrary browser
`userId` is never an authenticated actor. Authentication must be implemented
before exposing any of these methods through HTTP.

## Tests

```sh
node --test tests/cloudflare-platform-foundation.test.mjs
```

Tests use Python's bundled SQLite through a test-only adapter (Node 20 compatible); D1 schema application and
read-back must also be verified against the actual staging database. Local
tests do not certify the future authentication or payment provider integration.
