import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {domainImportDnsResponse as handle} from './domain-import-dns.mjs';
import {buildBackup} from '../shared/domain-dns-records.mjs';
const ID='IMP-'+'a'.repeat(40),USER='11111111-2222-3333-4444-555555555555',ZID='b'.repeat(32),RID='c'.repeat(32);
const env=(x={})=>({DOMAIN_IMPORT_ENABLED:'true',SUPABASE_URL:'https://polvmlrhqoiflumibfqs.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'srv',SUPABASE_PUBLISHABLE_KEY:'pub',...x});
const J=(o,s=200)=>new Response(JSON.stringify(o),{status:s});
const order=(o={})=>({order_id:ID,user_id:USER,domain:'example.com',mode:'nameserver',payment_state:'paid',import_state:'zone_active',zone_id:ZID,zone_status:'active',review_reason:null,...o});
const A={id:RID,type:'A',name:'example.com',content:'1.2.3.4',ttl:1,proxied:false},NS={id:'d'.repeat(32),type:'NS',name:'example.com',content:'x.ns.cloudflare.com',ttl:1};
function world(o={}){
 const calls={adapter:[],journal:null};const row=o.order===undefined?order():o.order;
 const f=async u=>{const t=new URL(String(u));
  if(t.pathname==='/auth/v1/user')return o.noUser?J({},401):J({id:USER});
  if(t.pathname==='/rest/v1/domain_import_orders')return J(row&&t.searchParams.get('user_id')==='eq.'+(o.owner??USER)?[row]:[]);
  throw Error('unexpected '+t);};
 const adapter={findZone:async d=>{calls.adapter.push(['findZone',d]);return {id:o.zoneId??ZID,name:d,status:o.zoneStatus??'active'};},
  listRecords:async()=>{calls.adapter.push(['list']);return [A,NS];},
  createRecord:async(z,r)=>{calls.adapter.push(['create',z,r]);return {id:'e'.repeat(32),...r};},
  updateRecord:async(z,id,r)=>{calls.adapter.push(['update',z,id,r]);return {id,...r};},
  deleteRecord:async(z,id)=>{calls.adapter.push(['delete',z,id]);},
  getDnssec:async()=>({status:'disabled',ds:null}),
  setDnssec:async(z,e)=>{calls.adapter.push(['dnssec',z,e]);return {status:'pending',ds:null};},
  runOperation:async(z,plan,mutate)=>{calls.adapter.push(['op',plan]);await mutate(adapter);}};
 return {f,calls,factory:(e,opts)=>{calls.journal=opts.journal;return adapter;}};
}
const U='https://ngeblogging.com/api/commerce/domains/manage/'+ID+'/';
const req=(p,{method='GET',body,headers={}}={})=>new Request(U+p,{method,headers:{authorization:'Bearer t',...(method!=='GET'?{origin:'https://ngeblogging.com'}:{}),...(body!==undefined?{'content-type':'application/json'}:{}),...headers},body:body===undefined?undefined:JSON.stringify(body)});
const run=(r,e,w)=>handle(r,e,{fetchImpl:w.f,adapterFactory:w.factory});
const mutating=w=>w.calls.adapter.filter(c=>['create','update','delete','dnssec','op'].includes(c[0])).length;
test('other paths, purchase order ids and malformed ids are not handled',async()=>{
 for(const p of ['https://ngeblogging.com/api/commerce/domains/manage/DOM-'+'a'.repeat(40)+'/dns','https://ngeblogging.com/api/commerce/domains/manage/IMP-short/dns','https://ngeblogging.com/api/commerce/domains/manage/import/orders','https://ngeblogging.com/api/commerce/domains/manage/'+ID+'/other','https://ngeblogging.com/api/commerce/domains/manage/'+ID])assert.equal(await handle(new Request(p),env(),{}),null,p);});
test('gates: flag, origin, auth, content type, method, https host',async()=>{const w=world();
 assert.equal((await run(req('dns'),env({DOMAIN_IMPORT_ENABLED:'false'}),w)).status,503);
 assert.equal((await run(req('dns',{method:'POST',body:{},headers:{origin:'https://evil.test'}}),env(),w)).status,403);
 assert.equal((await run(req('dns',{headers:{authorization:''}}),env(),w)).status,401);
 assert.equal((await run(new Request(U+'dns',{method:'POST',headers:{authorization:'Bearer t',origin:'https://ngeblogging.com','content-type':'text/plain'},body:'x'}),env(),w)).status,415);
 assert.equal((await run(req('backup',{method:'POST',body:{}}),env(),w)).status,405);
 assert.equal((await run(new Request(U.replace('https://ngeblogging.com','https://example.org')+'dns',{headers:{authorization:'Bearer t'}}),env(),w)).status,404);
 assert.equal((await run(req('dns'),env({SUPABASE_URL:'https://evil.supabase.co'}),w)).status,503);
 assert.equal(w.calls.adapter.length,0);});
test('invalid session is 401, foreign or unknown order is 404, neither reaches the adapter',async()=>{
 let w=world({noUser:true});assert.equal((await run(req('dns'),env(),w)).status,401);
 w=world({owner:'99999999-2222-3333-4444-555555555555'});assert.equal((await run(req('dns'),env(),w)).status,404);
 w=world({order:null});assert.equal((await run(req('dns'),env(),w)).status,404);assert.equal(w.calls.adapter.length,0);});
test('orders that are not paid and zone-active are refused before Cloudflare',async()=>{
 for(const [o,status,code] of [[{payment_state:'unpaid'},409,'IMPORT_DNS_NOT_READY'],[{payment_state:'pending'},409,'IMPORT_DNS_NOT_READY'],[{import_state:'awaiting_nameservers'},409,'IMPORT_DNS_NOT_READY'],[{zone_status:'pending'},409,'IMPORT_DNS_NOT_READY'],[{zone_id:null},409,'IMPORT_DNS_NOT_READY'],[{mode:'transfer'},409,'IMPORT_DNS_NOT_READY'],[{review_reason:'ZONE_MISMATCH'},409,'IMPORT_ORDER_UNDER_REVIEW'],[{domain:'ngeblogging.com'},503,'DOMAIN_DNS_UNVERIFIED'],[{domain:'a.ngeblogging.com'},503,'DOMAIN_DNS_UNVERIFIED'],[{domain:'Example.com'},503,'DOMAIN_DNS_UNVERIFIED']]){
  const w=world({order:order(o)});const r=await run(req('dns'),env(),w);assert.equal(r.status,status,JSON.stringify(o));assert.equal((await r.json()).code,code);assert.equal(w.calls.adapter.length,0);}});
test('a zone that differs from the one recorded on the order is refused',async()=>{
 let w=world({zoneId:'f'.repeat(32)});let r=await run(req('dns',{method:'POST',body:{type:'A',name:'@',content:'1.2.3.4'}}),env(),w);assert.equal(r.status,409);assert.equal((await r.json()).code,'IMPORT_ZONE_MISMATCH');assert.equal(mutating(w),0);
 w=world({zoneStatus:'pending'});r=await run(req('dns'),env(),w);assert.equal(r.status,409);assert.equal((await r.json()).code,'IMPORT_ZONE_NOT_ACTIVE');});
test('list shows only editable record types and passes a journal scoped to the order',async()=>{const w=world();const r=await run(req('dns'),env(),w);assert.equal(r.status,200);const b=await r.json();assert.deepEqual(b.records.map(x=>x.type),['A']);assert.equal(b.domain,'example.com');assert.equal(w.calls.journal.orderId,ID);assert.equal(w.calls.journal.userId,USER);assert.equal(w.calls.journal.domain,'example.com');assert.ok(Number.isFinite(Date.parse(w.calls.journal.checkedAt)));});
test('create validates the record, then creates it in the recorded zone',async()=>{
 let w=world();let r=await run(req('dns',{method:'POST',body:{type:'A',name:'www',content:'5.6.7.8'}}),env(),w);assert.equal(r.status,201);assert.deepEqual(w.calls.adapter.find(c=>c[0]==='create').slice(1),[ZID,{type:'A',name:'www.example.com',content:'5.6.7.8',ttl:1,proxied:false}]);
 w=world();r=await run(req('dns',{method:'POST',body:{type:'A',name:'www',content:'999.1.1.1'}}),env(),w);assert.equal(r.status,422);assert.equal((await r.json()).code,'INVALID_RECORD_CONTENT');assert.equal(mutating(w),0);
 w=world();r=await run(req('dns',{method:'POST',body:{type:'NS',name:'@',content:'x.com'}}),env(),w);assert.equal(r.status,422);assert.equal(mutating(w),0);});
test('update and delete work on editable records only and 404 otherwise',async()=>{
 let w=world();let r=await run(req('dns/'+RID,{method:'PATCH',body:{type:'A',name:'@',content:'9.9.9.9'}}),env(),w);assert.equal(r.status,200);assert.equal(w.calls.adapter.find(c=>c[0]==='update')[2],RID);
 w=world();r=await run(req('dns/'+RID,{method:'DELETE'}),env(),w);assert.equal(r.status,200);assert.equal(w.calls.adapter.find(c=>c[0]==='delete')[2],RID);
 w=world();r=await run(req('dns/'+'d'.repeat(32),{method:'DELETE'}),env(),w);assert.equal(r.status,404);assert.equal(mutating(w),0);
 w=world();r=await run(req('dns/'+'9'.repeat(32),{method:'DELETE'}),env(),w);assert.equal(r.status,404);assert.equal(mutating(w),0);});
test('backup returns a backup of this domain only',async()=>{const r=await run(req('backup'),env(),world());assert.equal(r.status,200);const b=await r.json();assert.equal(b.backup.zone,'example.com');assert.equal(b.backup.records.length,1);});
test('dnssec read, enable needs confirmation, disable is refused',async()=>{
 let w=world();assert.equal((await run(req('dnssec'),env(),w)).status,200);
 assert.equal((await run(req('dnssec',{method:'POST',body:{enabled:true}}),env(),w)).status,400);assert.equal(mutating(w),0);
 assert.equal((await run(req('dnssec',{method:'POST',body:{enabled:false,confirm:true}}),env(),w)).status,409);assert.equal(mutating(w),0);
 const r=await run(req('dnssec',{method:'POST',body:{enabled:true,confirm:true}}),env(),w);assert.equal(r.status,200);assert.equal(mutating(w),1);});
test('restore previews first, refuses a stale plan, and applies through the journaled operation',async()=>{
 const backup=buildBackup('example.com',[A]);backup.records.push({id:'',type:'TXT',name:'example.com',content:'hello',ttl:1,proxied:false});
 let w=world();let r=await run(req('restore',{method:'POST',body:{backup}}),env(),w);assert.equal(r.status,200);const p=await r.json();assert.equal(p.applied,false);assert.equal(p.summary.create,1);assert.equal(mutating(w),0);
 r=await run(req('restore',{method:'POST',body:{backup,apply:true,planHash:'0'.repeat(64)}}),env(),w);assert.equal(r.status,409);assert.equal(mutating(w),0);
 r=await run(req('restore',{method:'POST',body:{backup,apply:true,planHash:p.planHash}}),env(),w);assert.equal(r.status,200);const d=await r.json();assert.equal(d.applied,true);assert.equal(d.done.create,1);assert.equal(w.calls.adapter.filter(c=>c[0]==='op').length,1);
 w=world();r=await run(req('restore',{method:'POST',body:{backup:{...backup,zone:'other.com'}}}),env(),w);assert.equal(r.status,422);assert.equal((await r.json()).code,'INVALID_BACKUP');});
test('modules never touch purchase tables, purchase journal or purchase RPCs',()=>{
 for(const f of ['./domain-import-dns.mjs','./domain-import-dns-adapter.mjs']){const s=readFileSync(new URL(f,import.meta.url),'utf8');assert.equal(/domain_purchase|domain_sale_quotes|domain_registration_jobs|account_domain_dns|registrar\/registrations|CLOUDFLARE_REGISTRAR/.test(s),false,f);}});
