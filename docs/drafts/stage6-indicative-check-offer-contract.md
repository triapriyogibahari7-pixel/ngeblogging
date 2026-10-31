# Stage 6 indicative Check offer contract

## Integration scope
The preview-only, authenticated admin Check handler now passes the Cloudflare Check result through attachRegistrarCheckOffer. Valid standard results preserve old Check fields and add offerStatus and offer. The UI still reads the old fields; it does not yet display or enforce offer expiry. The canonical quote router, publication, checkout, payment, registration, renewal, transfer, DNS and production are not connected to this contract.

## Boundaries
- Default validity is 60 seconds from checkedAt, not from conversion time. This is a local indicative-display policy, not a provider price guarantee.
- Expired or future-dated standard results return invalid_response with no prices or offer. Premium and non-registrable results do not become standard offers.
- Transfer is not_quoted, not zero and not a claim that transfer is unsupported. Tax remains unknown/null.
- Purchase stays disabled. Domain ownership and site connection are not acquired.
- quoteId is an identifier only: not signed, persisted, authoritative, or redeemable for checkout. Later orders must independently revalidate eligibility, price and availability.
- This differs from the canonical quote-router contract, which requires boolean taxIncluded and explicit operation support. Do not treat these contracts as interchangeable.

## Evidence and remaining work
The offer candidate passed 21 local fixture tests. Its response decorator passed 19 local fixture tests. Repository test imports are relocated to ../server; assertions are unchanged. These are not live provider, React render, HTTP integration, payment or production acceptance results. After HTTP wiring, rerun the existing endpoint suite and verify deployed admin responses before claiming integration acceptance.

Offline commands:
node --test tests/registrar-check-indicative-offer.test.mjs tests/registrar-check-result.test.mjs tests/registrar-check-handler-stage6.test.mjs

Tests require no provider credentials. Existing stage 4/5 and production release holds remain. No merge to main is authorized.
