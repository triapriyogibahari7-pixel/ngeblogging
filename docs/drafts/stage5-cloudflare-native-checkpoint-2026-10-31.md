# Stage 5 Cloudflare native acceptance checkpoint

Observed 2026-10-31 Asia/Jakarta. Recording existing observations is not another test execution. Stage 4 and stage 5 remain OPEN.

## Verified native database evidence

- Tested commit: 09f29f2eb99561db1524e5809e3e56a710f17290.
- Cloudflare build: 194a8e0d-9e6b-41b8-81c4-12311afa7b6f.
- Artifact read successfully over HTTPS: https://feature-domain-stages5-10-integration-20261030-ngeblogging.triapriyogibahari7.workers.dev/stage5-native/09f29f2eb99561db1524e5809e3e56a710f17290.json
- Engine: native PostgreSQL 17.6, server_version_num 170006, database domain_transfer_test.
- Catalog: 33 passed, 0 failed. Native contention: 3 passed. Overall passed=true.
- Competing moves observed distinct backend PIDs 982/983 and relation-lock wait; loser SQLSTATE 40001.
- Move before registration observed PIDs 984/985 and relation-lock wait; registration rejected with 23505.
- Registration before move observed PIDs 986/987 and relation-lock wait; move rejected with 23505.
- nativeSessionsClosed=true, nativeServerStopped=true, temporaryFilesRemoved=true, productionConnection=false, newSupabaseResource=false.
- Setup pinned to cbcfe16210356d37a6bb25c732430f86eaa49cc3; SQL pinned to 323fce910fa37599f97aa3176acff85edfed5190.

## Deployed preview observation

At 2026-10-31T02:10:46Z, a GET to the same preview host at /api/domains/move-state returned HTTP 503, JSON {"code":"STAGE5_DISABLED"}, Cache-Control: no-store, and x-stage5-preview: isolated-disabled-v1. This is expected disabled-route behavior, not an active-transfer success test. No POST mutation was sent in this observation.

## Remaining acceptance boundaries

Native SQL uses a catalog-aligned schema slice and fixture auth.uid claims, not real Supabase Auth/PostgREST or the full production schema. The registration race uses direct authenticated INSERT, not registration HTTP/provider orchestration. Relation-lock serialization is not a production throughput approval.

Still unverified by this checkpoint: full-schema/profile/signup compatibility; real isolated Auth/PostgREST and deployed same-origin active transfer/readback; built-client tenant isolation; alias/provider/cache propagation and DNS/TLS end-to-end behavior. The deployed disabled GET does not replace those checks. Historical WASM/UI/cache fixture evidence remains separate.

No new Supabase project is needed for the native result recorded here. Do not weaken loopback, database-name, source-pin or assertion guards to point this runner at production. Resolve any further isolated Auth/runtime environment and exact test changes separately before execution.

No application, SQL, flag, WAF, provider, DNS, cache or database change is included in this documentation commit. No merge or production activation before stage 10 completion, verification and separate owner release approval. No stage 6 start or stage 5 closure is claimed.
