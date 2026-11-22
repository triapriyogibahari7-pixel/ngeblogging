import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const flags=['CUSTOM_DOMAIN_BYOD_ENABLED','CUSTOM_DOMAIN_BYOD_SAAS_READY','DOMAIN_CONNECTION_INSTALLER_ENABLED','DOMAIN_CONNECTION_PROOF_ENABLED','DOMAIN_CONNECTION_MIDTRANS_ENABLED','DOMAIN_CONNECTION_PROVISIONING_READY'];
const complete=()=>Object.fromEntries([...flags.map(name=>[name,'true']),['DOMAIN_CONNECTION_PROOF_SECRET','test-only-proof-key-not-a-secret-123456789']]);
async function fixture(){
 const calls=[];
 const deny=()=>{throw Error('LIVE_NETWORK_OR_INSTALLATION_FORBIDDEN');};
 const context=vm.createContext({Request,Response,URL,TextDecoder,AbortSignal,console,fetch:deny});
 const dependencies={
  './domain-connection-annual-price.mjs':{domainConnectionAnnualPriceResponse:(request,env)=>{calls.push({request,env});return new Response('payment-preflight-stub',{status:202});}},
  './domain-connection-install-and-bind.mjs':{installAndBindPaidConnectionPair:deny},
  '../shared/domain-connection-annual-price.mjs':{DOMAIN_CONNECTION_ANNUAL_PRICE:{amountIdr:99000,billingPurpose:'custom-domain-connection'}},
  '../shared/customer-domain-connection.mjs':{customerHost:value=>value},
 };
 const module=new vm.SourceTextModule(readFileSync(new URL('../server/domain-connection-payment-installation.mjs',import.meta.url),'utf8'),{context});
 await module.link(name=>{const values=dependencies[name];assert.ok(values,'Unexpected dependency '+name);return new vm.SyntheticModule(Object.keys(values),function(){for(const [k,v]of Object.entries(values))this.setExport(k,v);},{context});});
 await module.evaluate();return {route:module.namespace.domainConnectionPaymentInstallationResponse,calls};
}
const request=()=>new Request('https://ngeblogging.com/api/domains/connection-checkout',{method:'POST'});
for(const flag of flags)for(const value of [undefined,'false',true])test('checkout stays closed for '+flag+'='+String(value),async()=>{
 const f=await fixture(),env=complete();if(value===undefined)delete env[flag];else env[flag]=value;
 const response=await f.route(request(),env),body=await response.json();
 assert.equal(response.status,503);assert.equal(body.charged,false);assert.equal(body.checkoutReady,false);assert.equal(f.calls.length,0);
});
for(const value of [undefined,'short',' '.repeat(32),'x'.repeat(4097)])test('checkout rejects invalid proof key '+String(value?.length),async()=>{
 const f=await fixture(),env={...complete(),DOMAIN_CONNECTION_PROOF_SECRET:value};
 const response=await f.route(request(),env);assert.equal(response.status,503);assert.equal(f.calls.length,0);
});
test('fully staged checkout reaches existing payment preflight exactly once without installation',async()=>{
 const f=await fixture(),env=Object.freeze(complete()),r=request();
 const response=await f.route(r,env);assert.equal(response.status,202);assert.equal(f.calls.length,1);assert.equal(f.calls[0].request,r);assert.equal(f.calls[0].env,env);
});
for(const suffix of ['search','checkout','register'])test('unrelated '+suffix+' route is delegated unchanged',async()=>{
 const f=await fixture(),r=new Request('https://ngeblogging.com/api/domains/'+suffix,{method:'POST'});
 assert.equal((await f.route(r,{})).status,202);assert.equal(f.calls.length,1);assert.equal(f.calls[0].request,r);
});

