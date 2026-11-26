import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {domainImportTransferResponse as handle} from './domain-import-transfer.mjs';
const ID='IMP-'+'a'.repeat(40),USER='11111111-2222-3333-4444-555555555555',ACC='095e57b46e7ba7f6b188480d9e4e5fe7',ZID='b'.repeat(32),EPP='Zx9!secretEPPcode';
const env=(x={})=>({DOMAIN_IMPORT_ENABLED:'true',DOMAIN_IMPORT_TRANSFER_ENABLED:'true',SUPABASE_URL:'https://polvmlrhqoiflumibfqs.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'srv',SUPABASE_PUBLISHABLE_KEY:'pub',CLOUDFLARE_ACCOUNT_ID:ACC,CLOUDFLARE_DOMAIN_API_TOKEN:'cf-token',...x});
const J=(o,s=200)=>new Response(JSON.stringify(o),{status:s});
const REG={name:'Budi Santoso',email:'budi@example.com',phone:'+62.81234567890',street:'Jl. Merdeka 1',city:'Jakarta',state:'DKI Jakarta',postalCode:'10110',countryCode:'ID'};
const order=(o={})=>({order_id:ID,domain:'example.com',mode:'transfer',price_idr:150000,payment_state:'paid',import_state:'zone_active',transfer_status:null,zone_id:ZID,zone_status:'active',review_reason:null,updated_at:new Date(0).toISOString(),...o});
const zone=(o={})=>({id:ZID,name:'example.com',status:'active',account:{id:ACC},name_servers:['a.ns.cloudflare.com','b.ns.cloudflare.com'],original_name_servers:['ns1.old.com'],...o});
function world(o={}){
 const calls={rpc:[],cf:[],log:[]};let row=o.order===undefined?order():o.order;
 const f=async(u,opt={})=>{const t=new URL(String(u));
  if(t.pathname==='/auth/v1/user')return J({id:USER});
  if(t.pathname==='/rest/v1/domain_import_orders'){if(t.searchParams.get('select')==='order_id')return J(o.open??[]);return J(row&&t.searchParams.get('user_id')==='eq.'+(o.owner??USER)?[row]:[]);}
  if(t.pathname==='/rest/v1/domain_import_transfer_prices')return J(o.prices===undefined?[{tld:'com',price_idr:150000}]:o.prices);
  if(t.pathname.startsWith('/rest/v1/rpc/')){const name=t.pathname.split('/').pop(),args=JSON.parse(opt.body);calls.rpc.push({name,args});
   if(name==='domain_import_create_v1')return o.createFail?J({message:'IMPORT_DOMAIN_ALREADY_CLAIMED'},409):J(ID);
   if(name==='domain_import_set_transfer_v2'&&o.rejectStatus?.includes(args.p_transfer_status))return J({message:'IMPORT_ORDER_NOT_UPDATABLE'},400);
   return new Response(null,{status:204});}
  if(t.hostname==='api.cloudflare.com'){calls.cf.push({method:opt.method,path:t.pathname,body:opt.body?JSON.parse(opt.body):null});
   if(o.cfThrow)throw Error('network');
   const r=opt.method==='POST'?o.cfPost:o.cfGet;return r?J(r.body,r.status):J({result:{state:'pending'}},202);}
  throw Error('unexpected '+t);};
 const provider={normalizeZoneName:x=>{const v=String(x).trim().toLowerCase();if(v.startsWith('www.'))throw Error('x');return v;},fullZoneProviderReady:()=>true,findFullZone:async()=>o.existingZone??null,createFullZone:async()=>{if(o.createZoneFail)throw Error('x');return o.createdZone??zone({status:'pending'});},getFullZoneStatus:async()=>o.liveZone??zone(),publicZoneState:z=>({id:z.id,name:z.name,status:z.status,nameServers:z.name_servers||[],originalNameServers:z.original_name_servers||[]})};
 return {f,calls,provider,deps:{fetchImpl:f,provider,now:()=>o.now??Date.now(),warnImpl:x=>calls.log.push(JSON.stringify(x))}};
}
const req=(path,b,h={})=>new Request('https://ngeblogging.com/api/commerce/domains/manage/import/transfer/'+path,{method:'POST',headers:{origin:'https://ngeblogging.com',authorization:'Bearer t','content-type':'application/json',...h},body:JSON.stringify(b)});
const run=(path,b,e,w,h)=>handle(req(path,b,h),e,w.deps);
const submitBody=(x={})=>({orderId:ID,eppCode:EPP,registrant:REG,...x});
test('other paths are not handled',async()=>{assert.equal(await handle(new Request('https://ngeblogging.com/api/commerce/domains/manage/import/zone',{method:'POST'}),env(),{}),null);assert.equal(await handle(new Request('https://ngeblogging.com/api/commerce/domains/manage/import/transfer/__proto__',{method:'POST'}),env(),{}),null);});
test('gates: both flags, origin, auth, config',async()=>{const w=world();
 assert.equal((await run('orders',{domain:'example.com'},env({DOMAIN_IMPORT_TRANSFER_ENABLED:'false'}),w)).status,503);
 assert.equal((await run('orders',{domain:'example.com'},env({DOMAIN_IMPORT_ENABLED:'false'}),w)).status,503);
 assert.equal((await run('orders',{domain:'example.com'},env(),w,{origin:'https://evil.test'})).status,403);
 assert.equal((await run('orders',{domain:'example.com'},env(),w,{authorization:''})).status,401);
 assert.equal((await run('orders',{domain:'example.com'},env({CLOUDFLARE_DOMAIN_API_TOKEN:''}),w)).status,503);
 assert.equal(w.calls.rpc.length+w.calls.cf.length,0);});
test('create order: price comes from the table, mode is transfer',async()=>{const w=world();const r=await run('orders',{domain:' Example.COM '},env(),w);assert.equal(r.status,201);const b=await r.json();assert.equal(b.order.priceIdr,150000);assert.deepEqual(w.calls.rpc,[{name:'domain_import_create_v1',args:{p_user_id:USER,p_domain:'example.com',p_mode:'transfer',p_price_idr:150000}}]);});
test('create order refuses unsupported TLDs, subdomains and unpriced TLDs',async()=>{
 for(const d of ['example.id','example.co.id','example.my.id','example.xyz']){const w=world();assert.equal((await run('orders',{domain:d},env(),w)).status,d.endsWith('.xyz')||d==='example.id'?409:400,d);assert.equal(w.calls.rpc.length,0);}
 let w=world();assert.equal((await run('orders',{domain:'blog.example.com'},env(),w)).status,400);
 w=world({prices:[]});let r=await run('orders',{domain:'example.com'},env(),w);assert.equal(r.status,409);assert.equal((await r.json()).code,'IMPORT_TRANSFER_PRICE_NOT_SET');assert.equal(w.calls.rpc.length,0);
 w=world({prices:[{tld:'com',price_idr:0}]});assert.equal((await run('orders',{domain:'example.com'},env(),w)).status,409);
 w=world({open:Array(5).fill({order_id:ID})});assert.equal((await run('orders',{domain:'example.com'},env(),w)).status,429);
 w=world({existingZone:zone()});assert.equal((await run('orders',{domain:'example.com'},env(),w)).status,409);assert.equal(w.calls.rpc.length,0);
 w=world({createFail:true});assert.equal((await run('orders',{domain:'example.com'},env(),w)).status,409);});
test('zone: needs payment, creates and records with the v2 function',async()=>{
 let w=world({order:order({payment_state:'unpaid',import_state:'created',zone_id:null})});assert.equal((await run('zone',{orderId:ID},env(),w)).status,409);assert.equal(w.calls.rpc.length,0);
 w=world({order:order({import_state:'created',zone_id:null,zone_status:null})});const r=await run('zone',{orderId:ID},env(),w);assert.equal(r.status,200);assert.equal(w.calls.rpc[0].name,'domain_import_record_zone_v2');assert.equal(w.calls.rpc[0].args.p_zone_id,ZID);
 w=world({order:order({import_state:'created',zone_id:null}),existingZone:zone()});assert.equal((await run('zone',{orderId:ID},env(),w)).status,409);assert.equal(w.calls.rpc[0].name,'domain_import_flag_review_v1');
 w=world({order:order({mode:'nameserver'})});assert.equal((await run('zone',{orderId:ID},env(),w)).status,409);});
test('submit validates EPP and registrant before touching anything',async()=>{
 for(const b of [submitBody({eppCode:'ab'}),submitBody({eppCode:'has space1'}),submitBody({registrant:{...REG,phone:'081234'}}),submitBody({registrant:{...REG,email:'x'}}),submitBody({registrant:{...REG,countryCode:'id'}}),submitBody({registrant:{...REG,extra:1}}),submitBody({privacyMode:'weird'}),{orderId:ID,eppCode:EPP,registrant:REG,x:1}]){const w=world();const r=await run('submit',b,env(),w);assert.equal(r.status,400);assert.equal(w.calls.rpc.length+w.calls.cf.length,0);}});
test('submit refuses orders that are unpaid, under review, wrong state or already sent',async()=>{
 for(const o of [{payment_state:'unpaid'},{review_reason:'X'},{import_state:'awaiting_nameservers'},{import_state:'transfer_requested'},{transfer_status:'pending',import_state:'transfer_pending'}]){const w=world({order:order(o)});const r=await run('submit',submitBody(),env(),w);assert.equal(r.status,409);assert.equal(w.calls.rpc.length+w.calls.cf.length,0);}
 const w=world({liveZone:zone({status:'pending'})});assert.equal((await run('submit',submitBody(),env(),w)).status,409);assert.equal(w.calls.rpc.length+w.calls.cf.length,0);
 const x=world({liveZone:zone({name:'other.com'})});assert.equal((await run('submit',submitBody(),env(),x)).status,409);assert.equal(x.calls.cf.length,0);});
test('submit claims first, then sends base64 EPP once; EPP never stored, logged or echoed',async()=>{
 const w=world();const r=await run('submit',submitBody({privacyMode:'off'}),env(),w);const text=await r.text();assert.equal(r.status,202);
 assert.equal(w.calls.rpc[0].name,'domain_import_set_transfer_v2');assert.equal(w.calls.rpc[0].args.p_transfer_status,'submitted');assert.equal(w.calls.rpc[0].args.p_registrar_ref,'/accounts/'+ACC+'/registrar/registrations/example.com');
 assert.equal(w.calls.cf.length,1);assert.equal(w.calls.cf[0].path,'/client/v4/accounts/'+ACC+'/registrar/registrations/example.com/transfer-in');
 assert.equal(w.calls.cf[0].body.auth_code,Buffer.from(EPP).toString('base64'));assert.equal(w.calls.cf[0].body.privacy_mode,'off');assert.equal(w.calls.cf[0].body.contacts.registrant.postal_info.address.country_code,'ID');
 assert.equal(w.calls.rpc[1].args.p_transfer_status,'pending');
 const everything=JSON.stringify(w.calls.rpc)+w.calls.log.join('')+text;assert.equal(everything.includes(EPP),false);assert.equal(everything.includes(Buffer.from(EPP).toString('base64')),false);});
test('refused claim means no Cloudflare call',async()=>{const w=world({rejectStatus:['submitted']});const r=await run('submit',submitBody(),env(),w);assert.equal(r.status,409);assert.equal(w.calls.cf.length,0);});
test('Cloudflare 4xx marks failed; 5xx or network error stays unclear without failing',async()=>{
 let w=world({cfPost:{status:400,body:{errors:[{message:'Domain not found'}]}}});let r=await run('submit',submitBody(),env(),w);assert.equal(r.status,422);assert.equal(w.calls.rpc.at(-1).args.p_transfer_status,'failed');
 w=world({cfPost:{status:502,body:{}}});r=await run('submit',submitBody(),env(),w);assert.equal(r.status,503);assert.equal((await r.json()).code,'IMPORT_TRANSFER_SUBMIT_UNCLEAR');assert.equal(w.calls.rpc.length,1);
 w=world({cfThrow:true});r=await run('submit',submitBody(),env(),w);assert.equal(r.status,503);assert.equal((await r.json()).code,'IMPORT_TRANSFER_SUBMIT_UNCLEAR');assert.equal(w.calls.rpc.length,1);assert.equal((w.calls.log.join('')+JSON.stringify(w.calls.rpc)).includes(EPP),false);
 w=world({cfPost:{status:409,body:{errors:[{message:'A workflow already exists for this resource. Use GET status to check its progress.'}]}}});r=await run('submit',submitBody(),env(),w);assert.equal(r.status,202);assert.equal(w.calls.rpc.length,1);});
test('status maps Cloudflare states and records them',async()=>{
 const base={import_state:'transfer_requested',transfer_status:'submitted'};
 for(const [cfState,local,extra] of [['succeeded','completed',{completed:true}],['blocked','pending',{}],['in_progress','pending',{}],['action_required','pending',{actionRequired:true}],['failed','failed',{}]]){
  const w=world({order:order(base),cfGet:{status:200,body:{result:{state:cfState,error:cfState==='failed'?{code:'transfer_rejected',message:'Transfer rejected'}:undefined}}}});
  const r=await run('status',{orderId:ID},env(),w);const b=await r.json();assert.equal(r.status,200);assert.equal(b.transfer.state,cfState);assert.equal(w.calls.rpc.at(-1).args.p_transfer_status,local);for(const [k,v] of Object.entries(extra))assert.equal(b.transfer[k],v);}});
test('status does not call Cloudflare for non-transfer states and throttles pending polls',async()=>{
 for(const s of ['zone_active','completed','needs_review','awaiting_nameservers']){const w=world({order:order({import_state:s})});const r=await run('status',{orderId:ID},env(),w);assert.equal(r.status,200);assert.equal(w.calls.cf.length+w.calls.rpc.length,0);}
 const t=Date.now();const w=world({order:order({import_state:'transfer_pending',transfer_status:'pending',updated_at:new Date(t-5000).toISOString()}),now:t});const r=await run('status',{orderId:ID},env(),w);assert.equal((await r.json()).throttled,true);assert.equal(w.calls.cf.length,0);});
test('status flags a submitted order whose workflow never appeared',async()=>{
 const t=Date.now();let w=world({order:order({import_state:'transfer_requested',transfer_status:'submitted',updated_at:new Date(t-60000).toISOString()}),now:t,cfGet:{status:404,body:{errors:[{message:'No workflow found'}]}}});let r=await run('status',{orderId:ID},env(),w);assert.equal(r.status,200);assert.equal((await r.json()).transfer.state,'unconfirmed');assert.equal(w.calls.rpc.length,0);
 w=world({order:order({import_state:'transfer_requested',transfer_status:'submitted',updated_at:new Date(t-3600000).toISOString()}),now:t,cfGet:{status:404,body:{errors:[{message:'No workflow found'}]}}});r=await run('status',{orderId:ID},env(),w);assert.equal(r.status,409);assert.equal(w.calls.rpc[0].name,'domain_import_flag_review_v1');});
test('foreign order is 404 and never reaches Cloudflare',async()=>{const w=world({owner:'99999999-2222-3333-4444-555555555555'});for(const p of ['zone','submit','status']){const r=await run(p,p==='submit'?submitBody():{orderId:ID},env(),w);assert.equal(r.status,404);}assert.equal(w.calls.cf.length+w.calls.rpc.length,0);});
test('module never touches purchase tables, purchase RPCs or stores the code',()=>{const s=readFileSync(new URL('./domain-import-transfer.mjs',import.meta.url),'utf8');assert.equal(/domain_purchase|domain_record_production|domain_begin_|domain_observe|DOMAIN_CUSTOMER_PRODUCTION|console\.(log|info|error)/i.test(s),false);assert.equal(/p_epp(?!_submitted)|eppCode['"]?\s*:\s*epp|auth_code[^,}]*(warn|log)/i.test(s),false);});

import {domainImportRouterResponse as route} from './domain-import-router.mjs';
test('router reaches the transfer module without the zone-exists guard and leaves nameserver orders alone',async()=>{
 let zone=0,transfer=0;
 const deps={fetchImpl:async()=>J({id:USER}),zoneExists:async()=>{zone++;return true;},orders:async()=>null,payment:async()=>null,status:async()=>null,transfer:async()=>{transfer++;return new Response('{}',{status:200});},zone:async()=>null};
 const r=await route(req('orders',{domain:'example.com'}),env(),deps);assert.equal(r.status,200);assert.equal(transfer,1);assert.equal(zone,0);
 const plain=new Request('https://ngeblogging.com/api/commerce/domains/manage/import/orders',{method:'POST',headers:{origin:'https://ngeblogging.com',authorization:'Bearer t','content-type':'application/json'},body:JSON.stringify({domain:'x.com',mode:'nameserver'})});
 const r2=await route(plain,env(),{...deps,orders:async()=>new Response('{}',{status:201})});assert.equal(r2.status,409);assert.equal(transfer,1);assert.equal(zone,1);
});
