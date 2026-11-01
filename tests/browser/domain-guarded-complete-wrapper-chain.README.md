# Guarded eight-wrapper integration replay

Checkpoint: 2026-10-31 Asia/Jakarta. Stage 4 and stage 5 remain OPEN.

The adjacent HTML preserves the exact bootstrap payload executed through Cloudflare Browser Rendering after the canonical patch. Saving it is not another execution and adds no passing tests. It fetches the original baseline harness at e76cbcb1100dfb75544e3c266a969ca4288079f3 and adds the executed guarded scenarios in memory. The baseline application modules remain pinned by that harness to 034b492862ef8655e1304cbe2cfeeea526616e4b. The candidate is pinned to e76cbcb1100dfb75544e3c266a969ca4288079f3. No application module is edited by the replay.

## Observed result

The post-patch execution passed 11 baseline scenarios and 17 guarded integration scenarios, with zero failures (28 within that execution). Do not add the earlier 21-case standalone composition result, native Worker tests or historical executions to that count. The original ten guarded integration checks had previously produced 9 passes and one public canonical failure with candidate 01133979ece12491c0a9ac7cbcf07d0e355ad7a6. The post-patch run retained the expected 308 redirect and added seven canonical/HEAD/negative cases.

Candidate Git blob: 54c341a2ed8c05c3b28e60e4b2bf888040bbaa59. Boundary Git blob: 7b1b673cf2ff6ffee8b29b755a3f819ee94efce1. Both are asserted before import; the baseline additionally verifies fourteen module blobs. Source loading contacts public GitHub. Scenario metadata, backend responses, feature dependencies and ASSETS remain fixtures.

## Replay

Run the HTML as page content in an approved isolated Chromium browser supporting ES modules and blob imports. Wait up to 60000 ms for #result[data-done="true"]. Require passed=true, passedCount=28, failedCount=0, guardedIntegration.passedCount=17, guardedIntegration.failedCount=0, all expected source pins/blobs, productionConnection=false and activeHandlerChanged=false. Completion, HTTP 200 from the rendering service, import failure or timeout alone is not success. Retain the complete returned JSON.

The executed payload retains runnerPersisted:false as a historical field. This file addition supersedes that persistence limitation only; the literal is intentionally not rewritten to claim different execution inputs. No replay of the repository-saved artifact is claimed by this checkpoint.

## Boundaries

The canonical adapter is an explicitly injected test adapter: it invokes the pinned original canonical module, resolves the target against injected anonymous metadata, and supplies cooperative target identity. It is not wired into any active Worker. The renderer also supplies cooperative identity; neither check attests to HTML ownership or a consistent database snapshot. This is browser execution of eight wrapper modules, not native workerd/HTMLRewriter, built Studio, real Auth/PostgREST/RLS or full schema acceptance. It measures no live edge cache, invalidation, DNS, TLS or provider propagation.

No merge, production activation, SQL migration/grant, environment flag change, provider/DNS mutation, cache purge or stage 6 start is authorized. Release remains held until stage 10 completion, verification and separate owner release approval.
