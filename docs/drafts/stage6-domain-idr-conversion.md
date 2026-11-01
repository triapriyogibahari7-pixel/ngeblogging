# Stage 6 draft IDR conversion

Owner requirement: customer sale prices and future Midtrans amounts must be IDR; never add a rupiah margin to a USD amount.

registrarCostInRupiah accepts decimal strings with up to six fractional digits. USD costs require an explicitly supplied USD/IDR rate, a source label, UTC observedAt and expiresAt. Future, expired and longer-than-24-hour FX intervals are rejected as a local policy. Native IDR needs no FX. BigInt decimal multiplication rounds converted cost upward to a whole rupiah, with positive results capped at IDR 1 trillion.

minimumDomainSalePriceFromRegistrar passes only converted IDR costs into the existing IDR 25,000 margin policy. Payment costs remain required and registration/renewal need separate cost calculations. Original minimumDomainSalePriceIdr validation and algorithm are unchanged.

These functions do not retrieve rates or authenticate their source. A source label and valid timestamps are not evidence of authenticity. They must only receive trusted server inputs after independent verification. They do not validate registrar quote freshness or payment contracts. FX metadata is carried forward; it does not automatically make a quote valid until that time. Downstream quote expiry must not exceed either provider quote or FX validity.

Still draft-only: no imports in the Worker, UI, billing or Midtrans. No customer price change, rate configuration, checkout, order, payment, registration, renewal or transfer is activated. purchaseAllowed remains false and costVerification remains not_performed. Existing release holds remain.

Evidence: 13 local conversion-plus-margin fixture tests passed. Rate 15000, fee 200 bps and cost amounts are test fixtures only, not live prices or rates. The earlier 12 policy tests were not rerun in this conversion test execution.

Run: node --test tests/domain-money-conversion.test.mjs tests/domain-sale-price-policy.test.mjs
