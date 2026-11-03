# Automatic domain estimate release

## Scope

This release implements the approved estimate-only mode, not a final payable quotation. DomainLiveSalePrice explicitly sends x-domain-pricing-mode: estimate to POST /api/commerce/domains/quote/{domain}. The existing production quote activation flags and DOMAIN_ORDER_ENV=production are still required. A verified Supabase session is checked before registrar/FX requests.

The estimate route obtains the current registrar registration price and ECB reference USD/IDR through the existing Frankfurter helper. It does not require DOMAIN_PRODUCTION_PRICING_SNAPSHOT_JSON or a Supabase service-role key, does not store a quote, and does not create orders, checkout sessions, payments, or registrations. Normal requests without the estimate header retain the existing final-quote validation and snapshot requirements. No automatic fallback converts invalid financial snapshots into payable quotes.

## Visible price contract

The page displays registrar cost converted at the reference FX rate, a target service margin of IDR 25000, and a subtotal before tax/payment costs. These are not guaranteed actual conversion costs or guaranteed net profit. The FX source date is displayed; it may be earlier than today under the reference helper's freshness policy. Estimates expire no later than the registrar price freshness limit. Expired amounts are hidden pending refresh. The page does not invoke onSelect and offers no checkout action.

Tax and payment fees are unknown by default, not zero. If DOMAIN_ESTIMATE_COST_POLICY_JSON is absent, their fields and the total estimate are null, with explicit not-calculated labels. An explicitly supplied policy must contain exactly taxBasis, taxBasisPoints, paymentFixedCostIdr, paymentFeeBasisPoints, and sourceRef. taxBasis is registrar_cost or registrar_plus_margin. Basis points are integers in [0,10000); fixed payment cost is a bounded nonnegative IDR integer. The operator must choose and substantiate the assumptions. No policy numbers are provided by this release. Policy-based results are still estimates, never audited or authorized for checkout.

## Abuse protection and limitations

The route allows at most ten estimate attempts per authenticated account per minute per isolate, only one pending estimate per account per isolate, and a bounded in-memory account map. This is not a globally distributed quota across Workers isolates. Failed estimates consume attempts. Client requests are queued with two concurrent jobs. Provider credentials and service availability remain prerequisites; this release does not fix missing registrar credentials or guarantee provider responses.

## Release gate

The existing Domain commerce repair validation workflow now triggers on this branch and relevant main-targeted PR changes. It records the exact commit, installs locked dependencies in a clean environment, explicitly runs the automatic estimate and pricing safety tests, runs existing domain regressions, builds the frontend, and dry-runs both Wrangler configurations without production credentials. Adding the workflow is not evidence that these checks ran or passed. Inspect the actual results and fix failures before declaring release readiness.

Before merge, confirm the complete diff, passing estimate tests, domain regressions, frontend build and both Worker bundles. If a job fails before tests start, diagnose that infrastructure failure rather than describing unexecuted tests as passing. A merge or successful preview build is not proof of production deployment.

After an approved merge/deploy, verify that the intended commit is serving production and test the normal authenticated price button. Confirm an estimate response, visible reference source/date and IDR 25000 target margin, explicit unknown tax/fee labels when no policy exists, no quote/order/payment writes, and no checkout action. Final payable prices remain blocked until independently verified financial inputs are configured.
