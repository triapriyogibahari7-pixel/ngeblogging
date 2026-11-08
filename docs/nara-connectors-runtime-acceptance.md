# Nara connector runtime upgrade: acceptance and release hold

Branch: feature/nara-connectors-runtime-20261108.

This patch improves existing metadata collection, not the capability of provider adapters. It selects up to five enabled/connected connections, gives distinct providers priority over duplicates, reads in batches of at most two, and keeps the shared eight-second collection budget within the inference deadline. Slow providers may remain unread; results must not be described as complete when failures, omissions or time-budget skips exist.

## Reproducible local tests

Run from the repository root:

```sh
node --experimental-vm-modules --test tests/nara-connectors-runtime.test.mjs
```

The tests load actual collector and owner-inference source. RPC, credential decryption, normalization, authorization policy, provider adapters and AI calls are synthetic. Passing them is not proof of live credentials, provider permissions, real vision, browser execution, billing controls or full repository CI.

## Required before production release

- Test each configured provider with the owner's stored credentials without exposing token values.
- Verify exact configured targets, actual capabilities and fresh result timestamps.
- Compare provider results with evidence consumed by both Max/xhigh and Vision inference passes.
- Test actual session isolation, disconnect/revision changes, rate limits and latency.
- Preserve Pro eligibility and quotas; do not silently activate paid provider plans.
- Complete cost controls or obtain specific approval for any potentially chargeable live test/release. The existing project does not yet certify zero spending.
- Resolve CI failures and run a real build. Do not bypass repository protections.

No provider is certified here to read SQL rows, repository files or render browsers. Browser session metadata must retain renderingVerified=false. UI logos and richer adapters require separate implementation and testing. No automatic merge or production deployment is authorized by this document.
