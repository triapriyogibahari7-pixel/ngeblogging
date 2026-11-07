# Release gates

This commit contains the signed tenant-domain proof module and offline tests only. It is not the complete synchronization implementation.

The module is not imported into a production route by this commit. CUSTOM_DOMAIN_PROOF_ENABLED and the dedicated proof secret are not configured or enabled. No database migration, provider mutation or production deployment is performed.

Remaining source transfers and integration include persistent queue migrations, scheduler, provider processor, atomic domain-state application, authorized retry, UI wiring, configuration and end-to-end tests. Earlier generated archives are candidates, not a production-certified release.

Proof means the registered hostname maps to the expected stored tenant through the runtime. It does not verify rendered article content. Tests use mocked database responses, not live DNS/TLS or native Workers.

Do not merge or activate the feature until SQL/RLS/concurrency tests, legacy writer integration, native Worker/gateway tests and real-domain acceptance pass. No guarantee of resolving SERVFAIL/HTTP 530 or arbitrary domain capacity is made.
