import test from 'node:test';
import assert from 'node:assert/strict';
import {checkCustomDomainDns} from '../server/custom-domain-dns-readiness.mjs';
const options={hostname:'blog.example.com',zoneName:'example.com',expectedNameservers:['jillian.ns.cloudflare.com','simon.ns.cloudflare.com']};
const answer=url=>{const type=new URL(url).searchParams.get('type');return {Status:0,Answer:type==='NS'?[{type:2,data:'jillian.ns.cloudflare.com.'},{type:2,data:'simon.ns.cloudflare.com.'}]:type==='A'?[{type:1,data:'192.0.2.1'}]:[]};};
test('transient network failures retry once per resolver and record type',async()=>{
 const calls=new Map();
 const result=await checkCustomDomainDns({...options,fetchImpl:async(url,init)=>{assert.equal(init.redirect,'manual');const n=(calls.get(url)||0)+1;calls.set(url,n);if(n===1)throw new TypeError('network');return Response.json(answer(url));}});
 assert.equal(result.ready,true);assert.equal(calls.size,6);assert.ok([...calls.values()].every(n=>n===2));assert.equal(result.httpsVerified,false);assert.equal(result.siteContentVerified,false);
});
test('NXDOMAIN is not retried or reported ready',async()=>{
 let calls=0;const result=await checkCustomDomainDns({...options,fetchImpl:async()=>{calls++;return Response.json({Status:3});}});
 assert.equal(calls,6);assert.equal(result.ready,false);assert.equal(result.state,'nxdomain');
});
test('persistent resolver failure stays inconclusive after bounded retry',async()=>{
 let calls=0;const result=await checkCustomDomainDns({...options,fetchImpl:async()=>{calls++;return new Response('',{status:503});}});
 assert.equal(calls,12);assert.equal(result.ready,false);assert.equal(result.state,'inconclusive');assert.ok(result.checks.every(row=>row.ns.state==='unavailable'));
});
test('valid empty answers are not retried',async()=>{
 let calls=0;const result=await checkCustomDomainDns({...options,fetchImpl:async()=>{calls++;return Response.json({Status:0,Answer:[]});}});
 assert.equal(calls,6);assert.equal(result.ready,false);
});
test('a retry cannot conceal a nameserver mismatch',async()=>{
 const calls=new Map();const result=await checkCustomDomainDns({...options,fetchImpl:async url=>{const n=(calls.get(url)||0)+1;calls.set(url,n);if(n===1)throw Error('network');const data=answer(url);if(new URL(url).searchParams.get('type')==='NS')data.Answer=[{type:2,data:'other.example.net.'}];return Response.json(data);}});
 assert.equal(result.ready,false);assert.equal(result.state,'nameserver_mismatch');
});
