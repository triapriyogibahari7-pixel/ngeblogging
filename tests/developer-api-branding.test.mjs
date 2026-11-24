import test from 'node:test';
import assert from 'node:assert/strict';
import {developerApiResponse} from '../server/developer-api-branding.mjs';
const base='https://ngeblogging.com/api/developer';
const never=()=>{throw Error('UNEXPECTED_NETWORK');};
test('unrelated domain, payment, Nara, assets and custom-host requests are not intercepted',async()=>{
 for(const path of ['/api/domains/search','/api/domains/connect','/api/billing','/api/nara','/studio','/.well-known/acme-challenge/a','/api/developer-other'])for(const method of ['GET','POST'])assert.equal(await developerApiResponse(new Request('https://ngeblogging.com'+path,{method}),{},never),null);
 for(const origin of ['https://www.example.test','https://site.ngeblogging.com','https://ngeblogging.com.example.test','http://ngeblogging.com'])assert.equal(await developerApiResponse(new Request(origin+'/api/developer/v1/me'),{},never),null);
});
test('four GET endpoints preserve query and bearer without cookies or service credentials',async()=>{
 for(const path of ['/v1/me','/v1/sites','/v1/sites/00000000-0000-0000-0000-000000000001','/v1/sites/00000000-0000-0000-0000-000000000001/content']){
  let calls=0;
  const response=await developerApiResponse(new Request(base+path+'?limit=7',{headers:{authorization:'Bearer test-only-placeholder',cookie:'must-not-forward=1'}}),{SUPABASE_SERVICE_ROLE_KEY:'must-not-forward'},async(url,init)=>{
   calls++;assert.equal(new URL(url).pathname,'/functions/v1/ngeblogging-api'+path);assert.equal(new URL(url).search,'?limit=7');assert.equal(init.headers.get('authorization'),'Bearer test-only-placeholder');assert.equal(init.headers.get('cookie'),null);assert.equal(init.headers.get('apikey'),null);assert.equal(init.redirect,'manual');
   return Response.json({data:[]},{headers:{'set-cookie':'must-not-expose=1','x-supabase-project':'hidden'}});
  });
  assert.equal(calls,1);assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(response.headers.get('set-cookie'),null);assert.equal(response.headers.get('x-supabase-project'),null);assert.deepEqual(await response.json(),{data:[]});
 }
});
test('upstream authentication, scope, not-found, rate-limit and server status remain enforced',async()=>{
 for(const status of [401,403,404,429,503]){
  const response=await developerApiResponse(new Request(base+'/v1/me'),{},async(_url,init)=>{assert.equal(init.headers.get('authorization'),null);return Response.json({code:'ORIGINAL_DENIAL'},{status});});
  assert.equal(response.status,status);assert.equal((await response.json()).code,'ORIGINAL_DENIAL');
 }
});
test('preflight succeeds while mutations and unsupported paths never reach upstream',async()=>{
 assert.equal((await developerApiResponse(new Request(base+'/v1/me',{method:'OPTIONS'}),{},never)).status,204);
 for(const method of ['POST','PUT','PATCH','DELETE','HEAD'])assert.equal((await developerApiResponse(new Request(base+'/v1/sites',{method}),{},never)).status,405);
 for(const path of ['/admin','/v1/sites/not-a-site-id','/v1/sites/a/content/write'])assert.equal((await developerApiResponse(new Request(base+path),{},never)).status,404);
});
test('redirects, HTML errors and transport failures do not leak backend addresses',async()=>{
 for(const fetcher of [async()=>new Response(null,{status:302,headers:{location:'https://private.example.test'}}),async()=>new Response('private backend failure'),async()=>{throw Error('private backend credentials');}]){
  const response=await developerApiResponse(new Request(base+'/v1/me'),{},fetcher);
  assert.equal(response.status,502);assert.doesNotMatch(await response.text(),/private|supabase/i);assert.equal(response.headers.get('location'),null);
 }
});
