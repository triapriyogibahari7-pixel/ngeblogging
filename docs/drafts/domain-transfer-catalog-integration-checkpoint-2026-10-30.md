# Catalog integration evidence and remaining gates

Date: 2026-10-30. Stage 5: OPEN. Stage 4 remains OPEN under the existing contract/audit; this checkpoint does not close it. Stage 6 is not started by this checkpoint.

## Observed result

The approved inline browser harness executed 12 scenarios with React 19.2.7 and PostgreSQL 17.5 through PGlite 0.3.16. All 12 passed; zero failed; the temporary database was closed. Application modules and catalog setup were fetched at cbcfe16210356d37a6bb25c732430f86eaa49cc3. SQL inputs remained pinned to 323fce910fa37599f97aa3176acff85edfed5190. See tests/results/domain-transfer-catalog-integrated-2026-10-30.json for individual results and scope.

This re-executed the eight earlier integration scenarios on the catalog-aligned slice and added author/contributor target membership, actual draft target status, and a private-target scenario. The private target retained is_public=false; anonymous SQL reads returned no matching domain or redirect. The earlier 33-case SQL matrix was not re-executed. Keep these evidence sets separate; do not describe this run as 45 tests.

## Reproduction boundary

The catalog setup dependency is tracked at tests/browser/domain-transfer-catalog-matrix.html. The integration harness itself was inline in the approved browser call and is not added by this checkpoint. This report alone is not a standalone reproduction package. Preserve and review that exact harness before relying on repository-only replay. Do not claim the SQL-only catalog runner exercises these React/client/runtime scenarios.

## Cache audit applicability

The directory listing at the pinned checkpoint confirms server/domain-redirect-handler.mjs still has blob 584316ed41a0451467fd2541e314de1cca9139bc, matching docs/drafts/domain-transfer-alias-cache-audit-2026-10-30.md. server/domain-handler-v112.mjs also matches its audited blob 9abf2a5edf5eb11e7d55a44d66048285df9c9984. This is a static applicability check, not another cache execution.

The audit records that a lookup-cache hit can return before database authorization/visibility is read. Therefore anonymous SQL filtering after a transfer into a private site does not prove that a previously cached redirect is suppressed. Positive/negative lookup TTLs of 30/15 seconds are code-level findings, not measured propagation windows. A site_id-only move does not necessarily make an unchanged public redirect payload semantically stale; visibility changes and rule edits must be distinguished.

## Remaining evidence gates

1. Reproducibility: preserve the exact integration harness, its pinned inputs and the observed result without weakening assertions.
2. Database/runtime: verify disposable native PostgreSQL sessions, concurrent registration versus transfer and competing moves; replace fixture Auth/REST with an approved isolated Supabase Auth/PostgREST path and test deployed same-origin behavior. Serialized WASM transactions are not concurrency evidence.
3. Schema completeness: account for omitted profile/auth foreign keys and signup/account-limit behavior before treating the fixture as deployment-ready.
4. Cache/routing: reconcile existing redirect-test evidence with the audit acceptance matrix, especially warmed positive/negative caches, public-to-private visibility, edits/disable/remove, backend failure/recovery, and approved alias/external-redirect behavior. The 12-case run did not invoke the redirect handler or prove cache invalidation. Do not change legacy policy or purge caches without separate approval.
5. Provider/tenant identity: verify final HTTPS and intended tenant or approved external target per hostname in an explicitly approved isolated environment. Fixture provider/SSL display fields and generic successful HTML are not identity proof. Do not mark providerCacheVerified true from this checkpoint.
6. Entry/rollout: active Studio entry, native Worker, provider/cache propagation, deployment configuration and production verification remain outside this run.

## Next safe work order

First preserve the exact integration runner for replay. Then map existing cache tests to the visibility/failure cases above and design any missing isolated tests against the real handler, without contacting production or changing flags. Resolve the approved disposable native/runtime environment separately before concurrency or real Auth/PostgREST execution. These are proposed next steps, not completed work or authorization to provision resources.

## Change and release boundary

This checkpoint adds evidence and this review only. It changes no application code, SQL draft/migration, previous runner/result, grant, active entry, environment flag, provider, DNS, cache or deployment. Existing historical contract/audit statements describe their own creation-time evidence; this additive checkpoint does not rewrite them. No production connection or new Supabase resource was used for the 12-case run.

No merge to main or production activation before stage 10 is completed and verified and the owner gives separate release approval. Recording this hold does not alter CI or branch protection.
