# Production Merge Event v172

This operational marker is merged through a pull request whose base is the `production` branch. It exists to ensure the Cloudflare Git integration receives a normal production-branch merge event.

Expected authority after deployment:

- `2026.07.30-production-custom-domain-v172`
- Worker service `ngeblogging`
- Exact Worker Domains `ngeblogging.com` and `www.ngeblogging.com`
- Tenant route `*.ngeblogging.com/*` remains intact
- React shell on root, login, signup, and Studio
- First-site onboarding before Studio
- Maximum 25 owned sites per account
- Mobile/public layout `mobile-public-v171-20260730`
- No `WHITE-R4-2026.07.12`

No user data, site content, authentication record, tenant configuration, or feature implementation is changed by this marker.
