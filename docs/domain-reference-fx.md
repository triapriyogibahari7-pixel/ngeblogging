# Domain USD/IDR reference retrieval

Run `node scripts/fetch-domain-reference-fx.mjs` to request a public reference rate without a PayPal login or API key. The reusable server module uses one fixed GET endpoint: `https://api.frankfurter.dev/v2/rate/USD/IDR?providers=ecb`.

Source documentation: https://frankfurter.dev/ and https://frankfurter.dev/javascript/ . The provider filter pins ECB reference data rather than Frankfurter's default blended series. It is not a direct PayPal or bank acquisition-cost quote.

The module validates USD/IDR, positive finite rate with at most six fractional digits, calendar date, and response limits. It rejects future source dates and source dates over seven calendar days old. On weekends or holidays the last source date can precede retrieval. Output retains that date and its calendar age explicitly. `refreshAfter` is a suggested five-minute retrieval refresh, NOT proof the source observation is new, a locked quote, or a new 24-hour cost snapshot.

Success and failure always report `referenceOnly: true`, `costBasisVerified: false`, `usableForCustomerQuote: false`, and `purchaseAllowed: false`. A reference response is deliberately NOT the schema for `DOMAIN_PRICING_SNAPSHOT_JSON`; never install it there or relabel it as verified. Failed requests return no fabricated fallback rate. Upstream error bodies are not exposed.

There is no persistence, automated scheduled job, UI wiring, pricing-handler integration, checkout creation, registration, DNS change, runtime binding update, or transaction-flag activation in this package. This removes the need to manually obtain a planning reference from the PayPal app; it does not resolve unverified funding conversion costs or guarantee a net margin.
