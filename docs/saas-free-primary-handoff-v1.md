# BYOD SaaS atomic primary handoff candidate

Draft only; not applied to production and deliberately outside automatic migrations. Base: 5cd728e1204182e82ab2883d33db6472a609b830.

The legacy saveProviderState PATCH promotes a domain before clearing the free primary. Production metadata confirms the unique partial index site_domains_one_primary_per_site. This trigger clears only the same site's active canonical free subdomain inside the original authenticated UPDATE statement. Existing AFTER synchronization maps the newly active primary; statement failure rolls back the demotion and mapping. It does not assign active status, publish a site, change a hostname/provider, remove the free record, or change purchase/payment code.

SECURITY INVOKER, existing RLS and owner/admin checks apply. Direct execute is revoked. Unknown primary identities, changed domain/provider identity, terminal deletion, and non-active provider/SSL evidence reject the handoff. Existing paid and migration guards are not replaced or disabled. Null-actor administrative/service calls retain existing behavior.

An isolated PGlite 0.3.16 browser run passed 15 cases: baseline unique failure; owner; admin; repeat; viewer; unrelated actor; empty actor; pending SSL; changed provider ID; deletion; paid-guard fixture; forced mapping failure; unexpected primary; draft publication preservation; revoked direct execute. Auth, RLS, mapping and paid guard were fixtures, not production definitions. No production connection was used.

The committed psql regression is a smaller reproducible companion, not a claim that the complete repository CI or full catalog integration passed. Run only on a fresh disposable database named saas_primary_test with an isolated role namespace: psql -X -d saas_primary_test -f tests/sql/saas-free-primary-handoff.sql. The database-name guard aborts before fixture creation elsewhere.

Before production: review actual guard/sync definitions and trigger ordering; run native PostgreSQL full-catalog and concurrent refresh/move tests; obtain separate DDL approval; apply atomically without disabling safeguards; verify legitimate authenticated activation, free URL preservation and correct-site HTTPS. No Live or complete end-to-end claim is made by these SQL tests.
