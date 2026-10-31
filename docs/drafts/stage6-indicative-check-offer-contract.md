# Stage 6 indicative Check offer contract

## Integration scope
The preview-only authenticated admin Check handler decorates Cloudflare Check results with offerStatus and offer. The preview Domain search card now reads standard prices from the validated offer, displays checkedAt/expiresAt, and clears expired prices via a timer plus focus/visibility rechecks. It sends no automatic registrar refresh. Premium results show a warning, not a standard price offer. The free-site panel and publication controls remain unchanged.

The canonical quote router, checkout, payments, registration, renewal, registrar transfer, DNS and production are not connected to this offer contract.

## Boundaries
- Default validity is 60 seconds from checkedAt, not conversion time. This is a local indicative-display policy, not a provider guarantee.
- Expired or future-dated standard results do not produce a valid offer. The UI also rejects inconsistent timestamps and removes expired price/quote identity from its view state.
- Tax remains unknown/null. Transfer remains not_quoted, not zero or a claim of unsupported operation.
- Purchase remains disabled. Availability does not establish ownership or site connection.
- quoteId is not signed, persisted or redeemable for checkout. Orders require independent server-side verification.
- The canonical quote router requires a different tax/operation-support contract; these formats are not interchangeable.

## Evidence and remaining work
Local fixture results before UI wiring: offer module 21 passes; response decorator 19 passes; UI offer reader 23 passes; expiry watcher 16 passes. A separate Node VM handler-wiring harness passed 14 cases with mocked auth, normalization and Check adapter. These are different scopes, not a single end-to-end suite. The original endpoint suite was not rerun after offer wiring. UI module artifacts were tested standalone; their React integration and real browser lifecycle have not been verified.

After this commit, verify JSX build, combined UI behavior, browser focus/visibility handling, account/site switching and deployed admin responses. Existing GitHub Actions billing blockage is not resolved by this code. Do not claim stage 6 acceptance, live provider acceptance or production readiness. Existing stage 4/5 and release holds remain. No merge to main is authorized.
