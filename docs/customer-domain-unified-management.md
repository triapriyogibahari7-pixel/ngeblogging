# Unified custom-domain API view — no provider migration

The Worker enriches successful JSON /api/domains/* responses containing domain or domains with a versioned connection view. Existing authorized handler responses, record identity, provider, primary state, DNS instructions, list limits and aliases remain authoritative. Other paths, errors and non-domain payloads pass through. This adds response metadata only; it does not add permissions, perform database writes, change DNS, provision hostnames or change global flags.

Every hostname uses the same policy. triapriyoginotes.my.id and triapriyogi.com appear only as test fixtures, not production allowlists or overrides. Their live provider/state has not been inventoried by this patch. Domain rows remain inside their original site and existing authentication/RLS boundaries.

Full-zone rows expose migrationRequired:true and nextStep:review-migration toward the future SaaS target, without relabeling the current provider. Existing SaaS rows expose migrationRequired:false. Unknown providers require review; blocked/deleting records are not offered automatic action. automaticMigrationAllowed is always false. No implicit www alias is created, and disabled aliases stay disabled. nextStep is informational, not proof of manager permissions, provisioning readiness or authorization to mutate.

This is a common API contract, not a completed provider cutover or updated customer UI. Refresh/reconciliation still uses the stored provider. A separate explicitly approved migration needs actual authorized domain inventory, platform/apex capability checks, DNS/DNSSEC and certificate validation, alias/primary preservation, cutover and rollback planning. No public HTTP/content health is attested by the connection view.

Twelve real view/response unit tests plus six stubbed Worker dispatch tests passed locally on Node v20.20.1. This is not Node 22.12.0 acceptance, a full repository/UI build, native Worker real-module integration, production DB audit, GitHub CI or live deployment. Existing BYOD staging notes and activation prerequisites remain applicable.
