# Fresh-only redirect candidate checkpoint

Date: 2026-10-30. Stage 4 and stage 5 remain OPEN. No stage 6 start, active-handler integration or rollout is authorized by this checkpoint.

## Change

The new isolated wrapper reuses createTestRedirectPipeline and returns only a resolver that always passes fresh=true. It requires enabled=true and environment=isolated-test; missing or incorrect opt-in fails before dependency construction. The existing fixture-origin restrictions remain in force. This is a test-only assembly, not a production Supabase adapter or a feature flag added to the Worker.

The lookup and pipeline candidate modules are unchanged. No active handler, Worker entry, runtime configuration, legacy behavior, grant, SQL draft or migration is modified. Other callers can still use the original candidate APIs or legacy caches; this wrapper cannot make those paths fresh.

## Observed evidence

Sixteen offline Node fixture scenarios passed with zero failures and exit code zero before this checkpoint. Both complete dependency modules matched their tool-reported Git blob IDs before execution; IDs are recorded in tests/results/domain-transfer-fresh-only-candidate-2026-10-30.json. The saved runner does not enforce those hashes itself. Saving these files is not a replay and adds no pass count.

Replay from the repository root with node tests/fresh-only-resolver.test.mjs. The runner uses injected fetch only and does not contact a network backend. Its cache get/set methods throw when called; zero calls establish bypass independently of cache contents. Named cached objects are not actually read, migrated or purged. Disable/remove and private visibility are represented by backend response fixtures, not by running their management endpoints or real SQL/RLS.

## Contract and remaining integration boundary

A successful empty backend result means no visible matching rule in that caller context, not global nonexistence or permission to serve private content through another fallback. Backend/transport/payload failures map to generic no-store 503 rather than absence. A fresh query and no-store hint do not prove upstream freshness or real authorization. Cooperative abort tests do not prove forced termination or hard real-time deadlines.

Before active integration, approve an isolated adapter/auth environment, verify actual anonymous RLS and transfer ordering, define outer Worker handling of null versus 503, and test tenant identity and every routing fallback. Map the previous resolver-slice characterization and existing cache evidence separately; neither a candidate pass nor this wrapper fixes the active legacy handler. Do not report a global cache purge or providerCacheVerified=true.

No new Supabase resource, DNS/provider change, cache purge, deployment or production activation is included. No merge to main or production activation before stage 10 completion, verification and separate owner release approval. This record does not change CI or branch protection.
