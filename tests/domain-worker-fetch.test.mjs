import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorkerRedirectSafeFetch,WorkerRedirectRejectedError} from '../server/domain-worker-fetch.mjs';
test('worker transport overrides redirect without mutating request options',async()=>{
 const controller=new AbortController(),headers={authorization:'Bearer offline-fixture'},body='offline-fixture-body';
 const input=Object.freeze({method:'POST',redirect:'error',headers,body,signal:controller.signal,cache:'no-store',credentials:'omit'});
 const expected=new Response('fixture');let calls=0;
 const send=createWorkerRedirectSafeFetch(async(target,init)=>{calls++;assert.equal(target,'https://offline.invalid/');assert.equal(init.redirect,'manual');for(const k of ['method','headers','body','signal','cache','credentials'])assert.equal(init[k],input[k]);return expected;});
 assert.equal(await send('https://offline.invalid/',input),expected);assert.equal(calls,1);assert.equal(input.redirect,'error');
});
test('all 3xx responses are rejected without following Location',async()=>{
 for(const status of [301,302,303,304,307,308]){
  let calls=0;const send=createWorkerRedirectSafeFetch(async(input,init)=>{calls++;assert.equal(init.redirect,'manual');return new Response(null,{status,headers:{location:'https://must-not-follow.invalid/'}});});
  await assert.rejects(send('https://offline.invalid/',{redirect:'error'}),error=>error instanceof WorkerRedirectRejectedError&&error.status===status&&!error.message.includes('must-not-follow'));
  assert.equal(calls,1);
 }
});
test('rejected redirect bodies are canceled',async()=>{
 let canceled=false;const stream=new ReadableStream({cancel(){canceled=true;}});
 const send=createWorkerRedirectSafeFetch(async()=>new Response(stream,{status:302}));
 await assert.rejects(send('https://offline.invalid/'),WorkerRedirectRejectedError);await Promise.resolve();assert.equal(canceled,true);
});
test('nonredirect status and transport failures remain unchanged',async()=>{
 for(const status of [200,401,403,429,500]){const response=new Response('fixture',{status});assert.equal(await createWorkerRedirectSafeFetch(async()=>response)('https://offline.invalid/'),response);}
 const expected=new TypeError('offline-fixture-failure');await assert.rejects(createWorkerRedirectSafeFetch(async()=>{throw expected;})('https://offline.invalid/'),error=>error===expected);
});
test('default fetch keeps the global receiver',async t=>{
 t.mock.method(globalThis,'fetch',function(input,init){assert.equal(this,globalThis);assert.equal(init.redirect,'manual');return Promise.resolve(new Response('fixture'));});
 assert.equal(await (await createWorkerRedirectSafeFetch()('https://offline.invalid/')).text(),'fixture');
});
