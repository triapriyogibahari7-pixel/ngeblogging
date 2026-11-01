# Isolated sandbox Snap probe: request/status contracts only

Status: prepared locally; not routed, not enabled, not called against Midtrans.

Purpose: test payment plumbing separately from customer domain prices. Fixed simulated amount: IDR 10,000. Isolated ID namespace: SBPROBE-<UUID>, never DOM-<hash>. No quote, domain-order, payment-event, registration, DNS, pricing or Nara writes.

The module ONLY builds Request objects and validates supplied responses. It performs no fetch and creates no Snap token by itself. It is server-only code: never ship it to browser assets. Request objects contain authorization headers and must never be logged or returned to clients.

Controls: exact preview origin; DOMAIN_ORDER_ENV=sandbox; independent DOMAIN_SANDBOX_SNAP_PROBE_ENABLED must equal the string true; dedicated SB-Mid-server sandbox key; fixed amount; expiry with explicit start_time plus 15 minutes; manual redirects; exact sandbox checkout URLs. Nothing changes the four existing commerce flags.

Before any live sandbox call, implement and test an admin-only authenticated handler, an isolated signed-notification receiver and a persistent attempt ledger. Scope attempts to the verified admin; atomically claim a single provider-write attempt; persist token safely; reconcile ambiguous results rather than automatically POST again. The notification override in the builder targets the FUTURE isolated receiver, which is NOT installed in this commit. Do not send the request until that route exists and is verified. Do not send probe events to domain/Nara payment handlers.

The status classifier is ONLY for bounded JSON obtained by the backend's authenticated GET to Midtrans sandbox. Never pass callback query parameters, browser bodies or raw webhook claims to it. Future webhook handling must verify signatures and independently GET status. A provider 404 before channel selection is not payment success. Paid here means a sandbox probe outcome only; never fulfill a domain or mark business costs verified.

Evidence: 39 local Node unit tests passed, 0 failed. All provider inputs were fixtures. No provider call, HTTP integration, database integration for this module, concurrency, signature verification or end-to-end payment is claimed. Prior 26 PostgreSQL checks are separate evidence for the existing domain RPCs, not evidence for this new module.

Run: node --test tests/domain-isolated-sandbox-probe.test.mjs

API references:
- https://docs.midtrans.com/docs/snap-advanced-feature
- https://docs.midtrans.com/reference/expire-a-snap-session
- https://docs.midtrans.com/docs/transaction-status-cycle
