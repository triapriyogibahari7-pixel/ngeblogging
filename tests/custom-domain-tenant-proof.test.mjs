import test from 'node:test';import assert from 'node:assert/strict';import {webcrypto} from 'node:crypto';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
import {customDomainTenantProofResponse as handler,verifyCustomDomainTenantProof as probe} from '../server/custom-domain-tenant-proof.mjs';
const domain='00000000-0000-0000-0000-000000000001',site='00000000-0000-0000-0000-000000000002';
const env={CUSTOM_DOMAIN_PROOF_ENABLED:'true',CUSTOM_DOMAIN_PROOF_SECRET:'test-only-not-production-key-123456789',SUPABASE_URL:'https://polvmlrhqoiflumibfqs.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'test-only-db-key'};
const job={hostname:'example.com',domainId:domain,siteId:site};
function database({published=true,deleted=false}={}){return async url=>Response.json(url.includes('/site_domains?')?[{id:domain,site_id:site,hostname:'example.com',provider:'cloudflare-full-zone',status:deleted?'pending_deletion':'verifying'}]:[{id:site,status:'active',is_public:published}]);}
function transport(options={}){const db=database(options);return (url,init)=>handler(new Request(url,init),env,{fetchImpl:db});}
test('signed route proof identifies expected tenant without content claim',async()=>{const r=await probe(job,env,{fetchImpl:transport()});assert.equal(r.verified,true);assert.equal(r.siteId,site);assert.equal(r.siteContentVerified,false);});
test('wrong tenant is rejected',async()=>{const r=await probe({...job,siteId:'00000000-0000-0000-0000-000000000003'},env,{fetchImpl:transport()});assert.equal(r.verified,false);assert.equal(r.reason,'TENANT_PROOF_MISMATCH');});
test('unpublished site is not verified',async()=>{assert.equal((await probe(job,env,{fetchImpl:transport({published:false})})).verified,false);});
test('deleted domain is not verified',async()=>{assert.equal((await probe(job,env,{fetchImpl:transport({deleted:true})})).verified,false);});
test('unsigned request does not query database',async()=>{let calls=0;const r=await handler(new Request('https://example.com/.well-known/ngeblogging-domain-proof'),env,{fetchImpl:async()=>{calls++;}});assert.equal(r.status,403);assert.equal(calls,0);});
test('HTTP 530 cannot become success',async()=>{assert.equal((await probe(job,env,{fetchImpl:async()=>new Response('error',{status:530})})).verified,false);});
test('redirect cannot become success',async()=>{assert.equal((await probe(job,env,{fetchImpl:async()=>new Response(null,{status:302})})).verified,false);});
test('database credential never leaves public probe',async()=>{let seen;await probe(job,env,{fetchImpl:async(url,init)=>{seen=init;return transport()(url,init);}});assert.equal(seen.headers.authorization,undefined);assert.equal(seen.headers.apikey,undefined);assert.equal(JSON.stringify(seen).includes(env.SUPABASE_SERVICE_ROLE_KEY),false);});
