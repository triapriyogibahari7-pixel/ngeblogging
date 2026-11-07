import {webcrypto} from 'node:crypto';
import assert from 'node:assert/strict';
import test from 'node:test';
import {migrationRouteProofResponse,verifyMigrationTarget} from '../server/customer-domain-migration-live-proof.mjs';
import {proofMac} from '../server/custom-domain-tenant-proof.mjs';
if(!globalThis.crypto)Object.defineProperty(globalThis,'crypto',{value:webcrypto});
const siteId='11111111-1111-4111-8111-111111111111',migrationId='22222222-2222-4222-8222-222222222222',providerId='33333333-3333-4333-8333-333333333333',now=1794027600000,h='customer.example',secret='test-only-secret-'.repeat(4),path='/.well-known/ngeblogging-migration-proof';
const env={MIGRATION_ROUTE_PROOF_ENABLED:'true',MIGRATION_ROUTE_PROOF_SECRET:secret};
async function request({meta=true,stale=false,badMac=false}={}){const scope=['saas-route-v1',h,siteId,migrationId,providerId,'a'.repeat(64),now-(stale?31000:0)];const r=new Request('https://'+h+path,{headers:{'x-migration-scope':JSON.stringify(scope),'x-migration-mac':badMac?'b'.repeat(64):await proofMac(secret,['request',...scope])}});if(meta)Object.defineProperty(r,'cf',{value:{hostMetadata:{site_id:siteId,migration_id:migrationId,provider_id:providerId}}});return r;}
test('valid signed route with native metadata',async()=>assert.equal((await migrationRouteProofResponse(await request(),env,{clock:()=>now})).status,200));
test('missing native metadata is rejected',async()=>assert.equal((await migrationRouteProofResponse(await request({meta:false}),env,{clock:()=>now})).status,409));
test('stale signed request is rejected',async()=>assert.equal((await migrationRouteProofResponse(await request({stale:true}),env,{clock:()=>now})).status,403));
test('forged signature is rejected',async()=>assert.equal((await migrationRouteProofResponse(await request({badMac:true}),env,{clock:()=>now})).status,403));
test('feature remains off by default',async()=>assert.equal((await migrationRouteProofResponse(await request(),{})).status,404));
test('unrelated route falls through',async()=>assert.equal(await migrationRouteProofResponse(new Request('https://'+h+'/'),env),null));
const identity={siteId,migrationId},target={siteId,migrationId,hostnames:[{hostname:h,id:providerId,status:'active',sslStatus:'active'}]};
const html='<html><body>trusted customer site</body></html>';
const digest=Buffer.from(await webcrypto.subtle.digest('SHA-256',new TextEncoder().encode(html))).toString('hex');
function setup(mode){return {identity,target,secret,clock:()=>now,contentPins:{[h]:{siteId,path:'/stable-page',sha256:digest}},inspectAuthoritativeDns:async()=>({hostname:h,siteId,migrationId,authoritativeVerified:mode!=='dns',checkedAt:now}),fetchImpl:async(url,options)=>{const u=new URL(url);if(['cloudflare-dns.com','dns.google'].includes(u.hostname))return Response.json({Status:0,Answer:[{type:1,data:'192.0.2.1'}]});if(u.pathname===path){if(mode==='old-route')return new Response('{}',{status:200});const r=new Request(url,options);Object.defineProperty(r,'cf',{value:{hostMetadata:{site_id:siteId,migration_id:migrationId,provider_id:providerId}}});return migrationRouteProofResponse(r,env,{clock:()=>now});}return new Response(mode==='wrong-content'?'wrong':html,{headers:{'content-type':'text/html'}});}};}
test('complete simulated proof accepted',async()=>{const p=await verifyMigrationTarget(setup());assert.equal(p.hostnames[0].siteContentVerified,true);});
test('HTTP 200 on old route is not proof',async()=>assert.rejects(()=>verifyMigrationTarget(setup('old-route')),{code:'SAAS_ROUTE_PROOF_MISMATCH'}));
test('wrong rendered content rejected',async()=>assert.rejects(()=>verifyMigrationTarget(setup('wrong-content')),{code:'SITE_CONTENT_HASH_MISMATCH'}));
test('missing authoritative evidence rejected',async()=>assert.rejects(()=>verifyMigrationTarget(setup('dns')),{code:'AUTHORITATIVE_DNS_PROOF_REQUIRED'}));
test('wrong target scope rejected',async()=>{const p=setup();p.target={...target,siteId:providerId};await assert.rejects(()=>verifyMigrationTarget(p),{code:'TARGET_SCOPE_MISMATCH'});});
test('missing content pin rejected',async()=>{const p=setup();p.contentPins={};await assert.rejects(()=>verifyMigrationTarget(p),{code:'TRUSTED_SITE_CONTENT_PIN_REQUIRED'});});
