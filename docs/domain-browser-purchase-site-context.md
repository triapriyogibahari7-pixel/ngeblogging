# Browser purchase destination context

The embedded React purchase form now receives siteId, siteName and expectedOwnerId from the owner-only production panel and passes the validated destination to the purchase model. No server flag is activated. The form will stop on an explicit binding-disabled response until the backend rollout is ready; there is no silent unscoped fallback.

A keyed inner form resets in-memory fields and consent when embedded mode, site identity or expected owner changes. Existing session-change handling aborts pending client work and resets consent. The pure context helper blocks missing/invalid targets, mismatched session owners, attempts from another site, and historical attempts without destination metadata. UI helper tests do not prove React mounting or asynchronous lifecycle behavior.

The destination appears in the form and payment consent. Stored attempt destination is displayed separately. Status viewing and terminal-status verification remain available for old attempts; clearing a record still requires the existing backend status check. Do not delete uncertain attempts to bypass these controls or assign them to the newly selected site.

The model stores normalized siteId alongside the existing owner-wide idempotency key and lock. Only order creation receives x-site-id. A matching server siteBinding is required before registrant save and checkout. The checkout backend independently uses the database binding; browser state is not authorization.

Binding is not installation. Apply/test migrations, validate row locks and privileges in isolated PostgreSQL, coordinate server activation, then verify payment, registration, current site ownership, domain conflicts, DNS, HTTPS and routing before installation success is shown.

Twelve model candidate tests and ten UI-context-helper candidate tests passed locally on Node v20.20.1 with synthetic data. The React changes, full supported Node >=22.12.0 build, browser interactions and live SQL/API integration remain unverified. No deployment, workflow execution, migration application, payment or registration is part of this commit.
