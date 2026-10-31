# Native managed-subdomain and transfer integration checkpoint

Date: 2026-10-31. Stage 4: OPEN. Stage 5: OPEN. This checkpoint does not start or close stage 6. No merge or production activation is authorized.

## Verified execution identity

- Source commit: 15ed08e0ed4aa00b1a92ad61f3ce92423960d7f7.
- Branch: feature/domain-stages5-10-integration-20261030.
- Cloudflare build: 43a74367-3e02-4187-80d6-b025829f6539; build and preview deployment reported success.
- Preview deployment: abba77cb-138b-4dd3-b926-a911f7faf740.
- Observed artifact: https://abba77cb-ngeblogging.triapriyogibahari7.workers.dev/stage5-native/15ed08e0ed4aa00b1a92ad61f3ce92423960d7f7.json
- Artifact read through Cloudflare Browser Rendering with HTTP 200; cloudflareBuild.commit and buildId match the source and build above.
- Engine: native PostgreSQL 17.6; disposable domain_transfer_test database. Fixture auth.uid claim injection, not Supabase Auth/PostgREST.

The artifact reports these separate passing groups in this execution:

| Group | Passed |
| --- | --- |
| Catalog assertions | 33/33 |
| Two-session contention scenarios | 3/3 |
| Capacity supplement | 16/16 |
| Site/member lifecycle supplement | 8/8 |
| Managed-subdomain plus transfer RPC | 7/7 |

Do not combine these counts with earlier browser/WASM evidence or describe them as end-to-end production acceptance. The capacity/lifecycle tests use a separate modeled database; the seven managed-transfer cases use the native catalog-slice database and existing transfer RPC. These are not one complete production schema.

## Seven managed-transfer cases

1. Site creation supplies managed domains and owner memberships.
2. Slug rename preserves managed-domain identity and mapping.
3. Active transfer retains auto-created managed domains.
4. Pending transfer retains auto-created managed domains.
5. Verifying transfer retains auto-created managed domains.
6. Forced redirect failure restores auto-created domain mappings.
7. A private target remains hidden to anonymous SQL reads after transfer.

The last case is SQL visibility evidence, not proof that a warmed Worker redirect cache stops serving an earlier public response.

## Isolation and cleanup

The artifact records managedTransfer.schemaChangesRolledBack=true, managedTransfer.nativeSessionsClosed=true, capacitySupplement.testDatabaseRemoved=true, nativeServerStopped=true and temporaryFilesRemoved=true. productionConnection=false and newSupabaseResource=false. No provider, DNS, TLS or cache purge was exercised by these tests.

## Reproduction and preserved boundaries

At the source commit, scripts/stage5-cloudflare-native-build.mjs runs the unchanged scripts/domain-stage5-native-acceptance.mjs, then scripts/stage5-native-capacity-supplement.mjs, then scripts/stage5-managed-transfer-supplement.mjs. The hook checks the original native runner blob b347638d60c3824da67dce9f0e443aa873c105af. Source SQL remains pinned to 323fce910fa37599f97aa3176acff85edfed5190 and native setup to cbcfe16210356d37a6bb25c732430f86eaa49cc3.

The hook requires the selected Cloudflare preview branch and matching build commit, Linux x64, a non-root builder, and an unused loopback port 5432. It installs pinned test dependencies and uses temporary local fixture credentials. A later documentation commit is not the source commit of this observed artifact; any later build must be checked separately.

## Remaining gates and next implementation boundary

- Preserve the exact earlier React integration harness before claiming repository-only replay of that historical run.
- Use an explicitly approved isolated Auth/PostgREST environment for signed-token and deployed same-origin tests. No environment is selected or provisioned by this checkpoint.
- Integrate omitted profile/auth foreign keys, signup and capacity behavior in the same schema before claiming full-schema compatibility.
- Exercise actual registration HTTP/provider orchestration; direct INSERT contention is not that flow.
- Test warmed positive/negative redirect caches, public-to-private visibility, rule edit/disable/remove, backend failure/recovery, and alias/external-target behavior against the actual handler in isolation.
- Verify final HTTPS tenant identity and provider/cache propagation in an explicitly approved environment. Do not set providerCacheVerified=true from this evidence.
- Diagnose failing GitHub Actions separately. Cloudflare success is not proof that all PR checks pass or that the PR is mergeable.

The PR description still contains older pending-native wording at this checkpoint's preparation time; this additive document does not silently rewrite it or any earlier evidence.

## Release hold

No merge to main or production activation before stage 10 completion, verification and separate owner release approval. This document changes no application entry, SQL migration, grant, environment flag, provider, DNS, cache, branch protection or deployment policy.
