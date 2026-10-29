import test from 'node:test';
import assert from 'node:assert/strict';
import { recoverSnapToken } from '../src/midtrans-token-recovery.mjs';
const orderId = 'NARA-' + 'a'.repeat(40);
const token = '12345678-1234-4234-8234-123456789abc';
function store() { const map = new Map(); return { getItem:key=>map.get(key), setItem:(key,value)=>map.set(key,value) }; }
test('recovers the same order token without creating a new order', () => {
  const storage = store();
  assert.equal(recoverSnapToken({token,orderId,environment:'production',storage}),token);
  assert.equal(recoverSnapToken({orderId,environment:'production',storage}),token);
  assert.equal(recoverSnapToken({orderId:'NARA-'+'b'.repeat(40),environment:'production',storage}),null);
  assert.equal(recoverSnapToken({orderId,environment:'sandbox',storage}),null);
});
test('tokenless legacy orders and invalid input do not invent tokens', () => {
  assert.equal(recoverSnapToken({orderId,environment:'production',storage:store()}),null);
  assert.equal(recoverSnapToken({token:'bad',orderId,environment:'production',storage:store()}),null);
  assert.equal(recoverSnapToken({token,orderId:'invalid',environment:'production'}),null);
});
test('storage failures do not lose a newly issued token', () => {
  const storage={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};
  assert.equal(recoverSnapToken({token,orderId,environment:'production',storage}),token);
  assert.equal(recoverSnapToken({orderId,environment:'production',storage}),null);
});
