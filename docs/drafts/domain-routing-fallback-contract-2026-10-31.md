# Wrapper-chain evidence and proposed fallback contract

Date: 2026-10-31. DESIGN PROPOSAL ONLY; stage 4 and stage 5 remain OPEN. No production policy, active handler integration, flag activation or later-stage start is authorized by saving this document.

## Evidence and reproduction

The observed browser run executed 11 scenarios with zero failures. See tests/results/domain-complete-wrapper-chain-2026-10-31.json and tests/browser/domain-complete-wrapper-chain.html. All eight Worker modules from v70 to core were included, together with original canonical, SEO and legal modules and the fresh-only candidate. Fourteen source blobs were verified at commit 034b492862ef8655e1304cbe2cfeeea526616e4b. Feature dependencies, backend and ASSETS remain fixtures; comments are pass-through and no real Auth, SQL/RLS or native Worker runtime is exercised. The request-ID function required a browser shim.

The persisted runner is the executed payload. It includes an unused resolveAuthGatewayConfig export on the data-gateway fixture that was absent from the reviewed draft; no byte-for-byte identity between draft and executed payload is claimed. No tested path calls that unused export. This provenance note does not authorize changing approved execution inputs.

For replay, use the HTML as page content in an approved isolated Chromium browser with module/blob support and public GitHub raw access. Wait up to 60000 ms for #result[data-done="true"]. Retain the full JSON; require passed=true, passedCount=11, failedCount=0, the expected 14 verifiedBlobs, productionConnection=false and activeHandlerChanged=false. Completion alone, setup failure, import failure or timeout is not success. Saving this runner is not a replay and adds no pass count. Other SQL, UI, offline candidate and two-module boundary results remain separate evidence.

## Observed boundary

Fresh resolver 503 remains terminal for GET/HEAD in the tested chain. Empty redirect lookup can reach SEO and then ASSETS. Invisible metadata and metadata HTTP failure both produced the supplied unattributed shell with status 200. These fixtures demonstrate fallback reachability, not real tenant-data leakage or client isolation. Canonical routing can run before fresh lookup; its exceptions can be swallowed before continuing. Static fast paths can return before either lookup. None of these paths is fixed by this checkpoint.

## Proposed contract to implement and test separately

1. Keep redirect outcome separate from site authorization. A missing redirect rule does not establish that a hostname is unknown, private or safe to serve. An approved external redirect must be checked against its approved URL contract, not forced to render a local tenant.
2. For tenant HTML fallback, require an explicit site-resolution outcome: public with a unique validated tenant/hostname mapping, not_visible in the anonymous visibility context, or unavailable. Do not infer global nonexistence or disclose private ownership from not_visible. Malformed, ambiguous or inconsistent mappings must not silently select a tenant.
3. Proposed terminal responses: unavailable yields generic 503 with no-store; not_visible yields a generic 404 with no-store and no tenant identifiers. These are candidate policies requiring review, not current implemented behavior. Neither outcome may reach a tenant shell/content fallback. HEAD responses must have no body.
4. Only the validated public outcome may proceed to tenant HTML and tenant-specific metadata/content. Carry request-scoped validated identity to downstream components and verify content belongs to it; never switch tenant based on a fallback or stale unrelated context. Fresh-read hints alone do not guarantee upstream freshness, snapshot consistency or safety during concurrent visibility changes.
5. Classify system routes, API routes, approved shared static assets, tenant HTML and approved external redirects explicitly. Do not globally block legitimate shared JS/CSS merely because it bypasses tenant resolution; do not allow an HTML SPA fallback to be misclassified as a shared asset. Preserve existing system/API contracts until a separately approved rollout.
6. Canonical decisions must satisfy their own current anonymous-visibility/mapping contract or be ordered behind the relevant guard. Define how lookup unavailability differs from no canonical mapping; do not silently treat both as permission to serve tenant HTML. Existing cached canonical responses and the www versus free-host policies need separate handling; a new no-store response does not evict old redirects.

## Required next tests, not completed by this checkpoint

- In a separate default-off candidate, assert zero tenant-render calls for not_visible, unavailable, malformed and ambiguous mappings; verify generic status/body/no-store and HEAD behavior.
- Negative controls must fail if metadata HTTP failure is changed into a successful absence, if a hidden-site result is allowed to reach tenant rendering, or if an error/identity mismatch switches to another tenant.
- Test public-site/no-redirect separately from hidden or unknown-site outcomes so a valid public tenant remains accessible. Distinguish approved external redirects from publishing aliases.
- Exercise static asset versus HTML classification and canonical ordering through the entire chain without changing legacy source for a test pass.
- Then verify the candidate using approved isolated real Auth/PostgREST/RLS, built client behavior, native Worker execution and concurrent transitions. These environments and executions need separate approval. Do not use production as a disposable test environment.

## Change boundary

This checkpoint adds runner/evidence/design only. No existing application code, candidate module, SQL draft/migration, grant, real-project setting, flag, resource, provider/DNS, cache, deployment or previous result is modified. The proposed contract has not been implemented or accepted as a rollout policy. No merge to main or production activation before stage 10 completion, verification and separate owner release approval; this document does not change CI or branch protection.
