# Isolated tenant fallback guard checkpoint

Date: 2026-10-31. Stage 4 and stage 5 remain OPEN. This adds a local candidate and evidence, not a rollout policy or active integration.

## Candidate contract

The module in server/drafts/domain-tenant-fallback-guard.mjs requires explicit enabled=true and environment=isolated-test plus readSite and renderTenant callbacks. It accepts fixture/loopback request hosts only and GET/HEAD methods. It is not imported by an active Worker.

readSite(host,{cache:'no-store'}) returns an HTTP-like response whose JSON is zero or one flattened mapping containing site_id, hostname, site_status, domain_status and is_public. Empty results, explicitly nonpublic rows and known inactive states yield generic no-store 404 with zero renderer calls. HTTP/transport/payload errors and malformed, ambiguous or mismatched mappings yield generic no-store 503 with zero renderer calls. Successful empty visibility is not global nonexistence and does not reveal private ownership.

Only active/public validated mappings reach renderTenant(request,context). The context contains a frozen siteId/hostname pair. The renderer returns {siteId,hostname,response}; identity must match, status must be 200 and content type must be HTML before release. Successful output is no-store and HEAD is bodyless. This guard handles tenant HTML only: approved external redirects, canonical routes and shared assets require separate routing decisions. A valid public tenant does not need a redirect rule.

## Evidence and replay

The observed local baseline passed 21 scenarios with zero failures and exit code zero. Three deliberately weakened versions failed with exit code one: HTTP error as absence failed two tests; hidden/empty result sent to rendering failed three; removal of renderer identity checks failed two. These failures are successful negative controls, not failures of the baseline candidate. No network was attempted.

Run node tests/tenant-fallback-guard.test.mjs from the repository root for the baseline. The unit runner does not automatically apply negative controls. Exact one-replacement recipes and observed failing test names are recorded in tests/results/domain-tenant-fallback-guard-2026-10-31.json. Reproduce each only in a separate temporary copy, verify its anchor is unique, and never mutate the baseline or active code for a control. Saving this checkpoint is not a replay and adds no pass count.

## Trust and integration limits

readSite is an injected fixture adapter, not an implementation of anonymous Supabase/PostgREST/RLS reads. The renderer is a trusted callback: cooperative returned identity is not cryptographic attestation, inspection of HTML contents or prevention of internal callback side effects. No-store hints do not guarantee upstream freshness, transaction snapshots or safety during concurrent visibility changes. The candidate does not impose a hard timeout or response body-size bound.

Next design and test an isolated metadata adapter that preserves unavailable versus not-visible outcomes and exact hostname/tenant mapping. Then assemble it with the existing fresh redirect candidate and routing classification in a separate default-off harness, including canonical ordering and public shared-asset behavior. Test actual content ownership and built-client fallback behavior before native/deployed acceptance. Do not change existing handlers or weaken assertions to make that assembly pass.

No existing candidate, Worker, handler, configuration, flag, SQL draft/migration, real-project grant, resource, provider/DNS, cache, previous result or deployment is changed. No merge to main or production activation before stage 10 completion, verification and separate owner release approval. This document does not change CI or branch protection.
