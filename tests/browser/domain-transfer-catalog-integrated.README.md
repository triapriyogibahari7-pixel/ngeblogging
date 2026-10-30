# Catalog integration replay harness

Date: 2026-10-30. Stage 5 remains OPEN.

The adjacent domain-transfer-catalog-integrated.html preserves the approved inline harness used for the observed 12/12 integration result recorded in tests/results/domain-transfer-catalog-integrated-2026-10-30.json. Saving it is not another execution and adds no pass count. Application/setup source remains pinned to cbcfe16210356d37a6bb25c732430f86eaa49cc3; SQL inputs remain pinned to 323fce910fa37599f97aa3176acff85edfed5190. Do not replace either pin with a branch name for replay.

## Replay

Execute the HTML as page content in an approved isolated Chromium browser with ES modules, import maps, blob modules and WASM available. It needs public GitHub raw and the pinned CDN dependencies. The observed execution used Cloudflare Browser Rendering page content, not a deployed Studio entry. A different browser origin may activate additional client origin guards; do not disable those guards to force a pass.

Wait up to 60000 ms for #result[data-done="true"]. Read the JSON from #result and retain the full result. Completion alone is not a pass: verify passed=true, passedCount=12, failedCount=0, databaseClosed=true, productionConnection=false and newSupabaseResource=false. An import failure or timeout can prevent completion and must not be counted as success.

The 33 SQL-only catalog assertions are intentionally not executed here. The harness reuses only their stored setup slice and fails when its extraction markers change.

## Historical report boundary

At checkpoint 21253dbbfda99b5305653a46fa4489142fc4caa6 the observed result correctly recorded integrationRunnerCommitted=false. This later runner addition supersedes only that persistence limitation; the earlier result is retained unchanged as historical evidence. No replay of the persisted artifact is claimed by this addition.

## Limits and release hold

Auth/token mapping, REST transport, Origin and provider/SSL display data are fixtures. Transactions are serialized; this is not native concurrency or deployed Auth/PostgREST/CORS proof. Private-target SQL filtering does not prove warmed redirect-cache visibility. There is no provider, DNS, cache purge, production mutation, deployment or CI activation. Do not mark providerCacheVerified true from this harness.

No merge to main or production activation before stage 10 completion, verification and separate owner release approval. This document does not change CI or branch protection.
