# Customer domain review endpoint

`POST /api/domains/commerce/review/<canonical-domain>` is a review-only server route. It is dispatched before customer price/search and legacy registrar lookup without changing those validators.

Requirements: canonical Ngeblogging HTTPS origin, Bearer session token, UUID `x-site-id`, empty request body, and no query parameters. The handler verifies the user through the fixed Supabase project. It then invokes the existing `/check/` handler internally using the same Authorization and normalized site header, with no network loopback. The price handler independently verifies the session and site ownership and recomputes registrar availability and sale price. No browser-supplied amount is accepted.

Issuance is disabled unless `DOMAIN_CUSTOMER_REVIEW_ENABLED` is the exact string `true` and `DOMAIN_CUSTOMER_REVIEW_SIGNING_KEY` is a canonical unpadded base64url encoding of a dedicated random 32-byte key. Keep that key in backend secrets only, separate from registrar and payment credentials. This code change does not install or activate either setting. Existing OpenSRS production configuration and cost-snapshot requirements still apply through the delegated check.

A valid available check returns `DOMAIN_CUSTOMER_REVIEW` with a signed receipt, `reviewOnly: true`, `orderCreated: false`, `paymentStarted: false`, `purchaseAllowed: false`, and `checkoutAvailable: false`. A domain that is no longer available returns 409 without a receipt. Responses are private/no-store. Provider errors, raw metadata, costs, and secrets are not forwarded.

The endpoint uses bounded JSON reads and a shared cancellation/deadline budget. There is one extra authentication read before the delegated price check; this is not a batch search and does not change the search authorization-count contract. The delegated check retains its per-isolate rate and pending-request controls, not a global cross-location quota.

This does not create a database record, prevent receipt replay, collect registrant terms consent, authorize Midtrans, reserve a domain, or perform registration/DNS changes. Complete the transactional reseller order ledger and consent/payment/provisioning safeguards before exposing checkout.

Tests: `node --test tests/domain-customer-review.test.mjs`. These use the stored receipt crypto module with mocked authentication and a mocked delegated price handler. Dispatcher checks are static/syntax checks. Full Worker build, real ownership/database behavior, live provider connectivity, and browser interaction remain separate verification work.
