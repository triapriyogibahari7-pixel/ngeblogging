import test from 'node:test';
import assert from 'node:assert/strict';
import {createImportJournaledDnsAdapter as make} from './domain-import-dns-adapter.mjs';
const USER='11111111-2222-3333-4444-555555555555',ID='IMP-'+'a'.repeat(40),ZID='b'.repeat(32),OP='22222222-3333-4444-5555-666666666666';
const env=(x={})=>({CLOUDFLARE_DOMAIN_API_TOKEN:'tok',SUPABASE_URL:'https://polvmlrhqoiflumibfqs.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'srv',...x});
const journal=(x={})=>({userId:USER,orderId:ID,domain:'example.com',checkedAt:new Date().toISOString(),...x});
const J=(o,s=200)=>new Response(JSON.stringify(o),{status:s});
function world(o={}){
 const calls={rpc:[],cf:[]};let store=[{id:'1'.repeat(32),type:'A',name:'example.com',content:'1.1.1.1',ttl:1,proxied:false}];
 const f=async(u,opt={})=>{const t=new URL(String(u));
  if(t.pathname.startsWith('/rest/v1/rpc/')){const name=t.pathname.split('/rpc/')[1],args=JSON.parse(opt.body);calls.rpc.push([name,args]);
   const err=o.rpcError?.[name];if(err)return J({message:err},409);
   if(name==='domain_import_dns_prepare_v2')return J(OP);
   if(name==='domain_import_dns_claim_v2')return J({});
   return new Response(null,{status:204});}
  if(t.hostname==='api.cloudflare.com'){const m=opt.method||'GET';calls.cf.push([m,t.pathname]);
   if(m==='GET')return J({success:true,result:store,result_info:{total_pages:1}});
   if(o.cfReject)return J({success:false,errors:[{message:'bad'}]},400);
   if(m==='POST'){const r={id:'2'.repeat(32),...JSON.parse(opt.body)};if(!o.cfNoApply)store=[...store,r];return J({success:true,result:r});}
   if(m==='DELETE'){store=store.filter(r=>!t.pathname.endsWith(r.id));return J({success:true,result:{}});}
   return J({success:true,result:{}});}
  throw Error('unexpected '+t);};
 return {f,calls};
}
const rec={type:'A',name:'www.example.com',content:'2.2.2.2',ttl:1,proxied:false};
const mutations=w=>w.calls.cf.filter(c=>c[0]!=='GET').length;
test('create is journaled with the import v2 functions in order, and finishes succeeded',async()=>{
 const w=world(),a=make(env(),{fetchImpl:w.f,journal:journal()});const r=await a.createRecord(ZID,rec);assert.equal(r.id,'2'.repeat(32));
 assert.deepEqual(w.calls.rpc.map(x=>x[0]),['domain_import_dns_prepare_v2','domain_import_dns_claim_v2','domain_import_dns_finish_v2']);
 const [p,c,fin]=w.calls.rpc.map(x=>x[1]);assert.equal(p.p_order_id,ID);assert.equal(p.p_zone_id,ZID);assert.equal(p.p_kind,'dns_records');assert.equal(p.p_snapshot.records.length,1);assert.equal(p.p_checked_at,c.p_checked_at);assert.equal(c.p_operation_id,OP);assert.equal(c.p_confirmation_domain,'example.com');assert.equal(fin.p_state,'succeeded');assert.equal(fin.p_provider_verified,true);assert.equal(p.p_before_sha256,c.p_current_sha256);
 assert.equal(JSON.stringify(w.calls.rpc).includes('account_domain_dns'),false);assert.equal(JSON.stringify(Object.keys(p)).includes('registration'),false);});
test('provider rejection with unchanged zone is recorded failed and rethrown',async()=>{
 const w=world({cfReject:true}),a=make(env(),{fetchImpl:w.f,journal:journal()});
 await assert.rejects(a.createRecord(ZID,rec),e=>e.code==='DNS_PROVIDER_REJECTED');
 assert.equal(w.calls.rpc.at(-1)[0],'domain_import_dns_finish_v2');assert.equal(w.calls.rpc.at(-1)[1].p_state,'failed');});
test('a change that cannot be verified is recorded outcome_unknown',async()=>{
 const w=world({cfNoApply:true}),a=make(env(),{fetchImpl:w.f,journal:journal()});
 await assert.rejects(a.createRecord(ZID,rec),e=>e.code==='DNS_OUTCOME_UNCONFIRMED');
 assert.equal(w.calls.rpc.at(-1)[1].p_state,'outcome_unknown');assert.equal(w.calls.rpc.at(-1)[1].p_after_sha256,null);});
test('journal refusals stop before any Cloudflare change',async()=>{
 let w=world({rpcError:{domain_import_dns_prepare_v2:'DNS_CURRENT_REGISTRATION_REQUIRED'}});let a=make(env(),{fetchImpl:w.f,journal:journal()});
 await assert.rejects(a.createRecord(ZID,rec),e=>e.code==='DNS_CURRENT_REGISTRATION_REQUIRED'&&e.status===403);assert.equal(mutations(w),0);
 w=world({rpcError:{domain_import_dns_claim_v2:'DNS_ZONE_OPERATION_LOCKED'}});a=make(env(),{fetchImpl:w.f,journal:journal()});
 await assert.rejects(a.deleteRecord(ZID,'1'.repeat(32)),e=>e.code==='DNS_ZONE_OPERATION_LOCKED'&&e.status===409);assert.equal(mutations(w),0);});
test('missing or purchase-style journal data is refused without any network call',async()=>{
 for(const j of [undefined,journal({orderId:'DOM-'+'a'.repeat(40)}),journal({userId:'x'}),journal({checkedAt:'nope'})]){
  const w=world(),a=make(env(),{fetchImpl:w.f,journal:j});await assert.rejects(a.createRecord(ZID,rec),e=>e.code==='DNS_JOURNAL_UNAVAILABLE');assert.equal(w.calls.rpc.length+w.calls.cf.length,0);}
 const w=world(),a=make(env({SUPABASE_URL:'https://evil.supabase.co'}),{fetchImpl:w.f,journal:journal()});await assert.rejects(a.createRecord(ZID,rec),e=>e.code==='DNS_JOURNAL_UNAVAILABLE');assert.equal(w.calls.rpc.length,0);});
test('delete is journaled and verified',async()=>{const w=world(),a=make(env(),{fetchImpl:w.f,journal:journal()});await a.deleteRecord(ZID,'1'.repeat(32));assert.equal(w.calls.rpc.at(-1)[1].p_state,'succeeded');assert.equal(mutations(w),1);});
