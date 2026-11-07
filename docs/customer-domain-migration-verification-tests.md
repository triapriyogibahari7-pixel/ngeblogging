# Verification integration and provider ledger

The Worker source now dispatches migrationRouteProofResponse before other handlers. The endpoint remains off by default and no secret or flag is configured by this commit. Native cf.hostMetadata is required; the tests simulate it, not Cloudflare runtime provenance.

Twelve unit tests passed on Node v20.20.1 against an isolated copy of the stored live-proof module and the extracted real proofMac/key helper. Initial harness startup failed because crypto was read-only; the harness was corrected, without changing the implementation, then all twelve passed. The repository test imports the full real helper module; full-repository tests, native Worker execution, deployment, DNS/TLS/network verification and rollback are NOT tested.

The new unapplied provider-checkpoint SQL reserves each operation uniquely under the current persistent lock and current owner/admin authorization. A duplicate reservation is refused even if already settled; ambiguous attempts require reconciliation, not a repeated provider write. Settlement requires the exact stored request, scope and fence. If a provider call or settlement response is lost, preserve the intent and lock. Do not use operationId changes to evade reconciliation. Do not store tokens/secrets/PII in request/result JSON.

The RPC is NOT yet connected to the Cloudflare client's beforeWrite/afterWrite callbacks. The existing main migration RPC's release path still needs a pending-provider-intent check before activation. The SQL itself has not been executed or transaction/concurrency tested.

Authoritative DNS collection, trusted content-pin generation, full source inventory and DNS/Worker/certificate restoration remain missing. Mutation actions stay blocked. Existing transaction SQL is still unapplied and needs hardening/review. This commit is not a complete/production-certified migration service.
