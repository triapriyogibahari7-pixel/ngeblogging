# Production Promotion v172

Operational deployment trigger for the production Custom Domain authority.

- Release: `2026.07.30-production-custom-domain-v172`
- Worker service: `ngeblogging`
- Exact Worker Domains: `ngeblogging.com`, `www.ngeblogging.com`
- Tenant wildcard preserved as route: `*.ngeblogging.com/*`
- Mobile/public layout: `mobile-public-v171-20260730`
- First-site onboarding: `first-site-onboarding-v169-20260730`
- Maximum owned sites per account: `25`
- Production completion requires issue #243 to be updated by the deployment workflow after domain read-back and public probes pass.

This file changes no application data and exists only to emit a fresh `main` push after PR #248 was merged.
