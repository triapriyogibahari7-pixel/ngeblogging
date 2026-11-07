# Migration adapter foundation — not production ready

This patch adds a server-only Cloudflare Custom Hostnames client, a dependency-injected authenticated POST /api/domains/migrations router, and an unapplied SQL schema for persistent locks, journal and per-provider-operation checkpoints. No production Worker wiring, migration execution or SQL application is performed.

The Cloudflare client is NOT the complete provider adapter required by createSaasMigrationExecutor. Source inventory, exact ownership checks on creation/adoption, durable idempotency, DNS/TLS/site-routing proofs, traffic switching and verified rollback still need implementation. beforeWrite must atomically reserve a unique operation under a held fence and reject retries with unsettled outcomes; afterWrite must persist the result. Never store tokens in intents. No automatic timeout/retry may release a lock after an uncertain write.

The schema alone does NOT implement journal.acquire/assertHeld/write/release or records.commit/rollback. Those require transactional server-side RPCs with complete snapshot comparison, current authorization and fencing, plus maintenance enforcement in all existing domain writers. No lock expiration is provided intentionally. SQL must be reviewed against the actual schema before application.

The router must receive a real server authenticator and a per-request executor with reauthorization of site owner/admin plus operational maintenance ownership. It rejects caller-provided actorId. It is not imported by the production Worker. All executor mutation flags must remain false until adapters, maintenance integration, bounded network reads and tests are complete.

No tests or build have been executed for this patch. No domain migration, DNS changes, deployment, SQL application or production verification is claimed.
