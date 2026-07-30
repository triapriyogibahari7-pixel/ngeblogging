# Cloudflare Production Trigger v172

This commit is intentionally created directly on the configured production branch so the Cloudflare Git integration receives a fresh commit event rather than only a ref fast-forward.

Expected deployment authority:

- Release: `2026.07.30-production-custom-domain-v172`
- Service: `ngeblogging`
- Apex Worker Domain: `ngeblogging.com`
- WWW Worker Domain: `www.ngeblogging.com`
- Tenant wildcard route retained: `*.ngeblogging.com/*`
- Public verification endpoint: `/release-v172.json`

No application data, authentication data, tenant content, or user configuration is modified by this file.
