import test from 'node:test';
import assert from 'node:assert/strict';
import {processCustomDomainSync as run} from '../server/custom-domain-sync-processor.mjs';
const uid=n=>'00000000-0000-0000-0000-'+String(n).padStart(12,'0');
const job={domainId:uid(1),siteId:uid(2),ownerId:uid(3),hostname:'example.com',provider:'cloudflare-full-zone',providerHostnameId:'b'.repeat(32)};
const env={CLOUDFLARE_ACCOUNT_ID:'a'.repeat(32),CLOUDFLARE_WORKER_SERVICE:'ngeblogging',CUSTOM_DOMAIN_ATTACH_ENABLED:'true'};
function fixture(){
 const bindings=new Map(),attached=[],proved=[];
 const ns=['one.ns.example.net','two.ns.example.net'];
 const dns={hostname:job.hostname,zoneName:job.hostname,checkedAt:new Date().toISOString(),ready:false,checks:['dns.google','cloudflare-dns.com'].map(resolver=>({resolver,ns:{state:'resolved',answers:[...ns]},a:{state:'no_answer'},aaaa:{state:'no_answer'}}))};
 const ops={validate:async()=>true,readZone:async()=>({id:job.providerHostnameId,name:job.hostname,account:{id:env.CLOUDFLARE_ACCOUNT_ID},type:'full',status:'active',name_servers:ns}),readDns:async()=>dns,readBindings:async h=>bindings.has(h)?[bindings.get(h)]:[],claimWrite:async()=>true,attach:async({hostname,zoneId})=>{attached.push(hostname);bindings.set(hostname,{id:hostname,hostname,service:env.CLOUDFLARE_WORKER_SERVICE,zone_id:zoneId,cert_id:'test-cert'});},verifyTenant:async j=>{proved.push(j.hostname);return {verified:true,hostname:j.hostname,domainId:j.domainId,siteId:j.siteId,tenantMappingVerified:true,checkedAt:new Date().toISOString()};}};
 return {bindings,attached,proved,dns,ops};
}
test('verified delegation permits initial Worker attachment without address records',async()=>{
 const f=fixture(),r=await run(job,env,f.ops);
 assert.equal(r.outcome,'retry');assert.equal(r.reason,'ROUTING_PROPAGATING');
 assert.deepEqual(f.attached,['example.com']);assert.equal(f.proved.length,0);
});
test('unverified delegation still prevents attachment when addresses are absent',async()=>{
 const f=fixture();f.dns.checks[0].ns.answers=['wrong.ns.example.net'];
 const r=await run(job,env,f.ops);
 assert.equal(r.reason,'NAMESERVER_DELEGATION_PENDING');assert.equal(f.attached.length,0);
});
test('bootstrap retries create each binding once and wait for DNS before tenant proof',async()=>{
 const f=fixture();
 assert.equal((await run(job,env,f.ops)).reason,'ROUTING_PROPAGATING');
 assert.equal((await run(job,env,f.ops)).reason,'ROUTING_PROPAGATING');
 assert.deepEqual(f.attached,['example.com','www.example.com']);
 const waiting=await run(job,env,f.ops);
 assert.equal(waiting.outcome,'retry');assert.equal(waiting.reason,'DNS_ADDRESS_PENDING');assert.equal(f.proved.length,0);
 f.dns.ready=true;for(const c of f.dns.checks)c.a={state:'resolved',answers:['192.0.2.1']};
 const complete=await run(job,env,f.ops);
 assert.equal(complete.outcome,'complete');assert.equal(complete.evidence.tenantMappingVerified,true);
 assert.deepEqual(f.attached,['example.com','www.example.com']);assert.deepEqual(f.proved,['example.com','www.example.com']);
});
test('bootstrap respects disabled writes even with valid delegation',async()=>{
 const f=fixture(),r=await run(job,{...env,CUSTOM_DOMAIN_ATTACH_ENABLED:'false'},f.ops);
 assert.equal(r.reason,'DOMAIN_ATTACH_NOT_ENABLED');assert.equal(f.attached.length,0);
});
