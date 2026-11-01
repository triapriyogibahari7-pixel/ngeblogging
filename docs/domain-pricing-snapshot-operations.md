# Stage 6: private pricing snapshot preparation

This is an offline operator tool, not a payment activation command. It performs no network request, database write, Cloudflare update, checkout, or registration. No production pricing or secret is bundled.

## Required trusted input

Supply a private JSON object with exactly `environment`, `fx`, and `policy`. Environment must be `sandbox`.

- FX fields: `base` USD, `quote` IDR, `rate` decimal string with at most six fractional digits, `observedAt`, `expiresAt`, `source`, and `costBasisVerified` boolean.
- Policy fields: `taxStatus`, `costScope`, `paymentFeeMode`, `sourceRef`, `taxSourceRef`, `paymentFeeSourceRef`, `version`, `verifiedAt`, `expiresAt`, `otherDirectCostsIdr`, `paymentFixedCostIdr`, `minimumMarginIdr`, `paymentFeeBasisPoints`.
- Required policy declarations match the quote handler: `verified`, `registration_year_1`, `conservative_ceiling`. Costs are nonnegative IDR integers; margin is at least 25000; fee basis points are in [0,10000).
- FX lifetime cannot exceed 24 hours. Both FX and policy must be unexpired; observations and verification cannot be in the future.

Registrar price is not included here: the quote handler obtains it live for the selected domain.

## Evidence, not invented defaults

The operator must substantiate the effective USD acquisition cost, taxes/additional costs, and a conservative payment-fee ceiling covering every enabled payment method. A public reference FX rate does not establish the cost of funding Cloudflare through PayPal or a card. Public Midtrans pricing does not automatically establish the merchant contract or applicable tax treatment.

`costBasisVerified: true` and `taxStatus: verified` are trusted operator assertions, not findings of this validator. The tool checks declarations and structure; it does not audit evidence or contact providers. Do not change a flag to verified merely to pass validation. Missing evidence means stop, not assume a zero cost. Fixture values in tests are synthetic and must never be installed as customer pricing.

## Commands

Run on a trusted machine with access to the private input file:

```sh
node scripts/validate-domain-pricing-snapshot.mjs PRIVATE_INPUT.json
node scripts/validate-domain-pricing-snapshot.mjs PRIVATE_INPUT.json --out PRIVATE_VALIDATED.json
```

Default mode writes no file. `--out` creates a new private file and refuses overwrite. Successful stdout contains status and expiration dates, not internal cost amounts or source references. Validation failure writes no output snapshot. Keep private inputs/outputs out of Git, frontend assets, and chat; treat them as backend configuration only.

The exported schema matches `DOMAIN_PRICING_SNAPSHOT_JSON`; installation, flags, real credential checks, RPC access, and sandbox payment delivery require separate verification and approval. This tool does not change existing runtime handlers or their responses. Success explicitly reports `readyForPayments: false` and `evidenceAudited: false`.
