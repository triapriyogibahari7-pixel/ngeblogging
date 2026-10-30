// Isolated candidate only. No active-handler or Worker wiring.
import {createTestRedirectPipeline} from './domain-transfer-redirect-pipeline.mjs';
export function createFreshOnlyTestResolver({enabled = false, environment, ...options} = {}) {
  if (enabled !== true || environment !== 'isolated-test') throw new TypeError('ISOLATED_REDIRECT_TEST_REQUIRED');
  const {resolve} = createTestRedirectPipeline(options);
  return request => resolve(request, {fresh: true});
}
