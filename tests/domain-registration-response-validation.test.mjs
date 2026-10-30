import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../src/api-origin-failover-v60.js',import.meta.url),'utf8');
let serial=0;
async function setup(payload,status=200){
  const calls=[];
  globalThis.location=new URL('https://ngeblogging.com/studio');
  globalThis.document={documentElement:{dataset:{}}};
  globalThis.CustomEvent=class {constructor(type,options){this.type=type;this.detail=options?.detail;}};
  globalThis.window={fetch:async(...args)=>{calls.push(args);return new Response(JSON.stringify(payload),{status,headers:{'content-type':'application/json'}});},dispatchEvent:()=>{}};
  const module=await import('data:text/javascript;base64,'+Buffer.from(source+`\n//validation-${++serial}`).toString('base64'));
  return {calls,fetch:module.resilientDomainFetch};
}
test('registration rejects JSON objects without a saved domain and never replays',async()=>{
  for(const payload of [{},{ok:true},{error:'Unexpected error',code:'BROKEN'},{domain:{}},{domain:{id:'domain-a'}},{domain:{id:'domain-a',site_id:'site-a',hostname:' '}}]){
    const h=await setup(payload);
    const response=await h.fetch('/api/domains/register',{method:'POST',body:'{}'});
    assert.equal(response.status,502);
    const diagnostic=await response.json();
    assert.equal(diagnostic.code,'DOMAIN_API_MUTATION_UNCERTAIN');
    assert.equal(diagnostic.retryAutomatically,false);
    assert.equal(h.calls.length,1);
  }
});
test('complete registration works before nameservers are available, including accepted 202',async()=>{
  const payload={domain:{id:'domain-a',site_id:'site-a',hostname:'customer.example',ownership_verification:{}}};
  for(const status of [200,201,202]){
    const h=await setup(payload,status);
    const response=await h.fetch('/api/domains/register',{method:'POST',body:'{}'});
    assert.equal(response.status,status);
    assert.deepEqual(await response.json(),payload);
    assert.equal(h.calls.length,1);
  }
});
test('registration preserves meaningful HTTP errors',async()=>{
  for(const status of [401,403,409,429,503]){
    const payload={code:'REPORTED_ERROR',error:'Denied'};
    const h=await setup(payload,status);
    const response=await h.fetch('/api/domains/register',{method:'POST',body:'{}'});
    assert.equal(response.status,status);
    assert.deepEqual(await response.json(),payload);
    assert.equal(h.calls.length,1);
  }
});
test('other domain operations do not acquire the registration schema',async()=>{
  for(const path of ['/api/domains/remove','/api/domains/refresh','/api/domain-redirects/remove']){
    const h=await setup({ok:true});
    const response=await h.fetch(path,{method:'POST',body:'{}'});
    assert.equal(response.status,200);
    assert.deepEqual(await response.json(),{ok:true});
    assert.equal(h.calls.length,1);
  }
});
test('free publication bypasses domain validation unchanged',async()=>{
  const h=await setup({ok:true});
  const response=await h.fetch('/api/data/publication',{method:'POST',body:'{}'});
  assert.equal(response.status,200);
  assert.equal(h.calls[0][0],'/api/data/publication');
  assert.equal(h.calls.length,1);
});
