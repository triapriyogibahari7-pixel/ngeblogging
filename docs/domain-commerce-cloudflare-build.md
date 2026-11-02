# Domain commerce build validation

This package adds a Vite build gate for `feat/domain-commerce-cloudflare-prod-20261102` and `main`. It does not activate domain search, checkout, transfers or registration.

GitHub remains source storage and review history. The primary release path is Cloudflare Workers Builds. The gate reads Cloudflare-provided branch/commit metadata and verifies the SHA against the actual Git checkout. GitHub/local builds are labelled separately rather than presented as Cloudflare evidence. Existing workflows, branch protections and the earlier stage5-specific validation are not removed.

## What actually runs

Both `npm run build` and `npx vite build` load the Vite configuration. On a selected branch, the gate runs the explicit offline auth/transport/heading/currency/receipt/intent tests, then the isolated native Worker suite. Child test processes receive a temporary HOME and a minimal environment, not production API/payment credentials. Wrangler metrics are disabled for those processes. Each command has a bounded timeout and output limit.

A nonzero exit, missing TAP summary, too few tests, failures, cancellations, skips or todo cases stops the selected build. A skipped or unstarted CI job is not evidence of passing tests. No fallback shell or fabricated successful validation report is emitted by this gate. Native fixtures block unmocked external fetches; synthetic prices and credentials are never live configuration.

## Public evidence

After tests pass and Vite generates the bundle, the plugin emits `release-v20261102.json` and `assets/domain-commerce-build-<commit>.json`. The existing Worker treats the release marker as no-store and the commit-addressed asset as immutable. The older editor release-v344 marker is unchanged.

Reports identify the checkout commit, build platform, branch, optional build UUID, test counts and SHA-256 digests of relevant inputs. Extra private metadata is not copied into the report. These are build records, not cryptographically signed remote attestations.

Verify the Cloudflare production build and read the public report for the same commit before claiming it is live. A branch preview is not production deployment. A build report does not prove live bindings, auth sessions, registrar account permissions, real payments, domain fulfillment, production browser appearance or PostgreSQL migration/concurrency behavior; those require separate evidence in subsequent implementation steps.

This first implementation commit does not claim that the tests have passed. If the pinned harness API, native runtime reproduction or application tests fail, investigate and fix the cause before release. This commit does not change Cloudflare dashboard settings or secrets, apply SQL, charge a customer or purchase a domain.
