import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {domainConnectionPaymentInstallationResponse} from '../server/domain-connection-payment-installation.mjs';

const files=['wrangler.jsonc','wrangler.production.jsonc'];
for(const file of files){
 test(file+' retains SaaS routing with staged disabled connection bindings',async()=>{
  const config=JSON.parse(await readFile(new URL('../'+file,import.meta.url),'utf8'));
  assert.equal(config.name,'ngeblogging');
  assert.equal(config.keep_vars,true);
  const route=config.routes.filter(value=>value.pattern==='*/*');
  assert.equal(route.length,1);
  assert.equal(route[0].zone_name,'ngeblogging.com');
  assert.notEqual(route[0].custom_domain,true);
  for(const hostname of ['ngeblogging.com','www.ngeblogging.com'])assert.ok(config.routes.some(value=>value.pattern===hostname&&value.custom_domain===true));
  assert.ok(config.routes.some(value=>value.pattern==='*.ngeblogging.com/*'&&value.zone_name==='ngeblogging.com'));
  assert.equal(config.vars.CLOUDFLARE_ACCOUNT_ID,'095e57b46e7ba7f6b188480d9e4e5fe7');
  assert.equal(config.vars.CLOUDFLARE_ZONE_ID,'7658e226c2f165a24f3bbb1cf31db238');
  assert.equal(config.vars.CLOUDFLARE_CUSTOM_HOSTNAME_TARGET,'connect.ngeblogging.com');
  assert.equal(config.vars.CLOUDFLARE_SAAS_APEX_MODE,'cname-flattening');
  for(const name of ['CUSTOM_DOMAIN_BYOD_ENABLED','CUSTOM_DOMAIN_BYOD_SAAS_READY','DOMAIN_CONNECTION_INSTALLER_ENABLED','DOMAIN_CONNECTION_PROOF_ENABLED'])assert.equal(config.vars[name],'false');
  for(const name of ['DOMAIN_CONNECTION_PROOF_SECRET','CUSTOM_DOMAIN_PROOF_SECRET'])assert.equal(Object.hasOwn(config.vars,name),false);
  assert.equal(config.vars.CLOUDFLARE_SAAS_ENABLED,'false');
  assert.equal(config.vars.CLOUDFLARE_CUSTOM_HOSTNAMES_READY,'false');
  assert.equal(config.vars.CUSTOM_DOMAIN_PROVIDER,file==='wrangler.jsonc'?'cloudflare-worker-custom-domain-v172':'cloudflare-full-zone');
  if(file==='wrangler.production.jsonc')assert.equal(config.main,'./cloudflare/domain-recovery-worker-v2.mjs');
 });
}

test('checkout remains blocked without a provider or payment network call',async t=>{
 const fetch=t.mock.method(globalThis,'fetch',()=>{throw Error('NETWORK_CALL_FORBIDDEN');});
 const response=domainConnectionPaymentInstallationResponse(new Request('https://ngeblogging.com/api/domains/connection-checkout',{method:'POST'}),{});
 assert.equal(response.status,503);
 const payload=await response.json();
 assert.equal(payload.code,'DOMAIN_CONNECTION_FULFILLMENT_NOT_READY');
 assert.equal(payload.checkoutReady,false);
 assert.equal(payload.charged,false);
 assert.equal(payload.newAttemptAllowed,false);
 assert.equal(fetch.mock.callCount(),0);
});
