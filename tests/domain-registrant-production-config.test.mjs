import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {domainRegistrantResponse} from '../server/domain-registration-runtime.mjs';
const endpoint='https://ngeblogging.com/api/commerce/domains/registrant';
const request=()=>new Request(endpoint,{headers:{authorization:'Bearer test-token'}});
const forbidden=()=>assert.fail('No network or purchase action expected');
for(const file of ['wrangler.jsonc','wrangler.production.jsonc']){
 const config=JSON.parse(await readFile(new URL('../'+file,import.meta.url),'utf8'));
 test(file+': production gate and registrant terms are explicit without enabling payment or registration flags',()=>{assert.equal(config.vars.DOMAIN_CUSTOMER_PRODUCTION_ENABLED,'true');assert.equal(config.vars.DOMAIN_ORDER_ENV,'production');assert.equal(config.vars.DOMAIN_REGISTRATION_TERMS_VERSION,'cloudflare-domain-registration-2026-08-20');assert.notEqual(config.vars.DOMAIN_PAYMENT_PRODUCTION_ENABLED,'true');assert.notEqual(config.vars.DOMAIN_REGISTRATION_PRODUCTION_ENABLED,'true');});
 test(file+': preview remains unable to serve production registrant policy',async()=>{const response=await domainRegistrantResponse(request(),{...config.vars,...config.previews.vars},{fetchImpl:forbidden});assert.equal(response.status,503);assert.equal((await response.json()).code,'DOMAIN_REGISTRANT_DISABLED');});
 test(file+': missing secrets fail closed after the customer gate is enabled',async()=>{const response=await domainRegistrantResponse(request(),config.vars,{fetchImpl:forbidden});assert.equal(response.status,503);assert.equal((await response.json()).code,'REGISTRANT_CONFIGURATION_UNAVAILABLE');});
 test(file+': configured policy verifies the user without order, payment, or registration writes',async()=>{const calls=[];const env={...config.vars,SUPABASE_SERVICE_ROLE_KEY:'mock-service-role-key',CLOUDFLARE_REGISTRAR_API_TOKEN:'mock-registrar-token'};const response=await domainRegistrantResponse(request(),env,{fetchImpl:async(url,init)=>{calls.push([url,init.method]);assert.equal(url,config.vars.SUPABASE_URL+'/auth/v1/user');assert.equal(init.method,'GET');return Response.json({id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',email:'owner@example.com',user_metadata:{name:'Test Owner'}});}});const data=await response.json();assert.equal(response.status,200);assert.equal(data.code,'DOMAIN_REGISTRANT_POLICY');assert.equal(data.registrationStarted,false);assert.equal(data.termsVersion,config.vars.DOMAIN_REGISTRATION_TERMS_VERSION);assert.equal(data.prefill.email,'owner@example.com');assert.equal(calls.length,1);});
}
