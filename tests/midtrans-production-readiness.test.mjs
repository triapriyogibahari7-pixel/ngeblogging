import test from 'node:test';
import assert from 'node:assert/strict';
import { validateProductionReadiness } from '../scripts/verify-midtrans-deployment.mjs';

test('accepts explicitly ready production configuration', () => {
  assert.doesNotThrow(() => validateProductionReadiness({ environment: 'production', ready: true }));
});
test('rejects absent or non-boolean readiness in production', () => {
  for (const ready of [false, undefined, null, 'true', 1]) {
    assert.throws(() => validateProductionReadiness({ environment: 'production', ready }), /MIDTRANS_NOT_READY/);
  }
});
test('rejects sandbox and unknown environments even when ready', () => {
  for (const environment of ['sandbox', undefined, null, 'Production']) {
    assert.throws(() => validateProductionReadiness({ environment, ready: true }), /MIDTRANS_NOT_PRODUCTION/);
  }
});
test('rejects missing response', () => {
  assert.throws(() => validateProductionReadiness(undefined), /MIDTRANS_NOT_PRODUCTION/);
});
