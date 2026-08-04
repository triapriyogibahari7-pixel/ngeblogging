# Ngeblogging v272 production trigger

- Date: 2026-08-04
- Source branch: `main`
- Source head before trigger: `b85d1e4c517915941ae885a24bdc1ff80029aa94`
- Target: Cloudflare Worker `ngeblogging`
- Public domain: `https://ngeblogging.com`

## Reason

The v272 source commits reached `main`, but neither the Cloudflare production workflow nor the connected hosting deployment emitted a run or commit status. This manifest is intentionally merged through a pull request to produce an observable merge/push event without changing application behavior.

## Required live evidence

Deployment is complete only when all of these are true:

- the public HTML references a new fingerprinted application bundle;
- `release-v272.json` is served as JSON rather than the SPA fallback;
- the live bundle contains `studio-shell-authority-v272`;
- the service worker contains `studio-shell-cache-v272`, `UI_PATCH_RELEASE_V272`, and `UI_CACHE_RELEASE_V272`;
- the production workflow reports a terminal status for the merge commit.
