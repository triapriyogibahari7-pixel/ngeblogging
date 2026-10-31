# Fresh-only anonymous SQL integration replay

Checkpoint date: 2026-10-31 Asia/Jakarta. Observed execution date: 2026-10-30 Asia/Jakarta. Stage 4 and stage 5 remain OPEN; this checkpoint starts no later stage.

## Evidence and source pins

The adjacent HTML preserves the approved inline runner that produced the 10/10 result in tests/results/domain-transfer-fresh-only-anon-sql-2026-10-30.json. Saving it adds no execution or pass count. Candidate modules are pinned to d21c8761a374cc6c45464ea7329f2fa9a3e41bce, catalog setup to cbcfe16210356d37a6bb25c732430f86eaa49cc3, and SQL inputs to 323fce910fa37599f97aa3176acff85edfed5190. The runner checks all three candidate Git blob hashes before importing them, changing only relative import locations to browser blob URLs. Do not replace pins with branch names or weaken the hash checks.

## Replay

Use the HTML as page content in an approved isolated Chromium browser with ES modules, blob modules, dynamic functions and WASM available. Public GitHub raw and pinned CDN access are required to load code. No request to a real Supabase service is made: https://storage.test is handled by an injected REST-to-SQL bridge. PGlite is created without a remote database URL. All schema creation, fixture inserts, truncation and SQL mutations are confined to that temporary in-browser database. Never adapt this runner to point at production.

Wait up to 60000 ms for #result[data-done="true"], then retain the full JSON. Completion alone is not success: require passed=true, passedCount=10, failedCount=0, databaseClosed=true, productionConnection=false, newSupabaseResource=false and the expected three verifiedBlobs. Setup errors, import errors, timeouts or fewer scenarios are not a pass. No replay of the persisted artifact is claimed by this checkpoint. The earlier 33-case SQL matrix, 12-case UI integration and 16-case offline candidate suite are separate evidence and are not rerun by this HTML.

## What changed relative to response-only fixtures

Reads execute SET LOCAL ROLE anon with an empty fixture claim, verify current_user and auth.uid(), and use the catalog slice's actual RLS policies. Moves execute the stored RPC under authenticated with the fixture owner claim. Positive/negative in-memory entries are seeded through candidate lookup using anonymous SQL before each relevant transition. Fresh-path evidence records zero cache gets/sets. Direct SQL edit, disable and removal are not management-endpoint tests and do not verify locked-rule endpoint behavior.

In the public-to-private case, fresh returns no rule while a separate cached candidate control still returns 307 with zero new SQL queries. The control is createTestRedirectPipeline with fresh=false, not the active legacy handler. Successful empty reads establish absence within this anonymous SQL visibility context, not global nonexistence or safety of any outer fallback.

The privilege-denial case queries a deliberately ungranted private fixture table, producing actual SQLSTATE 42501. The injected bridge deliberately maps that error to HTTP 503; the test proves candidate handling of that bridge response, not real PostgREST error mapping. Recovery restores the normal query path.

## Remaining limits and next boundary

This is a catalog-aligned schema slice and claim shim in WASM, not full production schema or real Supabase Auth/PostgREST. Operations are serialized. Cache TTL, native Cloudflare Cache API, regional propagation, purge and global invalidation are not measured. Active Worker, provider/DNS/TLS, tenant identity, outer null-versus-503 handling and routing fallbacks remain untested here. Next review those outer paths without wiring the candidate or changing flags.

No application handler, existing candidate, previous runner/result, SQL draft/migration, grant in a real project, environment setting, resource, DNS, cache or deployment is changed by this checkpoint. No merge to main or production activation before stage 10 completion, verification and separate owner release approval. This document does not change CI or branch protection.