async function sitePolicyFixture({slug,customDomain,owner=true}){
 const userId='11111111-1111-4111-8111-111111111111',siteId='22222222-2222-4222-8222-222222222222';
 const site={id:siteId,owner_id:owner?userId:'44444444-4444-4444-8444-444444444444',slug,custom_domain:customDomain};
 const initial=JSON.stringify(site),calls=[];
 const deny=()=>{throw Error('LIVE_NETWORK_OR_MUTATION_FORBIDDEN');};
 const context=vm.createContext({Request,Response,URL,TextDecoder,AbortController,setTimeout,clearTimeout,console,fetch:async(target,init={})=>{
  const u=new URL(target),method=init.method||'GET';calls.push({path:u.pathname,method,select:u.searchParams.get('select')});
  assert.equal(u.origin,'https://polvmlrhqoiflumibfqs.supabase.co');
  if(u.pathname==='/auth/v1/user'&&method==='GET')return Response.json({id:userId});
  if(u.pathname==='/rest/v1/rpc/domain_connection_payment_ready_v2'&&method==='POST')return Response.json({version:'connection-midtrans-v2',amountIdr:99000,periodMonths:12});
  if(u.pathname==='/rest/v1/sites'&&method==='GET')return Response.json([site]);
  if(u.pathname==='/rest/v1/site_members'&&method==='GET')return Response.json([]);
  if(u.pathname==='/rest/v1/domain_connection_entitlements'&&method==='GET')return Response.json([{site_id:siteId,expires_at:new Date(Date.now()+86400000).toISOString(),review_required:false}]);
  return deny();
 }});
 const dependencies={
  '../shared/domain-connection-annual-price.mjs':{DOMAIN_CONNECTION_ANNUAL_PRICE:{amountIdr:99000,billingPurpose:'custom-domain-connection'}},
  '../shared/customer-domain-connection.mjs':{customerHost:v=>v,customerOptions:deny},
  './domain-midtrans-server-key.mjs':{normalizeDomainMidtransServerKey:v=>v},
  './domain-midtrans-payment-methods.mjs':{parseDomainMidtransPaymentMethods:deny},
 };
 const module=new vm.SourceTextModule(readFileSync(new URL('../server/domain-connection-annual-price.mjs',import.meta.url),'utf8'),{context});
 await module.link(name=>{const values=dependencies[name];assert.ok(values,'Unexpected dependency '+name);return new vm.SyntheticModule(Object.keys(values),function(){for(const [k,v]of Object.entries(values))this.setExport(k,v);},{context});});
 await module.evaluate();
 const env={DOMAIN_CONNECTION_MIDTRANS_ENABLED:'true',DOMAIN_CONNECTION_PROVISIONING_READY:'true',SUPABASE_URL:'https://polvmlrhqoiflumibfqs.supabase.co',SUPABASE_PUBLISHABLE_KEY:'unit-public-key',SUPABASE_SERVICE_ROLE_KEY:'unit-service-key',DOMAIN_MIDTRANS_PRODUCTION_SERVER_KEY:'unit-only-key',DOMAIN_MIDTRANS_PRODUCTION_MERCHANT_ID:'unit-merchant',DOMAIN_CONNECTION_MIDTRANS_SIGNATURE_SECRET:'unit-only-signature-key-123456789'};
 const request=new Request('https://ngeblogging.com/api/domains/connection-checkout',{method:'POST',headers:{origin:'https://ngeblogging.com','content-type':'application/json',authorization:'Bearer unit-session'},body:JSON.stringify({hostname:'customer.example',siteId,idempotencyKey:'33333333-3333-4333-8333-333333333333',returnPath:'/studio'})});
 const response=await module.namespace.domainConnectionAnnualPriceResponse(request,env);
 assert.equal(JSON.stringify(site),initial,'Existing site address must not be mutated');
 assert.ok(calls.every(c=>c.method==='GET'||c.path==='/rest/v1/rpc/domain_connection_payment_ready_v2'),'No order, payment or binding mutation');
 return {response,body:await response.json(),calls};
}
for(const [name,slug,customDomain] of [
 ['matching free address','my-blog','my-blog.ngeblogging.com'],
 ['single-character slug','a','a.ngeblogging.com'],
 ['maximum valid slug','a'.repeat(63),'a'.repeat(63)+'.ngeblogging.com'],
 ['no existing address',undefined,null],
])test('checkout site policy: allows '+name+' without replacing the site address',async()=>{
 const f=await sitePolicyFixture({slug,customDomain});
 assert.equal(f.response.status,200,JSON.stringify(f.body));assert.equal(f.body.paymentRequired,false);assert.equal(f.body.checkoutCreated,undefined);
 assert.equal(f.calls.filter(c=>c.path==='/rest/v1/domain_connection_entitlements').length,1);
 assert.equal(f.calls.find(c=>c.path==='/rest/v1/sites').select,'id,owner_id,custom_domain,slug');
});
for(const [name,slug,customDomain] of [
 ['external primary','my-blog','customer.example'],
 ['another site free address','my-blog','other-blog.ngeblogging.com'],
 ['lookalike suffix','my-blog','my-blog.ngeblogging.com.evil.example'],
 ['URL instead of hostname','my-blog','https://my-blog.ngeblogging.com'],
 ['missing slug',undefined,'my-blog.ngeblogging.com'],
 ['underscore slug','my_blog','my_blog.ngeblogging.com'],
 ['leading hyphen','-my-blog','-my-blog.ngeblogging.com'],
 ['overlong slug','a'.repeat(64),'a'.repeat(64)+'.ngeblogging.com'],
 ['nested slug','x.my-blog','x.my-blog.ngeblogging.com'],
 ['uppercase slug','My-Blog','My-Blog.ngeblogging.com'],
 ['empty slug','','.ngeblogging.com'],
 ['noncanonical hostname','my-blog','MY-BLOG.ngeblogging.com'],
 ['different platform','my-blog','my-blog.other.example'],
])test('checkout site policy: holds '+name+' before any payment or order write',async()=>{
 const f=await sitePolicyFixture({slug,customDomain});
 assert.equal(f.response.status,409);assert.equal(f.body.code,'EXISTING_PRIMARY_REQUIRES_REVIEW');
 assert.equal(f.calls.filter(c=>c.path==='/rest/v1/domain_connection_entitlements').length,0);
});
test('checkout site policy: matching free address does not bypass site ownership',async()=>{
 const f=await sitePolicyFixture({slug:'my-blog',customDomain:'my-blog.ngeblogging.com',owner:false});
 assert.equal(f.response.status,403);assert.equal(f.body.code,'SITE_MANAGER_REQUIRED');
 assert.equal(f.calls.filter(c=>c.path==='/rest/v1/domain_connection_entitlements').length,0);
});
