import test from 'node:test';
import assert from 'node:assert/strict';
import {runWorkerDomainConnectionCredentialProbe as probe} from '../server/domain-connection-worker-credential-probe.mjs';
const ID='11111111-1111-4111-8111-111111111111',ORDER='DCON-'+'a'.repeat(32);
const CF='synthetic-cf-token',SERVICE='synthetic-service-key',MID=['Mid','server','fixture-not-a-credential'].join('-');
const DB='https://polvmlrhqoiflumibfqs.supabase.co';
const env=()=>({DOMAIN_CONNECTION_DIAGNOSTIC_OPERATOR_IDS:ID,SUPABASE_URL:DB,SUPABASE_PUBLISHABLE_KEY:'synthetic-publishable',SUPABASE_SERVICE_ROLE_KEY:SERVICE,CLOUDFLARE_ZONE_ID:'7658e226c2f165a24f3bbb1cf31db238',CLOUDFLARE_ACCOUNT_ID:'095e57b46e7ba7f6b188480d9e4e5fe7',CLOUDFLARE_CUSTOM_HOSTNAME_TARGET:'connect.ngeblogging.com',CLOUDFLARE_DOMAIN_API_TOKEN:CF,DOMAIN_MIDTRANS_PRODUCTION_SERVER_KEY:MID,DOMAIN_MIDTRANS_PRODUCTION_MERCHANT_ID:'synthetic-merchant'});
const request=()=>new Request('https://ngeblogging.com/api/internal/domain-connection-diagnostics',{headers:{authorization:'Bearer fake.jwt.signature'}});
function fixture(override){
 const calls=[];
 const fetchImpl=async(url,init)=>{
  calls.push({url,init});
  assert.equal(init.redirect,'manual');assert.equal(init.method,'GET');assert.equal(init.credentials,'omit');assert.equal(init.body,undefined);assert.ok(init.signal);
  if(override){const response=override(url,init,calls.length);if(response)return response;}
  const u=new URL(url);
  if(url===DB+'/auth/v1/user'){assert.equal(calls.length,1);return Response.json({id:ID,email_confirmed_at:'2020-01-01',is_anonymous:false});}
  assert.notEqual(init.headers.authorization,'Bearer fake.jwt.signature');
  if(u.hostname==='api.cloudflare.com'){
   assert.equal(init.headers.authorization,'Bearer '+CF);
   if(u.pathname.endsWith('/fallback_origin'))return Response.json({success:true,result:{origin:'fallback.ngeblogging.com',status:'active'}});
   if(u.pathname.endsWith('/dns_records'))return Response.json({success:true,result:[{name:'connect.ngeblogging.com',type:'AAAA',proxied:true}]});
   if(u.pathname.endsWith('/custom_hostnames'))return Response.json({success:true,result:[]});
   assert.equal(u.pathname,'/client/v4/zones/'+env().CLOUDFLARE_ZONE_ID);
   return Response.json({success:true,result:{id:env().CLOUDFLARE_ZONE_ID,account:{id:env().CLOUDFLARE_ACCOUNT_ID},name:'ngeblogging.com',status:'active'}});
  }
  if(u.origin===DB&&u.pathname==='/rest/v1/domain_connection_orders'){
   assert.equal(init.headers.apikey,SERVICE);assert.equal(init.headers.authorization,'Bearer '+SERVICE);
   if(u.searchParams.get('limit')==='0')return Response.json([]);
   assert.equal(u.searchParams.get('order_id'),'eq.'+ORDER);
   return Response.json([{order_id:ORDER,environment:'production',merchant_id:'synthetic-merchant',purpose:'custom-domain-connection',amount_idr:99000,currency:'IDR',period_months:12,includes_www:true}]);
  }
  assert.equal(url,'https://api.midtrans.com/v2/'+ORDER+'/status');
  assert.equal(init.headers.authorization,'Basic '+btoa(MID+':'));
  return Response.json({status_code:'200',order_id:ORDER,merchant_id:'synthetic-merchant',gross_amount:'99000.00',currency:'IDR'});
 };
 return {calls,fetchImpl};
}
const opts=f=>({fetchImpl:f.fetchImpl,referenceOrderId:ORDER});
function safe(report){assert.equal(report.checkoutReady,false);assert.equal(report.mutationsRequested,false);for(const s of [CF,SERVICE,MID,ID,ORDER])assert.equal(JSON.stringify(report).includes(s),false);}
test('Workers-compatible transport completes seven GETs without claiming checkout readiness',async()=>{const f=fixture(),e=Object.freeze(env()),before=JSON.stringify(e),r=await probe(request(),e,opts(f));assert.equal(f.calls.length,7);assert.equal(r.midtrans.merchantIdentityVerified,true);assert.equal(r.cloudflare.writePermissionVerified,false);assert.equal(r.storage.serviceRoleVerified,false);assert.equal(JSON.stringify(e),before);safe(r);});
test('without reference, no transaction or ledger row is requested',async()=>{const f=fixture(),r=await probe(request(),env(),{fetchImpl:f.fetchImpl});assert.equal(f.calls.length,6);assert.ok(f.calls.at(-1).url.endsWith('select=order_id&limit=0'));assert.equal(r.midtrans.state,'not-checked');safe(r);});
test('no allowlist means zero transport calls',async()=>{const f=fixture(),e=env();delete e.DOMAIN_CONNECTION_DIAGNOSTIC_OPERATOR_IDS;await assert.rejects(probe(request(),e,opts(f)),{message:'DOMAIN_DIAGNOSTIC_ACCESS_DENIED'});assert.equal(f.calls.length,0);});
test('non-operator cannot reach providers or ledger',async()=>{const f=fixture((u,i,n)=>n===1?Response.json({id:'22222222-2222-4222-8222-222222222222',email_confirmed_at:'2020-01-01',is_anonymous:false}):null);await assert.rejects(probe(request(),env(),opts(f)),{message:'DOMAIN_DIAGNOSTIC_ACCESS_DENIED'});assert.equal(f.calls.length,1);});
test('query parameters are not accepted as transaction references',async()=>{const f=fixture();await assert.rejects(probe(new Request(request().url+'?referenceOrderId='+ORDER,{headers:request().headers}),env(),opts(f)));assert.equal(f.calls.length,0);});
for(const stage of [1,2,3,4,5,6,7])for(const status of [301,302,303,307,308])test('redirect '+status+' at GET '+stage+' stops all later requests',async()=>{const f=fixture((u,i,n)=>n===stage?new Response(null,{status,headers:{location:'https://untrusted.invalid/collect'}}):null);if(stage===1){await assert.rejects(probe(request(),env(),opts(f)),{message:'DOMAIN_DIAGNOSTIC_ACCESS_DENIED'});}else{const r=await probe(request(),env(),opts(f));safe(r);assert.equal(stage<=5?r.cloudflare.state:stage===6?r.storage.state:r.midtrans.state,'read-probe-failed');assert.equal(r.midtrans.merchantIdentityVerified,false);}assert.equal(f.calls.length,stage);assert.ok(f.calls.every(c=>!c.url.includes('untrusted.invalid')));});
test('redirect response body is cancelled',async()=>{let cancelled=false;const f=fixture((u,i,n)=>n===2?new Response(new ReadableStream({cancel(){cancelled=true;}}),{status:302,headers:{location:'https://untrusted.invalid/'}}):null);const r=await probe(request(),env(),opts(f));assert.equal(cancelled,true);assert.equal(f.calls.length,2);safe(r);});
test('provider transport exception cannot leak synthetic credentials',async()=>{const f=fixture((u,i,n)=>{if(n===2)throw Error(CF+SERVICE+MID);});const r=await probe(request(),env(),opts(f));assert.equal(r.cloudflare.state,'read-probe-failed');assert.equal(f.calls.length,2);safe(r);});
test('stalled provider transport remains bounded',async()=>{const f=fixture((u,i,n)=>n===2?new Promise(()=>{}):null);const r=await probe(request(),env(),{...opts(f),timeoutMs:15});assert.equal(r.cloudflare.state,'read-probe-failed');assert.equal(f.calls.length,2);safe(r);});
test('default transport also wraps global fetch before authentication',async()=>{const previous=globalThis.fetch,f=fixture();try{globalThis.fetch=f.fetchImpl;const r=await probe(request(),env(),{referenceOrderId:ORDER});assert.equal(f.calls.length,7);assert.equal(r.midtrans.merchantIdentityVerified,true);safe(r);}finally{globalThis.fetch=previous;}});
