import test from 'node:test';
import assert from 'node:assert/strict';
import {TARGET,repairTriapriyogi} from '../scripts/repair-triapriyogi-worker-domain.mjs';
globalThis.fetch=()=>{throw Error('LIVE_NETWORK_FORBIDDEN');};
function fixture(mode='good'){
 const calls=[],attached=new Set();
 const fetchImpl=async(url,init)=>{
  const u=new URL(url),body=init.body?JSON.parse(init.body):null;calls.push({url:String(url),method:init.method,body});let result;
  if(u.pathname==='/client/v4/zones/'+TARGET.zoneId)result={id:TARGET.zoneId,name:mode==='wrong-zone'?'other.example':TARGET.zoneName,status:mode==='pending-zone'?'pending':'active',account:{id:mode==='wrong-account'?'other':TARGET.accountId}};
  else if(u.pathname.endsWith('/workers/domains')&&init.method==='GET'){
   const hostname=u.searchParams.get('hostname');
   result=mode==='conflict'&&hostname.startsWith('www.')?[{id:'other',hostname,service:'other-worker',zone_id:TARGET.zoneId}]:mode==='ambiguous'?[{hostname},{hostname}]:attached.has(hostname)?[{id:'binding-'+hostname,hostname,service:TARGET.service,zone_id:TARGET.zoneId,environment:'production'}]:[];
  }else if(u.pathname.endsWith('/workers/domains')&&init.method==='PUT'){
   if(mode==='put-rejected')return Response.json({success:false},{status:403});
   if(mode!=='missing-binding')attached.add(body.hostname);result={};
  }else if(u.pathname.endsWith('/dns_records'))result=mode==='missing-dns'?[]:[{name:u.searchParams.get('name'),type:'AAAA',proxied:mode!=='dns-only',content:'provider-managed-fixture'}];
  else throw Error('UNEXPECTED_API_CALL');
  return Response.json({success:true,result});
 };
 const run=options=>repairTriapriyogi({token:'fixture-token',manifest:JSON.parse(JSON.stringify(TARGET)),fetchImpl,...options});
 return {calls,run};
}
test('dry run performs no writes',async()=>{const f=fixture();const r=await f.run();assert.equal(r.mode,'dry-run');assert.equal(f.calls.filter(c=>c.method!=='GET').length,0);assert.equal(r.publicDnsVerified,false);});
test('apply touches exactly the approved two hostnames and service',async()=>{const f=fixture();const r=await f.run({apply:true});const writes=f.calls.filter(c=>c.method==='PUT');assert.deepEqual(writes.map(c=>c.body.hostname),TARGET.hostnames);assert.ok(writes.every(c=>c.body.service===TARGET.service&&c.body.zone_id===TARGET.zoneId));assert.equal(r.repaired.length,2);assert.equal(r.publicDnsVerified,false);assert.ok(f.calls.every(c=>['GET','PUT'].includes(c.method)));});
for(const mode of ['wrong-zone','wrong-account','pending-zone','conflict','ambiguous'])test('refuses '+mode+' before writes',async()=>{const f=fixture(mode);await assert.rejects(f.run({apply:true}));assert.equal(f.calls.filter(c=>c.method==='PUT').length,0);});
test('different manifest is refused without API requests',async()=>{const f=fixture();await assert.rejects(f.run({manifest:{...TARGET,service:'other'},apply:true}),/REPAIR_TARGET_MISMATCH/);assert.equal(f.calls.length,0);});
for(const mode of ['put-rejected','missing-binding','missing-dns','dns-only'])test('does not report success on '+mode,async()=>{const f=fixture(mode);await assert.rejects(f.run({apply:true}));});
test('missing credentials are refused without API requests',async()=>{const f=fixture();await assert.rejects(f.run({token:''}),/CLOUDFLARE_TOKEN_REQUIRED/);assert.equal(f.calls.length,0);});
