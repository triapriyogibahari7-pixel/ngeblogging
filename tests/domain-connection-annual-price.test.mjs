import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DOMAIN_CONNECTION_ANNUAL_PRICE as price} from '../shared/domain-connection-annual-price.mjs';
import {domainConnectionAnnualPriceResponse as route} from '../server/domain-connection-annual-price.mjs';
const url='https://ngeblogging.com/api/domains/';
test('annual bundled price is USD 5.49 in exact minor units',()=>{
 assert.equal(price.amount,'5.49');assert.equal(price.amountMinor,549);
 assert.equal(price.currency,'USD');assert.equal(price.periodMonths,12);
 assert.equal(price.includedHostnameCount,2);assert.equal(price.includesApex,true);
 assert.equal(price.includesWww,true);assert.equal(price.autoRenew,false);assert.equal(Object.isFrozen(price),true);
});
test('public offer is server-owned and explicitly not ready for checkout',async()=>{
 const r=route(new Request(url+'connection-price?amount=0.01'));
 const d=await r.json();assert.equal(r.status,200);assert.deepEqual(d.price,price);
 assert.equal(d.checkoutReady,false);assert.equal(d.domainPurchaseIncluded,false);
 assert.equal(r.headers.get('cache-control'),'no-store');
});
test('checkout fails closed without creating charges or domains',async()=>{
 const r=route(new Request(url+'connection-checkout',{method:'POST',body:JSON.stringify({amount:'0.01',paid:true})}));
 const d=await r.json();assert.equal(r.status,503);assert.equal(d.charged,false);
 assert.equal(d.domainRegistered,false);assert.equal(d.publicSiteVerified,false);assert.deepEqual(d.price,price);
});
test('incorrect methods do not create a checkout',()=>{
 assert.equal(route(new Request(url+'connection-checkout')).status,405);
 assert.equal(route(new Request(url+'connection-price',{method:'POST'})).status,405);
});
test('existing domain and purchase routes are not intercepted',()=>{
 for(const path of ['register','connect-existing','search','checkout'])assert.equal(route(new Request(url+path)),null);
});
test('existing button is wired to annual checkout and is not duplicated',()=>{
 const s=readFileSync(new URL('../src/DomainConnectEntry.jsx',import.meta.url),'utf8');
 assert.equal((s.match(/<button\b/g)||[]).length,1);
 assert.ok(s.includes("fetch('/api/domains/connection-checkout'"));
 assert.equal(s.includes("fetch('/api/domains/register'"),false);
 assert.ok(s.includes('DOMAIN_CONNECTION_ANNUAL_LABEL'));
 assert.ok(s.includes('nd-connect-submit'));
});
test('worker dispatches annual price route before mutating domain handlers',()=>{
 const s=readFileSync(new URL('../cloudflare/domain-recovery-worker-v2.mjs',import.meta.url),'utf8');
 assert.ok(s.includes("import {domainConnectionAnnualPriceResponse}"));
 assert.ok(s.indexOf('const annualConnection=')<s.indexOf('const customerConnection='));
});
test('actual worker returns price and unavailable checkout before legacy routes',async()=>{
 const source=readFileSync(new URL('../cloudflare/domain-recovery-worker-v2.mjs',import.meta.url),'utf8');
 const calls=[];const fixtures={
  worker:{fetch:async()=>{calls.push('base');return new Response('base');}},
  domainRecoveryResponse:async()=>null,DOMAIN_MANAGEMENT_CRON:'test',runDomainManagementSchedule:async()=>({ok:true}),
  isDomainDeadlineRequest:()=>false,withDomainDeadline:async(r,e,c,fn)=>fn(),
  domainReconciliationResponse:async()=>null,domainRuntimeEnvironment:e=>{calls.push('env');return e;},
  domainPendingRecheckResponse:async()=>null,handleDomainRequest:async()=>{throw Error('LEGACY_CALLED');},
  createCustomerDomainRouter:()=>async()=>null,normalizeDomainManagementResponse:(r,s)=>s,
  domainMigrationResponse:async()=>null,migrationRouteProofResponse:async()=>null,
  domainConnectionAnnualPriceResponse:route,
 };
 globalThis.__annualPriceWiring=fixtures;
 try{
  const transformed=source.split('\n').map(line=>{
   if(!line.startsWith('import '))return line;
   const names=line.match(/^import \{([^}]+)\}/)?.[1];
   return names?'const {'+names+'}=globalThis.__annualPriceWiring;':'const worker=globalThis.__annualPriceWiring.worker;';
  }).join('\n');
  const {default:worker}=await import('data:text/javascript;base64,'+Buffer.from(transformed).toString('base64'));
  assert.equal((await worker.fetch(new Request(url+'connection-price'),{},{})).status,200);
  assert.equal((await worker.fetch(new Request(url+'connection-checkout',{method:'POST'}),{},{})).status,503);
  assert.deepEqual(calls,[]);
  assert.equal(await (await worker.fetch(new Request('https://ngeblogging.com/'),{},{})).text(),'base');
 }finally{delete globalThis.__annualPriceWiring;}
});
