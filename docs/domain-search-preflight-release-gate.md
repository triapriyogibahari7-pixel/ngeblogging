# Domain search configuration preflight

This is stage 1 of the isolated domain-commerce repair. It does not fix a live deployment by itself and does not change the active handler, Wrangler configuration, workflows, database or payment state.

## Run locally

Run `node --test tests/domain-search-configuration-preflight.test.mjs` for the synthetic unit tests. These tests are added but have not been executed by the assistant.

Supply configuration through a trusted local process environment, set `DOMAIN_PREFLIGHT_DEPLOYMENT_ENVIRONMENT=production`, then run `node scripts/check-domain-search-configuration.mjs`. The process checks only its own environment. Cloudflare build variables are not evidence of Worker runtime bindings. No Cloudflare API connection is required for this offline validation.

The CLI exits 0 only when configuration validation passes; otherwise it exits 1. Output contains fixed diagnostic codes and boolean state, never credentials or snapshot contents. Never paste tokens into chat, commit them, or upload local environment files.

## Required configuration

- `DOMAIN_CUSTOMER_SEARCH_ENABLED` must be the string `true`.
- `DOMAIN_CUSTOMER_SEARCH_HTTP_BUDGET` must be a decimal string from 1 through 256, without leading zeros. The budget controls provider HTTP requests, not a promise that all generated suggestions will be verified. Choose it after checking account limits; this change supplies no production default.
- Supabase URL and publishable key must match the existing handler contract. Offline validation cannot verify session or site permissions.
- The selected provider must pass `createCustomerRegistrationQuoteRuntime`. For Cloudflare this includes the explicit quote-enabled flag, a syntactically valid token, operator-verified extension list and explicit tax setting. Do not invent extension support, tax treatment or credentials.
- `DOMAIN_CUSTOMER_REGISTRATION_PRICING_SNAPSHOT` must pass the application's production pricing validator at the current time. Do not deploy synthetic fixtures or reuse expired FX snapshots.

## Release gates that remain open

Passing this check means configuration validity only. It is not proof of provider permission, account billing readiness, supported live extensions, valid tax evidence, current FX evidence, session ownership, network reachability, complete search results, quote-to-order linkage, payment verification, registration fulfillment or site installation.

Keep purchase and registration authorization false in this report regardless of configuration validity. Do not remove the active fail-closed flag check to hide DOMAIN_SEARCH_DISABLED. Do not automatically deploy to production or change existing CI workflows as part of this commit.

Before release, verify the deployed runtime bindings through an authorized channel, run the unit tests and existing regressions, build the application, test authenticated owner/non-owner behavior in isolation, and verify the remaining commerce stages. Any production configuration or real-money action requires separate approval.
