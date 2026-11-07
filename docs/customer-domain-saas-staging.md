# Customer SaaS staging — partial implementation, not ready for production activation

The source Worker wrapper dispatches the guarded customer SaaS gateway before legacy routes and applies the common domain response view. The existing management scheduler and paid/full-zone route remain separate. This describes the branch, not a live deployment.

DomainConnectEntry now sends new customer connections to /api/domains/connect-existing, checks public configuration capabilities, exposes explicit subdomain/apex selection and displays returned DNS/validation records. It does not silently remove www or rewrite apex to a subdomain. Apex remains unavailable without server capability. The form rejects fallback to full-zone. Production entry already imports this component; the purchase form is not changed by this patch.

The same component can read the existing authenticated site-domain list and display a NON-EXECUTABLE migration preflight model. This is NOT an implementation of moving old domains to SaaS. canExecute is always false; there is no provider/database cutover, certificate provisioning, DNS modification, legacy detach or rollback executor. The named domains in tests are fixtures, not audited live records. Refresh still follows the stored provider.

Actual migration still needs authoritative provider/DNS inventory, apex capability confirmation, persisted per-hostname staging, certificate validation, concurrency-safe atomic identity/primary/alias preservation, cutover and tested rollback. Legacy optional custom_metadata handling also remains to be reviewed. Do not mark migration complete or merge/activate as an end-to-end solution.

BYOD uses CUSTOM_DOMAIN_BYOD_ENABLED and CUSTOM_DOMAIN_BYOD_SAAS_READY, default disabled. No flags, secrets, DNS/delegation/DS records, production database records or provider resources are changed by committing these files.

Ten migration-preflight model tests passed on Node v20.20.1. JSX parsers/build dependencies were unavailable locally, so this form has NOT passed JSX compilation, browser tests or a full repository build. Earlier contract/router/view/wiring tests were local mocks/unit tests, not Node 22.12.0 acceptance, native Workers/GitHub CI or live DNS/HTTPS/content verification. Re-run the entire integration/build before any release.
