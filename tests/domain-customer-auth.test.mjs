import test from 'node:test';
import assert from 'node:assert/strict';
import {createCustomerDomainAuthBridge} from '../server/domain-customer-auth-bridge.mjs';
const USER='11111111-1111-4111-8111-111111111111',SITE='22222222-2222-4222-8222-222222222222';
const BASE='https://polvmlrhqoiflumibfqs.supabase.co/';
const env=()=>({SUPABASE_URL:BASE,SUPABASE_PUBLISHABLE_KEY:'offline-fixture-public-key'});
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json'}});
const request=(token='offline-fixture-token',signal)=>new Request('https://ngeblogging.com/api/domains/commerce/search/example.com',{method:'POST',headers:{origin:'https://ngeblogging.com',authorization:'Bearer '+token,'x-site-id':SITE},signal});
const good=async target=>String(target).includes('/auth/v1/user')?json({id:USER}):json([{id:SITE,owner_id:USER}]);
const bridge=fetchImpl=>createCustomerDomainAuthBridge({fetchImpl,log:()=>{}});
// Passing auth reaches the intentionally disabled search gate; no registrar is called.
test('authenticated owner reaches the search gate without bypassing configuration',async()=>{
 const response=await bridge(good)(request(),env());
 assert.equal((await response.json()).code,'DOMAIN_SEARCH_DISABLED');
});
test('default transport preserves the global fetch receiver',async t=>{
 t.mock.method(globalThis,'fetch',function(target,init){assert.equal(this,globalThis);return good(target,init);});
 const response=await createCustomerDomainAuthBridge({log:()=>{}})(request(),env());
 assert.equal((await response.json()).code,'DOMAIN_SEARCH_DISABLED');
});
test('edge whitespace is normalized without mutating bindings',async()=>{
 const config={SUPABASE_URL:' '+BASE+'\n',SUPABASE_PUBLISHABLE_KEY:' offline-fixture-public-key \n'};
 const response=await bridge(async(target,init)=>{assert.equal(init.headers.apikey,'offline-fixture-public-key');assert.ok(String(target).startsWith(BASE));return good(target);})(request(),config);
 assert.equal((await response.json()).code,'DOMAIN_SEARCH_DISABLED');assert.equal(config.SUPABASE_URL,' '+BASE+'\n');
});
test('wrong project and malformed key fail closed without network calls',async()=>{
 for(const change of [{SUPABASE_URL:'https://different-project.supabase.co/'},{SUPABASE_PUBLISHABLE_KEY:'bad\nkey'}]){
  let calls=0;const response=await bridge(async()=>{calls++;throw Error();})(request(),{...env(),...change});
  assert.equal((await response.json()).code,'AUTH_CONFIGURATION_UNAVAILABLE');assert.equal(calls,0);
 }
});
test('API key rejection is not misreported as an expired user session',async()=>{
 const response=await bridge(async()=>json({message:'Invalid API key'},401))(request(),env());
 assert.equal(response.status,503);assert.equal((await response.json()).code,'AUTH_API_KEY_REJECTED');
});
test('expired user session and foreign site owner remain denied',async()=>{
 const expired=await bridge(async()=>json({msg:'invalid JWT'},401))(request(),env());
 assert.equal(expired.status,401);assert.equal((await expired.json()).code,'INVALID_SESSION');
 const foreign=await bridge(async target=>String(target).includes('/auth/v1/user')?json({id:USER}):json([{id:SITE,owner_id:SITE}]))(request(),env());
 assert.equal(foreign.status,403);assert.equal((await foreign.json()).code,'SITE_OWNER_REQUIRED');
});
test('site access denial differs from a verified ownership mismatch',async()=>{
 const response=await bridge(async target=>String(target).includes('/auth/v1/user')?json({id:USER}):json({message:'permission denied'},403))(request(),env());
 assert.equal(response.status,503);assert.equal((await response.json()).code,'AUTH_SITE_ACCESS_DENIED');
});
test('transport and malformed payload errors expose no upstream secret text',async()=>{
 const logs=[],handler=createCustomerDomainAuthBridge({fetchImpl:async()=>{throw Error('private-fixture-token');},log:x=>logs.push(x)});
 const response=await handler(request('private-fixture-token'),env()),data=await response.json();
 assert.equal(data.code,'AUTH_SESSION_FETCH_FAILED');assert.ok(!JSON.stringify([data,logs]).includes('private-fixture-token'));
 const malformed=await bridge(async()=>new Response('not-json',{status:200}))(request(),env());
 assert.equal((await malformed.json()).code,'AUTH_SESSION_RESPONSE_INVALID');
 const site=await bridge(async target=>String(target).includes('/auth/v1/user')?json({id:USER}):json({unexpected:true}))(request(),env());
 assert.equal((await site.json()).code,'AUTH_SITE_RESPONSE_INVALID');
});
test('request-local diagnostics do not contaminate simultaneous requests',async()=>{
 const handler=bridge(async(target,init)=>{
  if(init.headers.authorization==='Bearer fails'){await new Promise(r=>setTimeout(r,5));throw Error('private-error');}
  return good(target);
 });
 const [a,b]=await Promise.all([handler(request('fails'),env()),handler(request('works'),env())]);
 assert.equal((await a.json()).code,'AUTH_SESSION_FETCH_FAILED');assert.equal((await b.json()).code,'DOMAIN_SEARCH_DISABLED');
});
test('caller abort during authentication remains fail closed',async()=>{
 const controller=new AbortController();
 const handler=bridge(async(target,init)=>new Promise((resolve,reject)=>{init.signal.addEventListener('abort',()=>reject(Error('aborted')),{once:true});controller.abort();}));
 const response=await handler(request('fixture',controller.signal),env());
 assert.equal((await response.json()).code,'AUTH_REQUEST_TIMEOUT');
});
test('legacy and non-domain requests are not intercepted',async()=>{
 let calls=0;const handler=bridge(async()=>{calls++;throw Error();});
 assert.equal(await handler(new Request('https://ngeblogging.com/api/domains/registrar/check/example.com'),env()),null);
 assert.equal(await handler(new Request('https://ngeblogging.com/api/health'),env()),null);assert.equal(calls,0);
});
