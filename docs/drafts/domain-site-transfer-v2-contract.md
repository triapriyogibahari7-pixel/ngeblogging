# Stage 5: revised domain transfer contract

Status: DESIGN ONLY. Stage 5 and stage 4 remain OPEN. No migration, PostgreSQL transaction test, browser E2E, merge or production rollout is authorized by this document.

## Evidence

Read-only audit approved by the owner and executed on 2026-10-30 against project polvmlrhqoiflumibfqs. No application data was modified. Draft reviewed: docs/drafts/domain-site-transfer-v1.sql, blob 8a9fb3c5ef42188c930400fe927cc825f1bd208e.

Observed database facts:
- private.sync_managed_subdomain inserts an active platform subdomain into site_domains when a site is created, and handles slug changes.
- site_domains_one_primary_per_site is a unique partial index on site_id WHERE is_primary.
- Existing custom_domain synchronization chooses an active primary hostname without excluding platform subdomains. Its trigger does not handle site_id-only updates.
- authenticated has SELECT/INSERT/UPDATE/DELETE table grants; RLS updates depend on owner/admin membership. Table grants alone do not prove invoker compatibility.
- Zero site groups had multiple domain rows at audit time; this is not proof that a global one-row-per-site invariant is valid.

## V1 is blocked

Do not apply domain-site-transfer-v1.sql. Its global unique site_id index conflicts with preserving a platform subdomain alongside a custom domain. Its target occupancy check treats the managed subdomain as a conflict. A non-null sites.custom_domain is not by itself evidence of an occupied custom-domain slot.

## Required V2 behavior

1. Define and audit platform/custom classification before writing a partial uniqueness constraint. Provider alone is not yet an approved complete classifier for historical rows. Reject ambiguous rows for review; never delete them automatically.
2. Preserve managed-subdomain rows, site slugs, content, publication state and ownership. Moving a platform subdomain is forbidden.
3. Enforce at most one custom-domain reservation per site, including pending/verifying states, only after checking historical providers, aliases and registration compatibility. Preserve the existing primary uniqueness constraint.
4. Specify active-primary transfer ordering: safely demote the target platform primary before moving an active primary custom domain; restore the source platform primary when appropriate. Every intermediate write must remain inside one transaction. Do not silently promote pending/verifying custom domains.
5. Derive both sites.custom_domain values from the existing active-primary rule, including legitimate platform fallback. Retry validation must compare canonical state rather than assume NULL for a pending transfer.
6. Require current ownership of both sites and verify membership/RLS consistency. Keep SECURITY INVOKER; do not bypass failures with service_role or SECURITY DEFINER.
7. Check all affected row counts and mappings after writes. Any denied demotion, move, fallback or synchronization must roll back the complete transfer.
8. Registration and transfer must share a database-enforced custom-slot invariant; a preliminary HTTP availability check alone is insufficient. Preserve clear conflict responses and recovery from lost responses.
9. Review redirect/alias foreign keys, provider mappings and hostname cache invalidation before enabling the endpoint. No Cloudflare/DNS mutation is authorized here.
10. React confirmation must show hostname, source, target, routing impact and retained free subdomains. Re-read current state after an uncertain response; never claim rollback from an HTTP timeout alone.

## Required tests on disposable PostgreSQL

- Both sites retain their managed subdomain rows after transfer.
- Active-primary custom transfer demotes target platform primary, restores source fallback and preserves primary uniqueness.
- Pending/verifying transfers do not activate the custom hostname and preserve appropriate platform routing.
- Occupied custom target rejects the move without changing either site.
- Anonymous, admin-only, other-owner, inactive-target and platform-domain moves are rejected.
- Owner/membership mismatch fails safely under authenticated RLS.
- Forced failures after demotion, move and fallback restore the original state.
- Concurrent registration versus transfer cannot create two custom reservations.
- Repeat, stale confirmation, competing move and lost-response cases reconcile against real state.
- Alias/redirect relationships and metadata remain consistent; cache tests are separate integration evidence.

No tests above have been executed by creating this contract. Next: audit classification and dependent relationships, implement a replacement SQL draft, then execute isolated database tests before React activation. Do not use production as a disposable test database.
