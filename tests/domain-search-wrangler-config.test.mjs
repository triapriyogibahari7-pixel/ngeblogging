import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
for(const path of ['wrangler.jsonc','wrangler.production.jsonc']){
 test(path+' explicitly configures bounded customer search without enabling purchase',()=>{
  const config=JSON.parse(readFileSync(new URL('../'+path,import.meta.url),'utf8'));
  assert.equal(config.vars.DOMAIN_CUSTOMER_SEARCH_ENABLED,'true');
  assert.equal(config.vars.DOMAIN_CUSTOMER_SEARCH_HTTP_BUDGET,'51');
  assert.equal(config.vars.DOMAIN_CUSTOMER_REGISTRAR_PROVIDER,'cloudflare');
  assert.equal(config.vars.DOMAIN_CUSTOMER_CLOUDFLARE_QUOTE_ENABLED,'true');
  assert.equal(config.previews.vars.DOMAIN_CUSTOMER_SEARCH_ENABLED,'false');
  assert.equal(config.previews.vars.DOMAIN_CUSTOMER_CLOUDFLARE_QUOTE_ENABLED,'false');
  assert.equal(Object.hasOwn(config.vars,'CLOUDFLARE_REGISTRAR_API_TOKEN'),false);
  assert.equal(Object.hasOwn(config.vars,'DOMAIN_CUSTOMER_REGISTRATION_PRICING_SNAPSHOT'),false);
  assert.equal(Object.hasOwn(config.vars,'CLOUDFLARE_REGISTRAR_QUOTES_TAX_INCLUDED'),false);
  assert.equal(Object.hasOwn(config.vars,'CLOUDFLARE_REGISTRAR_QUOTE_EXTENSIONS_JSON'),false);
  assert.equal(Object.hasOwn(config.vars,'DOMAIN_CUSTOMER_PRODUCTION_ENABLED'),false);
  assert.equal(config.keep_vars,true);
  assert.equal(config.main,'./cloudflare/worker-v70.mjs');
  assert.equal(config.name,'ngeblogging');
  assert.deepEqual(config.routes,[{pattern:'ngeblogging.com',custom_domain:true},{pattern:'www.ngeblogging.com',custom_domain:true},{pattern:'*.ngeblogging.com/*',zone_name:'ngeblogging.com'}]);
 });
}
