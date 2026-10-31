# Stage 6 indicative Check offer candidate

This module is staged only. It is not connected to the HTTP Check handler, canonical quote router, UI, publication, checkout, payment, registration, renewal, transfer, DNS or production.

## Contract
- Standard registrable Cloudflare Check results can become indicative snapshots.
- Default validity is 60 seconds from checkedAt, not from conversion time. This is a proposed local display policy, not a provider price guarantee.
- Expired and future-dated standard results produce no offer. Premium and non-registrable results do not become standard offers.
- Transfer is not_quoted, not zero and not a claim that the operation is unsupported. Tax is unknown/null.
- Purchase remains disabled. No ownership or site connection is acquired.
- quoteId is an identifier only: it is not signed, persisted, authoritative, or redeemable for checkout. A later server-side order flow must independently verify eligibility, price and current availability.
- This contract differs from the existing canonical quote-router contract, which requires boolean taxIncluded and explicit operation support. Do not pass this candidate into that router as though it were compatible.

## Evidence
The candidate module and 21 tests ran locally with mocked Check inputs: 21 passed, zero failed. The repository test import is relocated to ../server/registrar-check-indicative-offer.mjs; assertions are unchanged from the local test bundle. This is not GitHub Actions, React render, provider, payment or production acceptance.

Run offline: node --test tests/registrar-check-indicative-offer.test.mjs

No dependency download or credential is needed for this test. Existing release holds remain in place; no merge to main is authorized.
