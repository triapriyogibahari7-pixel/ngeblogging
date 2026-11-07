# Read-only domain DNS diagnostics

Targets: triapriyoginotes.my.id and www.triapriyoginotes.my.id. Proposed branded names: ns1.ngeblogging.com and ns2.ngeblogging.com. This package does not provision authoritative servers, change DNS/registrar settings, deploy the application, complete queue/runtime integration or certify HTTP 530 recovery.

From this directory with Node.js 22+: run node --test tests/dns-plan.test.mjs; node scripts/diagnose-domain.mjs; bash scripts/trace-delegation.sh; node scripts/make-dns-plan.mjs. dig must be installed for delegation tracing. The DoH script sends 36 bounded queries to two fixed resolvers, four concurrently. It compares normal validation with checking-disabled answers, but labels differences as suspicion, not a final DNSSEC diagnosis.

The config contains empty provider-assigned addresses and CNAME targets intentionally. Never substitute guessed IPs or point a nameserver owner at a CNAME. Cloudflare vanity provisioning and account entitlements must be verified separately. A/AAAA and any required glue must match the actual provider assignment. The plan remains deployable:false because locally supplied values do not prove provisioning or delegation.

connect.ngeblogging.com and verify.ngeblogging.com are naming drafts only. A shared verification CNAME is not ownership proof. A CNAME to workers.dev does not automatically create a Worker Custom Domain binding. Nameserver branding alone does not repair failed delegation or DNSSEC. Do not change registrar delegation before authoritative DNS is actually available.

Ten offline mocked tests passed when the package was prepared. The workflow separately runs these tests; on matching pushes to main or manual dispatch it gathers public DNS observations and uploads artifacts. A successful diagnostics job means the script completed, not that the domain is healthy. No provider secrets or mutation APIs are used. Trace failures may reflect runner network restrictions. Inspect all evidence before changing DS, DNSKEY, delegation, bindings or HTTPS.

References: https://developers.cloudflare.com/dns/nameservers/custom-nameservers/ and https://developers.cloudflare.com/dns/nameservers/custom-nameservers/nameserver-sets/ .
