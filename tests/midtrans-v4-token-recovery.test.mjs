import test from 'node:test';
import assert from 'node:assert/strict';
import { recoverStoredCheckoutToken as recover } from '../server/midtrans-catalog-api.mjs';
const token = '00000000-0000-4000-8000-000000000001';
test('recover official v4 and legacy v2 tokens in matching environment', () => {
  for (const environment of ['production', 'sandbox']) {
    const origin = environment === 'production' ? 'https://app.midtrans.com' : 'https://app.sandbox.midtrans.com';
    for (const route of ['v4/redirection', 'v2/vtweb']) assert.equal(recover(`${origin}/snap/${route}/${token}`, environment), token);
  }
});
test('reject untrusted URL variants and invalid environments', () => {
  const path = `/snap/v4/redirection/${token}`;
  for (const url of [`http://app.midtrans.com${path}`, `https://app.midtrans.com.evil.example${path}`, `https://user@app.midtrans.com${path}`, `https://app.sandbox.midtrans.com${path}`, `https://app.midtrans.com${path}#fragment`, 'https://app.midtrans.com/snap/v4/redirection/invalid']) assert.equal(recover(url, 'production'), null);
  assert.equal(recover(`https://app.midtrans.com${path}`, 'invalid'), null);
});
