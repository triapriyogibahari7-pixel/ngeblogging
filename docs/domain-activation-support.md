# Domain activation support candidate

These helpers are not integrated into a router, Worker entry export, Durable Object binding or migration. Merging them alone does not activate a zone or fix HTTP 530.

13 mocked unit tests passed on Node v20.20.1 in an isolated reproduction. This is not a repository build, Node 22 or Workers runtime verification.

Test command: `node --test tests/domain-zone-activation-check.test.mjs`.

Before runtime integration: authenticate the caller and authorize site owner/admin; load the domain from the authorized database scope; read zone and fresh DNS server-side; require explicit activation confirmation; create an internal-only Durable Object binding with reviewed migrations and export DomainActivationLease from the Worker entry; use createActivationLeaseStore with that binding. Never substitute an in-memory lease or trust client-supplied zone/DNS evidence. Never expose tokens to the browser.

A successful request only means Cloudflare accepted an activation check. Read the zone again and separately verify routing and HTTPS. Unknown outcomes retain the one-hour lease to avoid immediate duplicate requests. Requests made by other services or dashboards are outside this lease's control.

This commit does not change production DNS, database state, registrar delegation or DNSSEC. Production deployment and runtime integration require separate approval and verification.
