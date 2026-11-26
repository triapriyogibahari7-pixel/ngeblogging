import {createJournaledDnsAdapter,recordKey} from './domain-dns-journaled-adapter.mjs';
import {normalizeRecord,publicRecord,buildBackup,planRestore,EDITABLE_TYPES} from '../shared/domain-dns-records.mjs';
import {domainImportRouterResponse} from './domain-import-router.mjs';
import {domainImportDnsResponse} from './domain-import-dns.mjs';
const PREFIX='/api/commerce/domains/manage/';
const ORDER=/^DOM-[a-f0-9]{40}$/,UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i,CFID=/^[0-9a-f]{32}$/i;
const planHash=async plan=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(plan))))].map(b=>b.toString(16).padStart(2,'0')).join('');
const SUPABASE='https://polvmlrhqoiflumibfqs.supabase.co/',ACCOUNT='095e57b46e7ba7f6b188480d9e4e5fe7';
const deny=(code,status)=>Object.assign(new Error(code),{code,status});
async function verifyRegistration(env,domain,order,{fetchImpl,signal}){
 const ref='/accounts/'+ACCOUNT+'/registrar/registrations/'+domain,token=String(env?.CLOUDFLARE_REGISTRAR_API_TOKEN||'').trim();
 if(order.review_reason!==null||order.registrar_domain_ref!==ref||typeof order.registered_at!=='string'||!Number.isFinite(Date.parse(order.registered_at)))throw deny('DOMAIN_REGISTRATION_UNVERIFIED',409);
 if(!token||/\s/.test(token))throw deny('DNS_REGISTRAR_NOT_CONFIGURED',503);
 const r=await fetchImpl('https://api.cloudflare.com/client/v4'+ref,{method:'GET',redirect:'manual',cache:'no-store',signal,headers:{authorization:'Bearer '+token,accept:'application/json'}});
 let p=null;try{p=JSON.parse(await r.text());}catch{}
 if(r.status===401||r.status===403)throw deny('DNS_PROVIDER_PERMISSION_REQUIRED',503);
 if(r.status>=500||r.status===429)throw deny('DNS_PROVIDER_UNAVAILABLE',502);
 const x=p?.result;
 if(r.status!==200||p?.success!==true||x?.domain_name!==domain||x.status!=='active'||Date.parse(x.created_at)!==Date.parse(order.registered_at))throw deny('DOMAIN_REGISTRATION_UNVERIFIED',403);
 return x.created_at;
}
const reply=(status,code,extra={},headers={})=>new Response(JSON.stringify({code,environment:'production',...extra}),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'private, no-store',vary:'Authorization','x-content-type-options':'nosniff',...headers}});
async function json(request,limit=262144){const text=await request.text();if(text.length>limit)throw Object.assign(new Error('BODY_TOO_LARGE'),{code:'BODY_TOO_LARGE',status:413});try{return JSON.parse(text);}catch{throw Object.assign(new Error('INVALID_JSON'),{code:'INVALID_JSON',status:400});}}
export async function domainDnsManagementResponse(request,env,{fetchImpl=globalThis.fetch,adapterFactory=createJournaledDnsAdapter}={}){
 const url=new URL(request.url);if(!url.pathname.startsWith(PREFIX))return null;
 if(url.pathname.startsWith(PREFIX+'import/'))return (await domainImportRouterResponse(request,env,{fetchImpl}))??reply(404,'NOT_FOUND');
 if(/^IMP-[a-f0-9]{40}\//.test(url.pathname.slice(PREFIX.length)))return (await domainImportDnsResponse(request,env,{fetchImpl}))??reply(404,'NOT_FOUND');
 if(url.protocol!=='https:'||url.hostname!=='ngeblogging.com'||url.port||url.search)return reply(404,'NOT_FOUND');
 const [orderId,resource,recordId,...extra]=url.pathname.slice(PREFIX.length).split('/');
 if(!ORDER.test(orderId||'')||extra.length)return reply(404,'NOT_FOUND');
 const route=resource==='dns'&&!recordId?{GET:'list',POST:'create'}:resource==='dns'&&CFID.test(recordId||'')?{PATCH:'update',DELETE:'delete'}:resource==='backup'&&!recordId?{GET:'backup'}:resource==='restore'&&!recordId?{POST:'restore'}:resource==='dnssec'&&!recordId?{GET:'dnssec',POST:'dnssec-set'}:null;
 if(!route)return reply(404,'NOT_FOUND');
 const action=route[request.method];if(!action)return reply(405,'METHOD_NOT_ALLOWED',{},{allow:Object.keys(route).join(', ')});
 const write=request.method!=='GET';
 if(write&&request.headers.get('origin')!==url.origin)return reply(403,'ORIGIN_NOT_ALLOWED');
 if(request.headers.has('origin')&&request.headers.get('origin')!==url.origin)return reply(403,'ORIGIN_NOT_ALLOWED');
 if(write&&request.method!=='DELETE'&&!/^application\/json/i.test(request.headers.get('content-type')||''))return reply(415,'JSON_REQUIRED');
 if(env?.DOMAIN_ORDER_ENV!=='production')return reply(503,'DOMAIN_DNS_UNAVAILABLE');
 const auth=request.headers.get('authorization')||'';if(!/^Bearer [^\s]{1,8192}$/.test(auth))return reply(401,'AUTH_REQUIRED');
 let base;try{base=new URL(env.SUPABASE_URL);if(base.href!==SUPABASE||!env.SUPABASE_PUBLISHABLE_KEY||!env.SUPABASE_SERVICE_ROLE_KEY)throw Error();}catch{return reply(503,'DOMAIN_DNS_CONFIGURATION_UNAVAILABLE');}
 if(request.signal.aborted)return reply(503,'DOMAIN_DNS_UNAVAILABLE');
 const c=new AbortController(),timer=setTimeout(()=>c.abort(),25000),abort=()=>c.abort();request.signal.addEventListener('abort',abort,{once:true});
 const service={apikey:env.SUPABASE_SERVICE_ROLE_KEY,authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY};
 const get=async(target,headers)=>{const r=await fetchImpl(target.href,{method:'GET',redirect:'manual',cache:'no-store',headers,signal:c.signal});if(r.status!==200)throw Object.assign(new Error('STORAGE'),{status:r.status});return r.json();};
 try{
  const bodyIn=write&&request.method!=='DELETE'?await json(request):null;
  const verified=await fetchImpl(new URL('/auth/v1/user',base).href,{method:'GET',redirect:'manual',headers:{authorization:auth,apikey:env.SUPABASE_PUBLISHABLE_KEY},signal:c.signal});
  if([401,403].includes(verified.status))return reply(401,'INVALID_SESSION');if(verified.status!==200)return reply(503,'AUTH_UNAVAILABLE');
  const user=await verified.json();if(typeof user?.id!=='string'||!UUID.test(user.id))return reply(401,'INVALID_SESSION');const owner=user.id.toLowerCase();
  const ot=new URL('/rest/v1/domain_purchase_orders',base);ot.searchParams.set('select','order_id,user_id,quote_id,environment,payment_state,registration_state,review_reason,registered_at,registrar_domain_ref');ot.searchParams.set('order_id','eq.'+orderId);ot.searchParams.set('user_id','eq.'+owner);ot.searchParams.set('environment','eq.production');ot.searchParams.set('limit','2');
  const orders=await get(ot,service);if(!Array.isArray(orders)||orders.length===0)return reply(404,'DOMAIN_ORDER_NOT_FOUND');
  const o=orders.length===1?orders[0]:null;if(o?.order_id!==orderId||o.user_id!==owner||!UUID.test(o.quote_id||''))return reply(503,'DOMAIN_DNS_UNVERIFIED');
  if(o.payment_state!=='paid'||o.registration_state!=='registered')return reply(409,'DOMAIN_NOT_REGISTERED');
  const qt=new URL('/rest/v1/domain_sale_quotes',base);qt.searchParams.set('select','id,user_id,environment,domain');qt.searchParams.set('id','eq.'+o.quote_id);qt.searchParams.set('user_id','eq.'+owner);qt.searchParams.set('environment','eq.production');qt.searchParams.set('limit','2');
  const quotes=await get(qt,service),q=Array.isArray(quotes)&&quotes.length===1?quotes[0]:null;
  if(q?.id!==o.quote_id||q.user_id!==owner||typeof q.domain!=='string'||q.domain!==q.domain.toLowerCase()||!q.domain.includes('.')||q.domain==='ngeblogging.com'||q.domain.endsWith('.ngeblogging.com'))return reply(503,'DOMAIN_DNS_UNVERIFIED');
  const domain=q.domain,registrationCreatedAt=await verifyRegistration(env,domain,o,{fetchImpl,signal:c.signal}),checkedAt=new Date().toISOString();const adapter=adapterFactory(env,{fetchImpl,signal:c.signal,journal:{userId:owner,orderId,domain,registrationCreatedAt,checkedAt}}),zone=await adapter.findZone(domain);
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
