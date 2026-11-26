import {createImportJournaledDnsAdapter} from './domain-import-dns-adapter.mjs';
import {recordKey} from './domain-dns-journaled-adapter.mjs';
import {normalizeRecord,publicRecord,buildBackup,planRestore,EDITABLE_TYPES} from '../shared/domain-dns-records.mjs';
// DNS management for imported (paid, zone-active) domains: /manage/IMP-.../(dns|backup|restore|dnssec).
const PATH=/^\/api\/commerce\/domains\/manage\/(IMP-[a-f0-9]{40})\/(dns|backup|restore|dnssec)(?:\/([0-9a-f]{32}))?$/;
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const SUPABASE='https://polvmlrhqoiflumibfqs.supabase.co/';
const planHash=async plan=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(plan))))].map(b=>b.toString(16).padStart(2,'0')).join('');
const reply=(status,code,extra={},headers={})=>new Response(JSON.stringify({code,environment:'production',...extra}),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'private, no-store',vary:'Authorization','x-content-type-options':'nosniff',...headers}});
async function json(request,limit=262144){const text=await request.text();if(text.length>limit)throw Object.assign(new Error('BODY_TOO_LARGE'),{code:'BODY_TOO_LARGE',status:413});try{return JSON.parse(text);}catch{throw Object.assign(new Error('INVALID_JSON'),{code:'INVALID_JSON',status:400});}}
export async function domainImportDnsResponse(request,env,{fetchImpl=globalThis.fetch,adapterFactory=createImportJournaledDnsAdapter}={}){
 const url=new URL(request.url),m=PATH.exec(url.pathname);if(!m)return null;
 const [,orderId,resource,recordId]=m;
 if(url.protocol!=='https:'||url.hostname!=='ngeblogging.com'||url.port||url.search)return reply(404,'NOT_FOUND');
 const route=resource==='dns'&&!recordId?{GET:'list',POST:'create'}:resource==='dns'?{PATCH:'update',DELETE:'delete'}:recordId?null:resource==='backup'?{GET:'backup'}:resource==='restore'?{POST:'restore'}:{GET:'dnssec',POST:'dnssec-set'};
 if(!route)return reply(404,'NOT_FOUND');
 const action=route[request.method];if(!action)return reply(405,'METHOD_NOT_ALLOWED',{},{allow:Object.keys(route).join(', ')});
 const write=request.method!=='GET';
 if(write&&request.headers.get('origin')!==url.origin)return reply(403,'ORIGIN_NOT_ALLOWED');
 if(request.headers.has('origin')&&request.headers.get('origin')!==url.origin)return reply(403,'ORIGIN_NOT_ALLOWED');
 if(write&&request.method!=='DELETE'&&!/^application\/json/i.test(request.headers.get('content-type')||''))return reply(415,'JSON_REQUIRED');
 if(env?.DOMAIN_IMPORT_ENABLED!=='true')return reply(503,'DOMAIN_IMPORT_DISABLED');
 const auth=request.headers.get('authorization')||'';if(!/^Bearer [^\s]{1,8192}$/.test(auth))return reply(401,'AUTH_REQUIRED');
 let base;try{base=new URL(env.SUPABASE_URL);if(base.href!==SUPABASE||!env.SUPABASE_PUBLISHABLE_KEY||!env.SUPABASE_SERVICE_ROLE_KEY)throw Error();}catch{return reply(503,'DOMAIN_DNS_CONFIGURATION_UNAVAILABLE');}
 if(request.signal.aborted)return reply(503,'DOMAIN_DNS_UNAVAILABLE');
 const c=new AbortController(),timer=setTimeout(()=>c.abort(),25000),abort=()=>c.abort();request.signal.addEventListener('abort',abort,{once:true});
 try{
  const bodyIn=write&&request.method!=='DELETE'?await json(request):null;
  const verified=await fetchImpl(new URL('/auth/v1/user',base).href,{method:'GET',redirect:'manual',headers:{authorization:auth,apikey:env.SUPABASE_PUBLISHABLE_KEY},signal:c.signal});
  if([401,403].includes(verified.status))return reply(401,'INVALID_SESSION');if(verified.status!==200)return reply(503,'AUTH_UNAVAILABLE');
  const user=await verified.json();if(typeof user?.id!=='string'||!UUID.test(user.id))return reply(401,'INVALID_SESSION');const owner=user.id.toLowerCase();
  const ot=new URL('/rest/v1/domain_import_orders',base);ot.searchParams.set('select','order_id,user_id,domain,mode,payment_state,import_state,zone_id,zone_status,review_reason');ot.searchParams.set('order_id','eq.'+orderId);ot.searchParams.set('user_id','eq.'+owner);ot.searchParams.set('limit','2');
  const or=await fetchImpl(ot.href,{method:'GET',redirect:'manual',cache:'no-store',headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY},signal:c.signal});
  if(or.status!==200)return reply(503,'DOMAIN_DNS_UNAVAILABLE');
  const rows=await or.json();if(!Array.isArray(rows)||rows.length===0)return reply(404,'DOMAIN_ORDER_NOT_FOUND');
  const o=rows.length===1?rows[0]:null;if(o?.order_id!==orderId||o.user_id!==owner)return reply(503,'DOMAIN_DNS_UNVERIFIED');
  if(o.review_reason)return reply(409,'IMPORT_ORDER_UNDER_REVIEW');
  if(o.mode!=='nameserver'||o.payment_state!=='paid'||!['zone_active','completed'].includes(o.import_state)||o.zone_status!=='active'||!/^[0-9a-f]{32}$/.test(String(o.zone_id||'')))return reply(409,'IMPORT_DNS_NOT_READY');
  const domain=o.domain;
  if(typeof domain!=='string'||domain!==domain.toLowerCase()||!domain.includes('.')||domain==='ngeblogging.com'||domain.endsWith('.ngeblogging.com'))return reply(503,'DOMAIN_DNS_UNVERIFIED');
  const adapter=adapterFactory(env,{fetchImpl,signal:c.signal,journal:{userId:owner,orderId,domain,checkedAt:new Date().toISOString()}}),zone=await adapter.findZone(domain);
  if(zone.id!==o.zone_id)return reply(409,'IMPORT_ZONE_MISMATCH');
  if(zone.status!=='active')return reply(409,'IMPORT_ZONE_NOT_ACTIVE');
  if(action==='list')return reply(200,'DOMAIN_DNS_RECORDS',{domain,records:(await adapter.listRecords(zone.id)).filter(r=>EDITABLE_TYPES.includes(r.type)).map(publicRecord),editableTypes:EDITABLE_TYPES});
  if(action==='backup'){const b=buildBackup(domain,await adapter.listRecords(zone.id));return reply(200,'DOMAIN_DNS_BACKUP',{domain,backup:b},{'content-disposition':'attachment; filename="dns-'+domain+'.json"'});}
  if(action==='dnssec')return reply(200,'DOMAIN_DNSSEC',{domain,dnssec:await adapter.getDnssec(zone.id)});
  if(action==='dnssec-set'){if(bodyIn?.enabled===false)return reply(409,'DNSSEC_DISABLE_NOT_SUPPORTED');if(typeof bodyIn?.enabled!=='boolean'||bodyIn.confirm!==true)return reply(400,'CONFIRMATION_REQUIRED');return reply(200,'DOMAIN_DNSSEC_UPDATED',{domain,dnssec:await adapter.setDnssec(zone.id,bodyIn.enabled)});}
  if(action==='create'){const rec=normalizeRecord(domain,bodyIn);return reply(201,'DOMAIN_DNS_RECORD_CREATED',{domain,record:publicRecord(await adapter.createRecord(zone.id,rec))});}
  if(action==='update'){const rec=normalizeRecord(domain,bodyIn),cur=(await adapter.listRecords(zone.id)).find(r=>r.id===recordId);if(!cur||!EDITABLE_TYPES.includes(cur.type))return reply(404,'RECORD_NOT_FOUND');return reply(200,'DOMAIN_DNS_RECORD_UPDATED',{domain,previous:publicRecord(cur),record:publicRecord(await adapter.updateRecord(zone.id,recordId,rec))});}
  if(action==='delete'){const cur=(await adapter.listRecords(zone.id)).find(r=>r.id===recordId);if(!cur||!EDITABLE_TYPES.includes(cur.type))return reply(404,'RECORD_NOT_FOUND');await adapter.deleteRecord(zone.id,recordId);return reply(200,'DOMAIN_DNS_RECORD_DELETED',{domain,previous:publicRecord(cur)});}
  if(action==='restore'){
   const current=await adapter.listRecords(zone.id),plan=planRestore(domain,current,bodyIn?.backup,{removeExtra:bodyIn?.removeExtra===true});
   const summary={create:plan.create.length,update:plan.update.length,remove:plan.remove.length,unchanged:plan.unchanged};
   const hash=await planHash(plan);
   if(bodyIn?.apply!==true)return reply(200,'DOMAIN_DNS_RESTORE_PREVIEW',{domain,applied:false,summary,plan,planHash:hash});
   if(bodyIn.planHash!==hash)return reply(409,'DOMAIN_DNS_PLAN_CHANGED',{domain,applied:false,summary,plan,planHash:hash});
   const safety=buildBackup(domain,current),done={create:0,update:0,remove:0};
   const apply=async a=>{for(const r of plan.create){await a.createRecord(zone.id,r);done.create++;}for(const u of plan.update){await a.updateRecord(zone.id,u.id,u.record);done.update++;}for(const r of plan.remove){await a.deleteRecord(zone.id,r.id);done.remove++;}};
   const check=(before,after)=>{const have=new Set(after.map(recordKey));return plan.create.every(r=>have.has(recordKey(r)))&&plan.update.every(u=>have.has(recordKey(u.record)))&&plan.remove.every(r=>!after.some(x=>x.id===r.id));};
   try{if(summary.create+summary.update+summary.remove>0&&typeof adapter.runOperation==='function')await adapter.runOperation(zone.id,{action:'restore',create:summary.create,update:summary.update,remove:summary.remove},apply,check);else await apply(adapter);}
   catch(error){return reply(502,'DOMAIN_DNS_RESTORE_PARTIAL',{domain,applied:false,partial:true,done,summary,safetyBackup:safety,detail:String(error?.code||'ERROR')});}
   return reply(200,'DOMAIN_DNS_RESTORED',{domain,applied:true,done,summary,safetyBackup:safety});
  }
  return reply(404,'NOT_FOUND');
 }catch(error){
  const code=String(error?.code||''),status=Number(error?.status);
  if(code&&/^[A-Z_]+$/.test(code)&&status>=400&&status<600)return reply(status,code,error.detail?{detail:error.detail}:{});
  if(/^[A-Z_]+$/.test(code))return reply(422,code);
  return reply(503,'DOMAIN_DNS_UNAVAILABLE');
 }finally{clearTimeout(timer);request.signal.removeEventListener('abort',abort);}
}
