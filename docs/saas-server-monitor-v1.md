# SaaS server monitor v1: disabled observer

Source proposal only, not an enabled production service or a 50,000-domain capacity certification. Do not apply migration or deploy without separate approval.

## Design
Private scheduled Worker; cron list empty and SAAS_SERVER_MONITOR_ENABLED=false. Queue tables/RPCs are service-role-only with RLS enabled. One shared claim window per minute, at most 60 jobs, four processing slots, 500 ms provider-start spacing, 45-second processing deadline and 12-second per-observation timeout. Lease UUIDs expire after 180 seconds; completion rechecks source identity under a source-row lock and rejects old leases. This is at-least-once observation, not exactly-once execution.

Triggers enqueue new/materially changed eligible SaaS rows. Existing rows seed in batches of 1,000 until exhausted. Pending/error backoff grows to six hours plus jitter; HTTPS 200 rechecks after 24 hours plus jitter. HTTP 429 applies a shared future-claim cooldown and per-job Retry-After, capped at 24 hours; in-flight reads can still finish.

GET-only Cloudflare, DNS and HTTPS observations. Only private queue/control/result RPCs are written. No changes to DNS, nameservers, certificates, provider choice, site_domains status, sites.custom_domain or payments. CNAME observation is not comprehensive DNS verification. HTTPS is exact requested hostname, manual redirect handling and HTTP 200 only through the existing strictly-public auditor binding. No credentials are forwarded to customer sites; response bodies are canceled. All results force site_content_verified=false and live=false. Stored results are not yet wired into the customer UI.

## Configuration and acceptance
Server secrets: SUPABASE_SERVICE_ROLE_KEY and preferably dedicated read-only zone-scoped CLOUDFLARE_DOMAIN_API_TOKEN (CLOUDFLARE_API_TOKEN fallback). Nonsecrets: SUPABASE_URL=https://polvmlrhqoiflumibfqs.supabase.co, CLOUDFLARE_ZONE_ID, CLOUDFLARE_CUSTOM_HOSTNAME_TARGET. PUBLIC_AUDITOR binds ngeblogging-public-auditor.

Before activation: run SQL/RLS/concurrent claim, expired lease, stale finish, reassignment and deletion-race tests on an approved isolated PostgreSQL database; run repository build/native Worker tests; load-test 50,000+ mixed pending/active rows and measure oldest queue age, throughput, 429s and expired/stale leases. Fifteen isolated Node tests use fake RPC/provider/DNS/auditor. The 50,000 synthetic hostname validations are not a database/network load test. No SQL, production capacity or real HTTPS acceptance has been verified.

At 60 claims/minute an ideal first pass over 50,000 jobs takes about 13.9 hours, not an observed result or SLA. Retries, timeouts and shared account traffic reduce capacity. Review provider/plan budgets and costs. Obtain separate approval for migration, secrets, disabled deployment and then cron/flag enablement. Add an explicit cohort filter before a limited rollout: the current seeder covers all eligible domains when enabled. Cron activation would require a reviewed configuration change to a once-per-minute schedule plus the enabled flag.

Add an owner-scoped stored-result read API and serving-identity proof before any Live promotion. Rollback starts by disabling cron/flag and stopping this Worker, retaining observations for diagnosis; never delete customer domains, reset main or alter DNS as rollback.
