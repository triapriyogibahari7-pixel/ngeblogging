# Pending-zone activation recheck

Ten new files plus two existing integration edits: production wrapper intercepts /api/domains/activation-recheck; the existing DNS menu embeds DomainActivationRecheck. Existing reconcile/audit routes and scheduler are preserved. No automatic provider mutation on GET, card mount or deployment.

This fixes a software-path gap: old recovery required recursive NS evidence before offering recheck and returned advice only. The new explicit POST can ask Cloudflare to recheck a correctly bound pending full zone even if recursive DNS is failing. It does not bypass DNS readiness for activation, change delegation/DNSSEC, or certify HTTP 530 recovery. Active zones are directed to routing/HTTPS audit instead.

Default off: CUSTOM_DOMAIN_ACTIVATION_RECHECK_ENABLED must explicitly equal true. A separately reviewed/applied SQL migration, valid Supabase user session, owner/admin permission, project publishable key and provider credentials/zone-read and activation-check permissions are required. No secrets or flag changes are performed by committing these files. Missing migration/config/permissions fail closed.

Cooldown is a persisted claim, not proof of a sent request: one per zone per hour and six globally per minute. Claims remain consumed on uncertain outcomes. Database authorization derives auth.uid; the API checks provider identity and re-reads authorization/snapshot before mutation. Provider calls cannot share a transaction with ownership updates: concurrency/legacy-writer review remains a production gate. Do not retry unknown outcomes blindly.

Ten mocked policy/handler tests passed locally. Actual auth/RLS, SQL parsing/execution/concurrency, UI/build, native Workers and live provider acceptance are not tested. The new PR workflow executes mocked tests only. Review these gates before applying migration, enabling the flag or production activation. Existing SERVFAIL still requires registrar/delegation/DS/DNSKEY diagnosis.
