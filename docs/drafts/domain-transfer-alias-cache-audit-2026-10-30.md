# Domain transfer: alias and redirect-cache audit

Date: 2026-10-30. Status: STATIC AUDIT ONLY; stage 4 and stage 5 remain OPEN.
Pinned source commit: fff948145f63deb24cb8f70b009d94e9da2a40ae.
No runtime change, grant, migration, environment flag activation, cache purge, merge, deployment or production data change is authorized by this document.

## Sources reviewed

- server/domain-redirect-handler.mjs, blob 584316ed41a0451467fd2541e314de1cca9139bc.
- docs/drafts/domain-site-transfer-v2.sql, blob bf3fc0bd6d59c7f298837018065c9316d8c389eb.
- docs/drafts/domain-redirect-rls-v2-prerequisite.sql, blob 54e20d57b6168f1b1443048b09fa7ce152162328.
- server/domain-handler-v112.mjs, blob 9abf2a5edf5eb11e7d55a44d66048285df9c9984.

## Findings

### 1. SQL preserves alias metadata, but does not prove provider routing

The draft RPC changes the domain row's site_id and reparents site_domain_redirects.site_id in the same transaction. Its final row comparison excludes only site_id and updated_at, thereby requiring all other domain fields, including ownership_verification and its additional_hostnames metadata, to remain unchanged. Redirect source_hostname, target_url, enabled, permanent and preserve_path are not rewritten.

The v112 helper reads enabled additional_hostnames from that domain metadata. This is evidence of preservation and discovery, not evidence that each provider hostname serves the target tenant. No live DNS, provider, TLS or alias-identity check was performed in this audit. The RPC correctly returns providerCacheVerified: false.

### 2. A site_id-only transfer does not necessarily invalidate cached redirect payloads

publicRule caches only the selected public redirect payload target_url, permanent and preserve_path under a hostname-derived key. The key is https://domain-redirect-cache.ngeblogging.invalid/<encoded-hostname>. The SQL transfer does not change those payload fields.

If public visibility and rule fields are unchanged, the cached payload can remain semantically valid after a transfer. Do not classify every cached rule as stale solely because site_id changed. Conversely, this observation does not prove fresh authorization or visibility: a cache hit returns before consulting the database. The actual anonymous read policy and visibility transitions require separate verification. The prerequisite SQL changes write-policy correlation, not the public read policy.

### 3. Redirect edits can remain stale; negative entries can delay discovery

Positive lookup entries use max-age=30; null entries use max-age=15. The reviewed upsert, toggle and remove paths do not delete the lookup key. Until expiry, an old target or enabled rule can therefore remain visible, or a previously missing rule can remain undiscovered. These are code-level cache windows, not timings measured in a live Cloudflare PoP.

The final HTTP redirect itself already uses Cache-Control: no-store. This is distinct from the internal lookup cache and from the separate free-host canonical redirect policy added in the preceding commit. Do not conflate the three layers.

### 4. Non-OK database responses are cached as absence

publicRule maps result.ok === false to an empty row array and then caches null for 15 seconds. A temporary backend HTTP failure can therefore look like an absent rule even after backend recovery until that entry expires. No production outage was observed or induced; this is a static control-flow finding. Network exceptions and malformed responses require their own tests and are not characterized as successful absence here.

### 5. Existing reachability audit is not tenant-identity verification

auditTarget follows redirects and marks a target reachable when the final response is successful, declares text/html, and contains a doctype/html prefix. It does not compare an expected tenant identity. Its successful-path https field is set to true without checking the final URL protocol after redirects.

Consequently allReachable: true is insufficient evidence of correct post-transfer ownership/routing, and it must not be used to mark providerCacheVerified true. Any identity check must distinguish a publishing alias from an intentional external redirect rule; an external redirect must be checked against its approved URL rather than forced to render the local tenant.

## Required acceptance checks before activation

1. Enumerate root, www, enabled additional_hostnames, and redirect sources from an authorized, fresh state read. Detect missing, duplicate or out-of-domain entries; do not provision or delete anything automatically.
2. Capture the intended behavior of each hostname: target-site publishing, apex canonicalization, or an approved external redirect. Record expected tenant identity or target URL accordingly.
3. In a disposable test environment, transfer active and pending/verifying fixtures. Verify alias metadata, provider identifiers and redirect fields survive unchanged; source free hostname remains associated with the source tenant and target hostname with the target tenant.
4. Exercise cold, positive and negative lookup caches before and after transfer. Test rule edits, disable/remove, failed backend reads, recovery, and any relevant public-to-private visibility transition. Do not assume the anonymous read policy permits or forbids these without checking the real test schema.
5. Define how transient lookup failure differs from authoritative absence. Evaluate a transfer-safe fresh-read policy or narrowly scoped invalidation without claiming either is implemented here. Preserve legacy behavior unless an explicit rollout policy is approved.
6. Verify final HTTPS and expected routing/identity after following only permitted redirects. A generic successful HTML page is not enough. Use a browser-based check where tenant identity is resolved client-side.
7. Separately handle previously issued free-host canonical redirects. The default-off REVERSIBLE_FREE_DOMAIN_REDIRECTS policy changes future responses only; it does not evict old browser or shared-cache entries.
8. Verify cache behavior across required locations or document a measured propagation/expiry window before enabling real transfers. Local cache deletion, if later implemented, must not be labeled global purge without evidence.

## Execution and approval boundary

This pass executed repository reads and a static audit only. It ran no new Node, SQL, browser or provider tests and does not add to prior pass counts. No real domain/alias, cache entry, Supabase resource, secret or environment configuration was modified. Saving this document is not approval to execute the acceptance checks against production or to enable either transfer mutations or redirect flags.
