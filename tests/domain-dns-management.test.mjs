import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeRecord,planRestore,buildBackup,validateBackup} from '../shared/domain-dns-records.mjs';
import {domainDnsManagementResponse as handler} from '../server/domain-dns-management-handler.mjs';
import {createDnsAdapter} from '../server/domain-dns-cloudflare-adapter.mjs';
const Z='example.id',owner='11111111-1111-4111-8111-111111111111',ORD='DOM-'+'a'.repeat(40),QID='33333333-3333-4333-8333-333333333333',ZID='b'.repeat(32),RID='c'.repeat(32);
const env={DOMAIN_ORDER_ENV:'production',SUPABASE_URL:'https://polvmlrhqoiflumibfqs.supabase.co',SUPABASE_PUBLISHABLE_KEY:'p',SUPABASE_SERVICE_ROLE_KEY:'s',CLOUDFLARE_DOMAIN_API_TOKEN:'tok',CLOUDFLARE_ACCOUNT_ID:'095e57b46e7ba7f6b188480d9e4e5fe7'};
test('record validation',()=>{
 assert.deepEqual(normalizeRecord(Z,{type:'a',name:'www',content:'1.2.3.4'}),{type:'A',name:'www.example.id',content:'1.2.3.4',ttl:1,proxied:false});
 for(const bad of [{type:'NS',name:'@',content:'x.com'},{type:'A',name:'@',content:'999.1.1.1'},{type:'CNAME',name:'@',content:'a.com'},{type:'TXT',name:'@',content:'x',proxied:true},{type:'MX',name:'@',content:'mail.x.com'},{type:'A',name:'a b',content:'1.1.1.1'},{type:'A',name:'@',content:'1.1.1.1',ttl:30}])assert.throws(()=>normalizeRecord(Z,bad));
 assert.equal(normalizeRecord(Z,{type:'MX',name:'@',content:'Mail.X.com.',priority:10}).content,'mail.x.com');
});
test('restore plan creates, updates, and deletes only on request',()=>{
 const cur=[{id:'1',type:'A',name:Z,content:'1.1.1.1',ttl:1,proxied:false},{id:'2',type:'TXT',name:Z,content:'extra',ttl:1,proxied:false},{id:'3',type:'NS',name:Z,content:'ns',ttl:1}];
 const bk={...buildBackup(Z,[{id:'1',type:'A',name:Z,content:'2.2.2.2',ttl:1,proxied:false},{id:'9',type:'A',name:'w.'+Z,content:'3.3.3.3',ttl:1,proxied:false}])};
 let p=planRestore(Z,cur,bk);assert.equal(p.create.length,1);assert.equal(p.update.length,1);assert.equal(p.remove.length,0);
 p=planRestore(Z,cur,bk,{removeExtra:true});assert.deepEqual(p.remove.map(r=>r.id),['2']);
 assert.throws(()=>validateBackup('other.id',bk));
});
function fixture({registered=true,store=[{id:RID,type:'A',name:Z,content:'1.1.1.1',ttl:1,proxied:false}],dnssec='disabled'}={}){
 const calls=[];let records=[...store];
 const j=(b,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{'content-type':'application/json'}});
 const fetchImpl=async(input,init={})=>{const u=new URL(input);calls.push({u,init});
  if(u.pathname==='/auth/v1/user')return init.headers.authorization==='Bearer good'?j({id:owner}):j({},401);
  if(u.pathname==='/rest/v1/domain_purchase_orders'){assert.equal(u.searchParams.get('user_id'),'eq.'+owner);return j([{order_id:ORD,user_id:owner,quote_id:QID,environment:'production',payment_state:'paid',registration_state:registered?'registered':'queued'}]);}
  if(u.pathname==='/rest/v1/domain_sale_quotes')return j([{id:QID,user_id:owner,environment:'production',domain:Z}]);
  assert.equal(u.origin,'https://api.cloudflare.com');assert.equal(init.headers.authorization,'Bearer tok');const path=u.pathname.replace('/client/v4','');
  if(path==='/zones')return j({success:true,result:[{id:ZID,name:Z,type:'full',status:'active',account:{id:env.CLOUDFLARE_ACCOUNT_ID}}]});
  if(path==='/zones/'+ZID+'/dns_records'&&init.method==='GET')return j({success:true,result:records,result_info:{total_pages:1}});
  if(path==='/zones/'+ZID+'/dns_records'&&init.method==='POST'){const r={id:'d'.repeat(32),...JSON.parse(init.body)};records.push(r);return j({success:true,result:r});}
  if(path==='/zones/'+ZID+'/dns_records/'+RID&&init.method==='PATCH'){const r={id:RID,...JSON.parse(init.body)};records=records.map(x=>x.id===RID?r:x);return j({success:true,result:r});}
  if(path==='/zones/'+ZID+'/dns_records/'+RID&&init.method==='DELETE'){records=records.filter(x=>x.id!==RID);return j({success:true,result:{id:RID}});}
  if(path==='/zones/'+ZID+'/dnssec')return j({success:true,result:{status:init.method==='PATCH'?JSON.parse(init.body).status:dnssec}});
  throw Error('unexpected '+init.method+' '+path);};
 return {calls,fetchImpl,get records(){return records;}};
}
const req=(path,{method='GET',body,token='good',origin='https://ngeblogging.com'}={})=>new Request('https://ngeblogging.com/api/commerce/domains/manage/'+ORD+path,{method,headers:{authorization:'Bearer '+token,...(origin?{origin}:{}),...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
const run=(f,r)=>handler(r,env,{fetchImpl:f.fetchImpl});
test('lists records for an owned registered domain only',async()=>{const f=fixture(),r=await run(f,req('/dns',{origin:null})),b=await r.json();assert.equal(r.status,200);assert.equal(b.domain,Z);assert.equal(b.records[0].id,RID);});
test('unauthenticated and unregistered requests are refused',async()=>{assert.equal((await run(fixture(),req('/dns',{token:'bad'}))).status,401);assert.equal((await run(fixture({registered:false}),req('/dns'))).status,409);});
test('unrelated paths return null; writes require same origin',async()=>{assert.equal(await handler(new Request('https://ngeblogging.com/api/x'),env),null);const r=await run(fixture(),req('/dns',{method:'POST',body:{},origin:'https://evil.example'}));assert.equal(r.status,403);});
test('create, update, delete go through validation',async()=>{const f=fixture();
 let r=await run(f,req('/dns',{method:'POST',body:{type:'TXT',name:'@',content:'hello'}}));assert.equal(r.status,201);
 r=await run(f,req('/dns',{method:'POST',body:{type:'A',name:'@',content:'bad'}}));assert.equal(r.status,422);
 r=await run(f,req('/dns/'+RID,{method:'PATCH',body:{type:'A',name:'@',content:'9.9.9.9'}}));assert.equal(r.status,200);assert.equal(f.records.find(x=>x.id===RID).content,'9.9.9.9');
 r=await run(f,req('/dns/'+RID,{method:'DELETE'}));assert.equal(r.status,200);assert.ok(!f.records.some(x=>x.id===RID));});
test('restore previews by default and applies with safety backup',async()=>{const f=fixture(),backup=buildBackup(Z,[{id:RID,type:'A',name:Z,content:'5.5.5.5',ttl:1,proxied:false}]);
 let r=await run(f,req('/restore',{method:'POST',body:{backup}})),b=await r.json();assert.equal(b.applied,false);assert.equal(b.summary.update,1);assert.equal(f.records[0].content,'1.1.1.1');
 r=await run(f,req('/restore',{method:'POST',body:{backup,apply:true}}));assert.equal(r.status,409);
 r=await run(f,req('/restore',{method:'POST',body:{backup,apply:true,planHash:b.planHash}}));b=await r.json();assert.equal(b.applied,true);assert.equal(f.records[0].content,'5.5.5.5');assert.equal(b.safetyBackup.records[0].content,'1.1.1.1');
 r=await run(f,req('/restore',{method:'POST',body:{backup:{...backup,zone:'other.id'}}}));assert.equal(r.status,422);});
test('dnssec read and confirmed change',async()=>{const f=fixture();assert.equal((await (await run(f,req('/dnssec',{origin:null}))).json()).dnssec.status,'disabled');
 assert.equal((await run(f,req('/dnssec',{method:'POST',body:{enabled:true}}))).status,400);
 assert.equal((await (await run(f,req('/dnssec',{method:'POST',body:{enabled:true,confirm:true}}))).json()).dnssec.status,'active');});
test('adapter requires a token',()=>assert.throws(()=>createDnsAdapter({}),/NOT_CONFIGURED/));
