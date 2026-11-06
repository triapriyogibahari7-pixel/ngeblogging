# Rewards payout readiness

This migration is a foundation, not an activated payout product. Do not enable payouts yet.

- Currency: integer IDR; balances returned as strings to avoid JavaScript integer rounding.
- Browser clients cannot write ledger, recipient verification, payout configuration, or withdrawal status.
- Withdrawal creation locks the publisher row, checks owner/approval/verified recipient/available funds, and reserves balance atomically.
- Retrying must reuse the same request UUID, amount and recipient. An ambiguous provider response must remain unknown; never issue a second transfer automatically.
- Ledger is append-only. A release must occur only after confirmed terminal non-payment and must not race with transfer execution. No release or provider execution API is supplied in this stage.
- Do not add earnings from browser impressions, test traffic, or arbitrary credit requests. No earning-credit endpoint is supplied.
- Before activation: select and activate the payout provider, implement verified funding and revenue allocation, add immutable transfer attempts and signed callback reconciliation, verify recipients through the provider, define fees/minimum/terms, and test concurrency and cross-account authorization.
- Provider transfer, recipient registration UI, earnings ingestion and end-to-end tests remain unimplemented.
