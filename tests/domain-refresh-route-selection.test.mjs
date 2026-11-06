import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../src/api-origin-failover-v60.js',import.meta.url),'utf8');
const backup='https://ngeblogging.triapriyogibahari7.workers.dev';
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
const ready=()=>json({provider:'cloudflare-full-zone',enabled:true});
let serial=0;
async function setup(mock){
 const calls=[];globalThis.location=new URL('https://ngeblogging.com/studio');globalThis.document={documentElement:{dataset:{}}};globalThis.CustomEvent=class{constructor(type,options){this.type=type;this.detail=options?.detail;}};
 globalThis.window={fetch:async request=>{calls.push(request);return mock(request);},dispatchEvent(){}};
 const module=await import('data:text/javascript;base64,'+Buffer.from(source+`\n//refresh-route-${++serial}`).toString('base64'));return {calls,fetch:module.resilientDomainFetch};
}
const refresh=h=>h.fetch('/api/domains/refresh',{method:'POST',headers:{authorization:'Bearer test-token','content-type':'application/json'},body:JSON.stringify({domainId:'test-domain'})});
test('healthy primary is probed with GET before one POST',async()=>{
 const h=await setup(request=>request.method==='GET'?ready():json({domain:{id:'test-domain',status:'verifying'}}));
 assert.equal((await refresh(h)).status,200);assert.deepEqual(h.calls.map(r=>r.method),['GET','POST']);assert.equal(new URL(h.calls[0].url).pathname,'/api/domains/config');
});
test('broken primary selects backup before sending a single POST and preserves body/auth',async()=>{
 const h=await setup(async request=>{if(request.method==='GET')return new URL(request.url).origin===backup?ready():new Response('<html/>');assert.equal(new URL(request.url).origin,backup);assert.equal(request.headers.get('authorization'),'Bearer test-token');assert.deepEqual(await request.json(),{domainId:'test-domain'});return json({domain:{id:'test-domain'}});});
 assert.equal((await refresh(h)).status,200);assert.deepEqual(h.calls.map(r=>r.method),['GET','GET','POST']);
});
test('no healthy route sends no mutation',async()=>{
 const h=await setup(()=>new Response('<html/>',{status:503}));const payload=await(await refresh(h)).json();assert.equal(payload.code,'DOMAIN_REFRESH_ROUTE_UNAVAILABLE');assert.equal(payload.mutationOutcome,'not_sent');assert.equal(h.calls.filter(r=>r.method==='POST').length,0);
});
test('explicit authentication rejection never probes backup or sends POST',async()=>{
 const h=await setup(()=>json({code:'AUTH_REQUIRED',error:'Sign in'},401));assert.equal((await refresh(h)).status,401);assert.equal(h.calls.length,1);assert.equal(h.calls[0].method,'GET');
});
test('failed POST is never replayed after route selection',async()=>{
 const h=await setup(request=>{if(request.method==='GET')return ready();throw Error('connection lost');});const payload=await(await refresh(h)).json();assert.equal(payload.code,'DOMAIN_API_MUTATION_UNCERTAIN');assert.equal(h.calls.filter(r=>r.method==='POST').length,1);assert.equal(h.calls.length,2);
});
test('cancellation while probing does not send POST',async()=>{
 const controller=new AbortController(),reason=Error('cancelled');const h=await setup(request=>new Promise((resolve,reject)=>request.signal.addEventListener('abort',()=>reject(request.signal.reason),{once:true})));
 const pending=h.fetch('/api/domains/refresh',{method:'POST',body:'{}',signal:controller.signal});controller.abort(reason);await assert.rejects(pending,error=>error===reason);assert.equal(h.calls.filter(r=>r.method==='POST').length,0);
});
