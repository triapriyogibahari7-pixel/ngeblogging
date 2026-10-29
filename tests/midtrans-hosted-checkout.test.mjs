import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { hostedCheckoutUrl } from '../src/midtrans-hosted-checkout.mjs';
const token='11111111-1111-4111-8111-111111111111';
for (const environment of ['production','sandbox']) for (const path of ['v2/vtweb','v4/redirection']) test(`${environment} accepts ${path}`,()=>{
  const origin=environment==='production'?'https://app.midtrans.com':'https://app.sandbox.midtrans.com';
  const url=`${origin}/snap/${path}/${token}`;
  assert.equal(hostedCheckoutUrl(url,environment),url);
});
test('rejects cross-environment and external destinations',()=>{
  for(const url of [`https://app.sandbox.midtrans.com/snap/v4/redirection/${token}`,`https://app.midtrans.com.evil.example/snap/v4/redirection/${token}`,`https://evil.example/snap/v4/redirection/${token}`,`http://app.midtrans.com/snap/v4/redirection/${token}`]) assert.equal(hostedCheckoutUrl(url,'production'),null);
});
test('rejects credentials, fragments, query and arbitrary paths',()=>{
  const good=`https://app.midtrans.com/snap/v4/redirection/${token}`;
  for(const url of [good+'?redirect=evil',good+'#evil',good.replace('https://','https://user:pass@'),good.replace('/snap/v4/redirection/','/arbitrary/'),'javascript:alert(1)',null]) assert.equal(hostedCheckoutUrl(url,'production'),null);
  assert.equal(hostedCheckoutUrl(good,'invalid'),null);
});
test('component removes iframe and SDK rather than forcing CSS visibility',()=>{
  const source=readFileSync(new URL('../src/PremiumCheckout.jsx',import.meta.url),'utf8');
  assert.doesNotMatch(source,/snap\.embed|snap\.pay|<iframe|snap\/snap\.js|loadSnap|fetch\(/);
  assert.match(source,/href=\{target\}/);assert.match(source,/await onRefresh\?\.\(\)/);
  assert.match(source,/Ketersediaan GoPay Later belum diverifikasi/);
});
