import test from 'node:test';
import assert from 'node:assert/strict';
import * as audit from '../server/domain-public-audit.mjs';
const {auditPublicTarget,auditFailureDiagnostic}=audit;
globalThis.fetch=()=>{throw Error('LIVE_NETWORK_FORBIDDEN');};
const target={hostname:'customer.example',connectionStatus:'connected'};
const html=()=>new Response('<!doctype html><html><body>fixture</body></html>',{headers:{'content-type':'text/html'}});
function workerCompatibleFetch(onSend=()=>html()){
 return async(url,init)=>{
  if(Object.hasOwn(init,'credentials'))throw Error("The 'credentials' field on 'RequestInitializerDict' is not implemented.");
  if(!['manual','follow'].includes(init.redirect))throw TypeError('Unsupported redirect mode');
  if(!['no-store','no-cache'].includes(init.cache))throw TypeError('Unsupported cache mode');
  return onSend(url,init);
 };
}
test('Worker-compatible fetch loads connected domain without unsupported browser options',async()=>{const r=await auditPublicTarget(target,{fetchImpl:workerCompatibleFetch()});assert.equal(r.reachable,true);assert.equal(r.auditStatus,'passed');assert.equal(r.connectionStatus,'connected');assert.equal(r.transportRelease,'public-audit-worker-fetch-v2-20261103');});
test('outbound audit does not forward cookies authorization or change target',async()=>{let calls=0;const r=await auditPublicTarget(target,{fetchImpl:workerCompatibleFetch((url,init)=>{calls++;assert.equal(url.protocol,'https:');assert.equal(url.hostname,target.hostname);const headers=new Headers(init.headers);assert.equal(headers.has('cookie'),false);assert.equal(headers.has('authorization'),false);assert.equal(Object.hasOwn(init,'credentials'),false);return html();})});assert.equal(calls,1);assert.equal(r.reachable,true);});
test('HTTP errors are not converted into successful audit',async()=>{const r=await auditPublicTarget(target,{fetchImpl:workerCompatibleFetch(()=>new Response('Unavailable',{status:503}))});assert.equal(r.auditStatus,'http_error');assert.equal(r.reachable,false);});
test('transport failure makes no fallback request and no false pass',async()=>{let calls=0;const r=await auditPublicTarget(target,{fetchImpl:workerCompatibleFetch(()=>{calls++;throw Error('Failed to fetch');})});assert.equal(calls,1);assert.equal(r.auditStatus,'network_error');assert.equal(r.errorCode,'AUDIT_NETWORK_UNCLASSIFIED');assert.equal(r.reachable,false);assert.equal(r.connectionStatus,'connected');});
test('unsupported runtime options get a safe specific diagnostic',()=>{const d=auditFailureDiagnostic(Error("The 'credentials' field on 'RequestInitializerDict' is not implemented."));assert.equal(d.errorCode,'AUDIT_FETCH_OPTION_UNSUPPORTED');assert.equal(d.auditStatus,'network_error');});
test('same-zone routing failure gets its own diagnostic',async()=>{const r=await auditPublicTarget(target,{fetchImpl:async()=>{throw Error('1042 Worker tried to fetch another Worker on the same zone');}});assert.equal(r.errorCode,'AUDIT_WORKER_ROUTING_BLOCKED');assert.equal(r.reachable,false);});
test('Worker loop failure gets its own diagnostic without retry',async()=>{let calls=0;const r=await auditPublicTarget(target,{fetchImpl:async()=>{calls++;throw Object.assign(Error('loop'),{code:1019});}});assert.equal(calls,1);assert.equal(r.errorCode,'AUDIT_WORKER_LOOP_DETECTED');});
test('DNS cause code is classified without exposing raw details',()=>{const d=auditFailureDiagnostic(Object.assign(Error('fetch failed'),{cause:{code:'ENOTFOUND',message:'secret internal resolver'}}));assert.equal(d.errorCode,'AUDIT_DNS_LOOKUP_FAILED');assert.equal(d.check.includes('secret'),false);});
test('TLS failure does not enable insecure fallback',async()=>{let calls=0;const r=await auditPublicTarget(target,{fetchImpl:async()=>{calls++;throw Object.assign(Error('certificate secret detail'),{code:'CERT_HAS_EXPIRED'});}});assert.equal(calls,1);assert.equal(r.errorCode,'AUDIT_TLS_FAILED');assert.equal(r.reachable,false);assert.equal(r.check.includes('secret detail'),false);});
test('unknown errors do not expose stack tokens or internal URLs',()=>{const e=Error('Bearer PRIVATE_TOKEN https://internal.example/?secret=value');e.stack='PRIVATE_STACK';const d=auditFailureDiagnostic(e);assert.equal(d.errorCode,'AUDIT_NETWORK_UNCLASSIFIED');assert.doesNotMatch(JSON.stringify(d),/PRIVATE_|internal\.example|secret=value/);});
test('timeouts remain inconclusive with a stable error code',async()=>{const r=await auditPublicTarget(target,{timeoutMs:10,fetchImpl:()=>new Promise(()=>{})});assert.equal(r.auditStatus,'timeout');assert.equal(r.errorCode,'AUDIT_TIMEOUT');assert.equal(r.reachable,false);});
test('response body read failure is distinct from a missing HTTP response',async()=>{const body=new ReadableStream({start(c){c.error(Error('private response failure'));}});const r=await auditPublicTarget(target,{fetchImpl:async()=>new Response(body,{headers:{'content-type':'text/html'}})});assert.equal(r.httpStatus,200);assert.equal(r.errorCode,'AUDIT_RESPONSE_READ_FAILED');assert.equal(r.reachable,false);assert.equal(r.check.includes('private'),false);});
test('request failure after redirect is not mislabeled as body read failure',async()=>{let calls=0;const r=await auditPublicTarget(target,{fetchImpl:async()=>{if(calls++===0)return new Response(null,{status:302,headers:{location:'/next'}});throw Error('transport failure');}});assert.equal(calls,2);assert.equal(r.errorCode,'AUDIT_NETWORK_UNCLASSIFIED');assert.equal(r.reachable,false);});
