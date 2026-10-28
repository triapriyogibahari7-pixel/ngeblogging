import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyDeployment} from '../scripts/verify-midtrans-deployment.mjs';
const sha='0dea5030b99d5314be52d7b150304fc9a584f650';
const good=()=>({brand:'Ngeblogging',provider:'midtrans',environment:'production',ready:true,plans:[{id:'pro_monthly',currency:'IDR',amount:300000},{id:'pro_yearly',currency:'IDR',amount:3000000}]});
async function run(change={}, release={deployment_commit:sha}, status=200, failMainOnly=false) {
 const calls=[],logs=[];
 const originals={fetch:globalThis.fetch,setTimeout:globalThis.setTimeout,log:console.log};
 globalThis.setTimeout=(fn)=>{queueMicrotask(fn);return 0;};
 console.log=(line)=>logs.push(JSON.parse(line));
 globalThis.fetch=async(input)=>{
  const u=new URL(input);calls.push(u);
  const config=Object.assign(good(),(!failMainOnly||u.hostname==='ngeblogging.com')?change:{});
  return new Response(JSON.stringify(u.pathname==='/release-v344.json'?release:config),{status});
 };
 let error;
 try {await verifyDeployment(sha);}catch(e){error=e;}
 finally {Object.assign(globalThis,{fetch:originals.fetch,setTimeout:originals.setTimeout});console.log=originals.log;}
 return {calls,logs,error};
}
test('verifies release and ready billing on both origins',async()=>{
 const r=await run();assert.equal(r.error,undefined);assert.equal(r.calls.length,4);assert.equal(r.logs.length,2);
 assert.deepEqual(r.logs.map(x=>x.origin),['https://ngeblogging.triapriyogibahari7.workers.dev','https://ngeblogging.com']);
 assert.ok(r.logs.every(x=>x.merchantConfigured===true));
});
test('rejects unready configuration after bounded retries',async()=>{
 const r=await run({ready:false});assert.match(r.error.message,/MIDTRANS_NOT_READY/);assert.equal(r.calls.length,24);assert.equal(r.logs.length,0);
});
test('rejects sandbox',async()=>{
 const r=await run({environment:'sandbox'});assert.match(r.error.message,/MIDTRANS_NOT_PRODUCTION/);assert.equal(r.logs.length,0);
});
test('rejects release commit mismatch before billing fetch',async()=>{
 const r=await run({}, {deployment_commit:'a'.repeat(40)});assert.match(r.error.message,/LIVE_COMMIT_MISMATCH/);assert.equal(r.calls.length,12);assert.ok(r.calls.every(u=>u.pathname==='/release-v344.json'));
});
test('rejects mismatched prices',async()=>{
 const r=await run({plans:[{id:'pro_monthly',currency:'IDR',amount:1}]});assert.match(r.error.message,/LIVE_PRICE_MISMATCH/);
});
test('rejects HTTP failure after bounded retries',async()=>{
 const r=await run({},undefined,503);assert.match(r.error.message,/HTTP_503/);assert.equal(r.calls.length,12);
});
test('does not accept healthy worker when main domain is unready',async()=>{
 const r=await run({ready:false},undefined,200,true);assert.match(r.error.message,/https:\/\/ngeblogging.com: MIDTRANS_NOT_READY/);assert.equal(r.logs.length,1);assert.equal(r.calls.length,26);
});
