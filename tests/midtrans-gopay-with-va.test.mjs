import test from 'node:test';
import assert from 'node:assert/strict';
import { withGoPayMethods } from '../server/midtrans-catalog-api.mjs';
for (const plan of ['pro_monthly','pro_yearly','max_monthly','max_yearly']) {
  test(`${plan}: include GoPay and retain banks, original methods, order and amount`, () => {
    const original = { transaction_details: { order_id: `test-${plan}`, gross_amount: 300000 }, item_details: [{ id: plan }], enabled_payments: ['bni_va', 'credit_card'] };
    const before = JSON.stringify(original);
    const output = withGoPayMethods(original);
    for (const method of ['gopay','echannel','bca_va','bni_va','bri_va','permata_va','cimb_va','other_va','credit_card']) assert.ok(output.enabled_payments.includes(method));
    assert.equal(JSON.stringify(original), before);
    assert.deepEqual(output.transaction_details, original.transaction_details);
    assert.deepEqual(output.item_details, original.item_details);
    assert.equal(new Set(output.enabled_payments).size, output.enabled_payments.length);
  });
}
test('absent method list still requests GoPay with banks', () => {
  assert.ok(withGoPayMethods({}).enabled_payments.includes('gopay'));
});
