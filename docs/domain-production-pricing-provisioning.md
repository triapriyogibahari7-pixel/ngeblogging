# Production pricing snapshot provisioning

This tool installs the missing DOMAIN_PRODUCTION_PRICING_SNAPSHOT_JSON binding on the ngeblogging Worker in account 095e57b46e7ba7f6b188480d9e4e5fe7. Creating or merging this code does not install any snapshot. No default rates, zero-tax assumptions, or bundled production values are provided.

## Trusted input required

Obtain a private snapshot with environment production and exactly the fx/policy fields required by server/domain-pricing-snapshot.mjs. Substantiate effective USD acquisition cost, taxes/additional costs, and payment fees covering the enabled methods. Public reference FX and public payment pricing do not establish your account costs. The verified declarations are operator assertions, not an evidence audit by the script. Never install synthetic fixtures. Keep the JSON outside this repository and frontend assets; do not paste tokens or private snapshots into chat.

## Offline check

```sh
node scripts/provision-domain-production-pricing.mjs --check PRIVATE_PRODUCTION_SNAPSHOT.json
node --test tests/domain-production-pricing-provisioning.test.mjs
```

Check mode makes no network request. The existing sandbox validator is unchanged. Both validators check structure and assertions, not their supporting evidence. FX snapshots expire within at most 24 hours and require a verified refresh process. This tool does not create such a process or extend expiry automatically.

## Explicit production mutation

After reviewing and approving the exact private snapshot and production target, run on a trusted machine with installed project dependencies and CLOUDFLARE_API_TOKEN configured securely in the environment:

```sh
node scripts/provision-domain-production-pricing.mjs --apply PRIVATE_PRODUCTION_SNAPSHOT.json --confirm-worker ngeblogging
```

This invokes the project-installed Wrangler secret bulk command with one secret supplied over stdin. Treat apply as a production version/deployment-affecting action, not a validation step. Secret contents and command stdout/stderr are not printed by this wrapper. Other secrets are omitted from the payload, not set to null. See https://developers.cloudflare.com/changelog/post/2026-06-03-bulk-secrets-api/ for preservation semantics.

A failed or timed-out command has an unknown remote outcome: inspect deployment state before retrying. A successful command is not proof that the intended version is serving traffic or that an authenticated quote succeeds. Verify deployment and retry the normal authenticated price check. Do not create an order/payment for diagnosis. No checkout/payment/registration gates are enabled by this script.
