# Ngeblogging Full Zone: isolated foundation

Status: planning contract only, NOT a DNS provider implementation. No production imports, network calls, database writes or zone provisioning. This does not fix the existing endpoint error.

Targets: ns1.ngeblogging.com and ns2.ngeblogging.com. They are not assigned nameservers and must not be shown as customer migration instructions. No availability, ownership or server deployment has been verified.

## Integration gates
1. Authenticated API must verify site permissions and domain ownership/conflicts; a site UUID is not authorization.
2. Implement durable zone/tenant storage, idempotency, operation leases, audit and recovery.
3. Integrate authoritative DNS servers, restricted management credentials, replication and UDP/TCP 53 probes. Verify independent failure domains, registrar delegation and glue where required.
4. Preserve existing DNS/email records through reviewed import; handle DNSSEC/DS transitions explicitly.
5. Implement HTTPS gateway and exact hostname-to-site isolation. Existing Workers Custom Domains must not be assumed compatible with external authoritative DNS.
6. Wire adapter behind a disabled-by-default provider selection in the existing API; retain legacy domain providers. Do not change frontend endpoints merely to rename the provider.
7. Add dispatcher, authorization, retry, tenant-isolation and real sandbox DNS/TLS tests before any production claim.

## Verification
Run: node --test tests/ngeblogging-full-zone-foundation.test.mjs
Tests are added but execution is not claimed. Existing release checks remain unchanged. No secrets, paid resources, nameserver changes or migrations are included.
