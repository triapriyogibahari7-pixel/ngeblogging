import test from 'node:test';
import assert from 'node:assert/strict';
import * as operation from '../scripts/repair-triapriyogi-worker-domain.mjs';
const {TARGET,repairTriapriyogi,safeRepairError}=operation;
globalThis.fetch=()=>{throw Error('LIVE_NETWORK_FORBIDDEN');};
function fixture(mode='good'){
 const calls=[],attached=new Set(),events=[],reads=new Map();let pauses=0;
 const fetchImpl=async(url,init)=>{
  const u=new URL(url),body=init.body?JSON.parse(init.body):null;calls.push({url:String(url),method:init.method,body});let result;
  if(u.pathname==='/client/v4/zones/'+TARGET.zoneId){if(mode==='zone-forbidden')return new Response('denied',{status:403});result={id:TARGET.zoneId,name:mode==='wrong-zone'?'other.example':TARGET.zoneName,status:mode==='pending-zone'?'pending':'active',account:{id:mode==='wrong-account'?'other':TARGET.accountId}};}
  else if(u.pathname.endsWith('/workers/domains')&&init.method==='GET'){
   if(mode==='binding-forbidden')return new Response('denied',{status:403});
   const hostname=u.searchParams.get('hostname'),count=(reads.get(hostname)||0)+1;reads.set(hostname,count);
   result=mode==='conflict'&&hostname.startsWith('www.')?[{id:'other',hostname,service:'other-worker',zone_id:TARGET.zoneId}]:mode==='ambiguous'?[{hostname},{hostname}]:attached.has(hostname)&&!(mode==='eventual-binding'&&count<4)?[{id:'binding-'+hostname,hostname,service:TARGET.service,zone_id:TARGET.zoneId,environment:'production'}]:[];
  }else if(u.pathname.endsWith('/workers/domains')&&init.method==='PUT'){
   if(mode==='put-rejected'||(mode==='www-forbidden'&&body.hostname.startsWith('www.')))return new Response('denied',{status:403});
   if(mode!=='missing-binding')attached.add(body.hostname);result={};
  }else if(u.pathname.endsWith('/dns_records')){
   if(mode==='dns-forbidden')return new Response('denied',{status:403});
   if(mode==='dns-unavailable')return new Response('down',{status:503});
   result=mode==='missing-dns'?[]:[{name:u.searchParams.get('name'),type:'AAAA',proxied:mode!=='dns-only',content:'provider-managed-fixture'}];
  }else throw Error('UNEXPECTED_API_CALL');
  return Response.json({success:true,result});
 };
 const run=options=>repairTriapriyogi({token:'fixture-token',manifest:JSON.parse(JSON.stringify(TARGET)),fetchImpl,pause:async()=>{pauses++;},onProgress:event=>events.push(event),...options});
 return {calls,events,pauses:()=>pauses,run};
}
test('dry run performs no writes',async()=>{const f=fixture();const r=await f.run();assert.equal(r.mode,'dry-run');assert.equal(f.calls.filter(c=>c.method!=='GET').length,0);assert.equal(r.publicDnsVerified,false);});
test('apply touches exactly the approved two hostnames and service',async()=>{const f=fixture();const r=await f.run({apply:true});const writes=f.calls.filter(c=>c.method==='PUT');assert.deepEqual(writes.map(c=>c.body.hostname),TARGET.hostnames);assert.ok(writes.every(c=>c.body.service===TARGET.service&&c.body.zone_id===TARGET.zoneId));assert.equal(r.repaired.length,2);assert.equal(r.publicDnsVerified,false);assert.ok(f.calls.every(c=>['GET','PUT'].includes(c.method)));});
for(const mode of ['wrong-zone','wrong-account','pending-zone','conflict','ambiguous'])test('refuses '+mode+' before writes',async()=>{const f=fixture(mode);await assert.rejects(f.run({apply:true}));assert.equal(f.calls.filter(c=>c.method==='PUT').length,0);});
test('different manifest is refused without API requests',async()=>{const f=fixture();await assert.rejects(f.run({manifest:{...TARGET,service:'other'},apply:true}),/REPAIR_TARGET_MISMATCH/);assert.equal(f.calls.length,0);});
for(const mode of ['put-rejected','missing-binding','missing-dns','dns-only'])test('does not report success on '+mode,async()=>{const f=fixture(mode);await assert.rejects(f.run({apply:true}));});
test('missing credentials are refused without API requests',async()=>{const f=fixture();await assert.rejects(f.run({token:''}),/CLOUDFLARE_TOKEN_REQUIRED/);assert.equal(f.calls.length,0);});
test('DNS 403 does not prevent both approved bindings but still fails verification',async()=>{const f=fixture('dns-forbidden');await assert.rejects(f.run({apply:true}));assert.deepEqual(f.calls.filter(c=>c.method==='PUT').map(c=>c.body.hostname),TARGET.hostnames);assert.deepEqual(f.events.map(e=>e.stage),['WORKER_BINDING_CONFIRMED','WORKER_BINDING_CONFIRMED']);});
test('DNS read failure includes its exact stage even for a non JSON error body',async()=>{const f=fixture('dns-forbidden');await assert.rejects(f.run({apply:true}),/CLOUDFLARE_REQUEST_REJECTED_HTTP_403_READ_DNS_APEX/);});
for(const [mode,stage] of [['zone-forbidden','READ_ZONE'],['binding-forbidden','PRECHECK_BINDING_APEX']])test('403 at '+stage+' prevents all writes',async()=>{const f=fixture(mode);await assert.rejects(f.run({apply:true}),new RegExp('CLOUDFLARE_REQUEST_REJECTED_HTTP_403_'+stage));assert.equal(f.calls.filter(c=>c.method==='PUT').length,0);});
test('www attach denial is not mislabeled as DNS verification failure',async()=>{const f=fixture('www-forbidden');await assert.rejects(f.run({apply:true}),/CLOUDFLARE_REQUEST_REJECTED_HTTP_403_ATTACH_WWW/);assert.equal(f.calls.filter(c=>new URL(c.url).pathname.endsWith('/dns_records')).length,0);});
test('eventually visible bindings are checked with bounded read retries',async()=>{const f=fixture('eventual-binding');const r=await f.run({apply:true});assert.equal(r.repaired.length,2);assert.ok(f.pauses()>0&&f.pauses()<=6);assert.equal(f.calls.filter(c=>c.method==='PUT').length,2);});
test('DNS 503 is not swallowed or turned into success',async()=>{const f=fixture('dns-unavailable');await assert.rejects(f.run({apply:true}),/CLOUDFLARE_REQUEST_REJECTED_HTTP_503_READ_DNS_APEX/);});
test('safe formatter keeps approved stage codes but not arbitrary messages',()=>{assert.equal(safeRepairError(Error('CLOUDFLARE_REQUEST_REJECTED_HTTP_403_READ_DNS_APEX')),'CLOUDFLARE_REQUEST_REJECTED_HTTP_403_READ_DNS_APEX');for(const message of ['Bearer PRIVATE_TOKEN','https://internal.example/?token=secret','CLOUDFLARE_REQUEST_REJECTED_HTTP_403_PRIVATE_TOKEN'])assert.equal(safeRepairError(Error(message)),'CLOUDFLARE_BUILD_DOMAIN_REPAIR_FAILED');});
test('all bindings are confirmed before the first DNS lookup',async()=>{const f=fixture();await f.run({apply:true});const firstDns=f.calls.findIndex(c=>new URL(c.url).pathname.endsWith('/dns_records'));assert.equal(f.calls.slice(0,firstDns).filter(c=>c.method==='PUT').length,2);assert.deepEqual(f.events.slice(0,2).map(e=>e.hostname),TARGET.hostnames);});
