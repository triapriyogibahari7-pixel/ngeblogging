import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
for(const path of ['wrangler.jsonc','wrangler.production.jsonc'])test(path+' contains platform routes only',async()=>{const config=JSON.parse(await read(path));assert.deepEqual(config.routes,[{pattern:'ngeblogging.com',custom_domain:true},{pattern:'www.ngeblogging.com',custom_domain:true},{pattern:'*.ngeblogging.com/*',zone_name:'ngeblogging.com'}]);});
test('legacy repair workflow is manual and has no attachment script',async()=>{const source=await read('.github/workflows/custom-domain-repair.yml');assert.match(source,/workflow_dispatch:/);assert.doesNotMatch(source,/workflow_run:|push:|repair-custom-domain-v350|CLOUDFLARE_API_TOKEN|TARGET_DOMAIN/);});
test('legacy production deployment no longer attaches a customer domain',async()=>{const source=await read('.github/workflows/deploy-production-v273.yml');assert.doesNotMatch(source,/repair-custom-domain-v350|triapriyogi\.com|TARGET_DOMAIN/);assert.match(source,/wrangler deploy --config wrangler\.production\.jsonc --keep-vars/);});
