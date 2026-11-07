# Cloudflare push release

Ten new support files plus an update to cloudflare-production-main.yml. That existing workflow remains the push-to-main/manual entrypoint; cloudflare-release-engine.yml is reusable workflow_call only, not a second push deployment trigger. Other repository workflows and Cloudflare Git integration are not disabled by this change.

The engine retains the production environment, locked dependency installation, existing comments-layout guard, catalog/theme tests, cache versioning, Vite build, wrangler dry-run, Worker/assets deployment and Midtrans verification. It adds context checks, domain mocked tests, release stamping, exact public-commit verification and separately labelled customer DNS/HTTP observations. No forced deployment past failed gates is added.

Required secrets remain CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN in the existing production secret configuration; preserve the existing VITE_SUPABASE_PUBLISHABLE_KEY/vars setup. Never put credentials in policy.json or artifacts. Preflight validates credential shape, not remote permissions. Environment approvals, branch protection and GitHub Actions availability/billing still apply. Required check names should be reviewed if branch rules reference job names.

Exact commit verification uses the existing dist/release-v344.json asset and queries both application origins with bounded retries; redirects, HTML and mismatched commits fail verification. Failure does not mean a rollback occurred. Customer SERVFAIL/HTTP 530 is recorded separately and does not become a deployment-success or tenant-content claim. A successful customer-observation step means observations were written, not that DNS is healthy.

The change does not configure nameservers, DS/DNSKEY, registrar delegation, DNS records, provider flags, database migrations or the unfinished queue/runtime integration. No authoritative ns1/ns2 service is provisioned. Production acceptance still requires actual provider and live-domain checks.

Local preparation validates mocked release helpers, JavaScript syntax and YAML structure only. It does not execute full Vite build, GitHub workflow semantics, Cloudflare permissions, deployment, live metadata or real-domain acceptance. CLI entry scripts run from repository root; local deployment guards require a valid main/push or main/manual context and must not be faked as production evidence.
