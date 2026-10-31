import test from 'node:test';
import assert from 'node:assert/strict';
import {registrarDiagnosticResponse} from '../server/registrar-diagnostic-handler.mjs';
const ORIGIN='https://feature-domain-stages5-10-integration-20261030-ngeblogging.triapriyogibahari7.workers.dev';
const ADMIN='11111111-1111-4111-8111-111111111111';
const env={REGISTRAR_DIAGNOSTIC_ADMIN_USER_ID:ADMIN,SUPABASE_URL:'https://fixture.supabase.co',SUPABASE_PUBLISHABLE_KEY:'fixture-publishable',CLOUDFLARE_REGISTRAR_API_TOKEN:'fixture-registrar'};
const domain='example.com';
const good={name:domain,registrable:true,tier:'standard',pricing:{currency:'USD',registration_cost:'10.50',renewal_cost:'11.25'}};
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json'}});
function request({origin=ORIGIN,method='POST',auth=true,suffix=domain,query='',headers={}}={}){return new Request(origin+'/api/admin/registrar/check/'+suffix+query,{method,headers:{origin,...(auth?{authorization:'Bearer fixture-session'}:{}),...headers}});}
function upstream(t,{userId=ADMIN,row=good,authStatus=200,providerStatus=200}={}){
 const calls=[];
 t.mock.method(globalThis,'fetch',async(input,init)=>{
  const url=input instanceof Request?input.url:String(input),options=input instanceof Request?input:init;calls.push({url,options});
  if(url==='https://fixture.supabase.co/auth/v1/user'){assert.equal(options.redirect,'manual');assert.equal(options.headers.get('authorization'),'Bearer fixture-session');return json({id:userId},authStatus);}
  assert.equal(url,'https://api.cloudflare.com/client/v4/accounts/095e57b46e7ba7f6b188480d9e4e5fe7/registrar/domain-check');
  assert.equal(init.method,'POST');assert.equal(init.redirect,'manual');assert.deepEqual(JSON.parse(init.body),{domains:[domain]});assert.equal(init.headers.Authorization,'Bearer fixture-registrar');
  return providerStatus>=300&&providerStatus<400?new Response(null,{status:providerStatus,headers:{location:'https://example.org/'}}):json({success:true,result:{domains:[row]}},providerStatus);
 });
 return calls;
}
test('GET is rejected before any upstream request',async t=>{const calls=upstream(t);const r=await registrarDiagnosticResponse(request({method:'GET'}),env);assert.equal(r.status,405);assert.equal((await r.json()).code,'METHOD_NOT_ALLOWED');assert.equal(calls.length,0);});
test('Check is unavailable on the production hostname',async t=>{const calls=upstream(t);const r=await registrarDiagnosticResponse(request({origin:'https://ngeblogging.com'}),env);assert.equal(r.status,404);assert.equal(calls.length,0);});
test('cross-origin POST is rejected before upstream',async t=>{const calls=upstream(t);const r=await registrarDiagnosticResponse(request({headers:{origin:'https://example.org'}}),env);assert.equal(r.status,403);assert.equal((await r.json()).code,'ORIGIN_NOT_ALLOWED');assert.equal(calls.length,0);});
test('query parameters are rejected',async t=>{const calls=upstream(t);const r=await registrarDiagnosticResponse(request({query:'?domain=other.com'}),env);assert.equal(r.status,400);assert.equal((await r.json()).code,'EMPTY_REQUEST_REQUIRED');assert.equal(calls.length,0);});
test('missing bearer is rejected before upstream',async t=>{const calls=upstream(t);const r=await registrarDiagnosticResponse(request({auth:false}),env);assert.equal(r.status,401);assert.equal(calls.length,0);});
test('verified non-admin cannot reach registrar',async t=>{const calls=upstream(t,{userId:'22222222-2222-4222-8222-222222222222'});const r=await registrarDiagnosticResponse(request(),env);assert.equal(r.status,403);assert.equal((await r.json()).code,'ADMIN_REQUIRED');assert.equal(calls.length,1);});
test('invalid session cannot reach registrar',async t=>{const calls=upstream(t,{authStatus:401});const r=await registrarDiagnosticResponse(request(),env);assert.equal(r.status,401);assert.equal((await r.json()).code,'INVALID_SESSION');assert.equal(calls.length,1);});
test('invalid subdomain is rejected after admin verification without registrar call',async t=>{const calls=upstream(t);const r=await registrarDiagnosticResponse(request({suffix:'sub.example.com'}),env);assert.equal(r.status,400);assert.equal((await r.json()).code,'INVALID_DOMAIN');assert.equal(calls.length,1);});
test('admin receives validated prices and purchase stays disabled',async t=>{const calls=upstream(t);const r=await registrarDiagnosticResponse(request(),env),data=await r.json();assert.equal(r.status,200);assert.equal(data.code,'REGISTRAR_CHECK');assert.equal(data.status,'checked');assert.equal(data.domain,domain);assert.equal(data.prices.registration.amount,'10.50');assert.equal(data.prices.renewal.amount,'11.25');assert.equal(data.prices.currency,'USD');assert.equal(data.prices.transfer,null);assert.equal(data.prices.taxIncluded,null);assert.equal(data.purchaseAllowed,false);assert.equal(data.lookupOnly,true);assert.equal(data.mustRecheckBeforePurchase,true);assert.equal(r.headers.get('cache-control'),'no-store');assert.equal(calls.length,2);assert.ok(!JSON.stringify(data).includes('fixture-registrar'));});
test('unavailable domain has no fabricated price',async t=>{upstream(t,{row:{name:domain,registrable:false,reason:'domain_unavailable',tier:'standard'}});const r=await registrarDiagnosticResponse(request(),env),data=await r.json();assert.equal(r.status,200);assert.equal(data.status,'not_registrable');assert.equal(data.availability,'unavailable');assert.equal(data.quote,null);assert.equal(data.prices,undefined);assert.equal(data.purchaseAllowed,false);});
test('premium response cannot enable purchase',async t=>{upstream(t,{row:{...good,tier:'premium'}});const r=await registrarDiagnosticResponse(request(),env),data=await r.json();assert.equal(r.status,200);assert.equal(data.status,'premium_not_supported');assert.equal(data.purchaseAllowed,false);});
test('provider redirect is rejected without follow-up request',async t=>{const calls=upstream(t,{providerStatus:302});const r=await registrarDiagnosticResponse(request(),env),data=await r.json();assert.equal(r.status,502);assert.equal(data.status,'redirect_rejected');assert.equal(data.purchaseAllowed,false);assert.equal(calls.length,2);});
