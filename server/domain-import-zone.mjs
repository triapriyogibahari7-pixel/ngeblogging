import {findFullZone,createFullZone,getFullZoneStatus,publicZoneState,fullZoneProviderReady,normalizeZoneName} from './cloudflare-full-zone-provider.mjs';
import {provisionSaasRecords} from './domain-import-saas-records.mjs';
const BASE='/api/commerce/domains/manage/import';
const ORDER=/^IMP-[a-f0-9]{40}$/;
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const SUPABASE='https://polvmlrhqoiflumibfqs.supabase.co/';
const ZONE_ID=/^[0-9a-f]{32}$/;
const ZONE_STATUS=['initializing','pending','active','moved','deleted','deactivated'];
const defaultProvider={findFullZone,createFullZone,getFullZoneStatus,publicZoneState,fullZoneProviderReady,normalizeZoneName};
export async function importZoneExists(env,domain,provider=defaultProvider){
 const name=provider.normalizeZoneName(domain);
 if(!provider.fullZoneProviderReady(env))throw Object.assign(Error('CLOUDFLARE_CONFIGURATION_REQUIRED'),{code:'CLOUDFLARE_CONFIGURATION_REQUIRED'});
 return Boolean(await provider.findFullZone(env,name));
}
function deadline(ms){const c=new AbortController();let stop;const stopped=new Promise((_,reject)=>{stop=()=>reject(Error('TIMEOUT'));c.signal.addEventListener('abort',stop,{once:true});});const timer=setTimeout(()=>c.abort(),ms);return {signal:c.signal,abort:()=>c.abort(),wait:p=>Promise.race([p,stopped]),close:()=>{clearTimeout(timer);c.signal.removeEventListener('abort',stop);}};}
async function readJson(stream,wait,limit){const reader=stream?.getReader();if(!reader)throw Error('INVALID_JSON');try{let size=0;const chunks=[];for(;;){const x=await wait(reader.read());if(x.done)break;size+=x.value.length;if(size>limit)throw Error('BODY_TOO_LARGE');chunks.push(x.value);}const bytes=new Uint8Array(size);let pos=0;for(const chunk of chunks){bytes.set(chunk,pos);pos+=chunk.length;}return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}finally{reader.cancel().catch(()=>{});try{reader.releaseLock();}catch{}}}
export async function domainImportZoneResponse(request,env,{fetchImpl=globalThis.fetch,provider=defaultProvider,warnImpl=x=>console.warn(JSON.stringify(x)),provision=provisionSaasRecords}={}){
 const url=new URL(request.url);if(url.pathname!==BASE+'/zone')return null;
 const reply=(status,code,extra={})=>new Response(JSON.stringify({code,environment:'production',...extra}),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff',...(status===405?{allow:'POST'}:{})}});
 if(url.protocol!=='https:'||url.hostname!=='ngeblogging.com'||url.port)return reply(404,'NOT_FOUND');
 if(request.method!=='POST')return reply(405,'METHOD_NOT_ALLOWED');
 if(url.search)return reply(400,'QUERY_NOT_ALLOWED');
 if(env?.DOMAIN_IMPORT_ENABLED!=='true')return reply(503,'DOMAIN_IMPORT_DISABLED');
 if(request.headers.get('origin')!==url.origin)return reply(403,'ORIGIN_NOT_ALLOWED');
 const auth=request.headers.get('authorization')||'';if(!/^Bearer [^\s]{1,8192}$/.test(auth))return reply(401,'AUTH_REQUIRED');
 if(!/^application\/json(?:\s*;.*)?$/i.test(request.headers.get('content-type')||''))return reply(415,'JSON_REQUIRED');
 let base;try{base=new URL(env.SUPABASE_URL);if(base.href!==SUPABASE)throw Error();}catch{return reply(503,'DOMAIN_IMPORT_CONFIGURATION_UNAVAILABLE',{configurationUnavailable:true});}
 const srv=env.SUPABASE_SERVICE_ROLE_KEY,account=String(env.CLOUDFLARE_ACCOUNT_ID||'').trim().toLowerCase();
 if(typeof srv!=='string'||!srv||typeof env.SUPABASE_PUBLISHABLE_KEY!=='string'||!env.SUPABASE_PUBLISHABLE_KEY||!ZONE_ID.test(account)||!provider.fullZoneProviderReady(env))return reply(503,'DOMAIN_IMPORT_CONFIGURATION_UNAVAILABLE',{configurationUnavailable:true});
 const budget=deadline(25000),abort=()=>budget.abort();request.signal?.addEventListener('abort',abort,{once:true});
 let id=null;
 try{
  let b;try{b=await readJson(request.body,budget.wait,1024);}catch(e){return reply(e.message==='BODY_TOO_LARGE'?413:400,e.message==='BODY_TOO_LARGE'?'BODY_TOO_LARGE':'INVALID_BODY');}
  if(!b||Array.isArray(b)||Object.keys(b).length!==1||typeof b.orderId!=='string'||!ORDER.test(b.orderId))return reply(400,'INVALID_REQUEST');id=b.orderId;
  const v=await budget.wait(fetchImpl(new URL('/auth/v1/user',base).href,{method:'GET',redirect:'manual',headers:{authorization:auth,apikey:env.SUPABASE_PUBLISHABLE_KEY},signal:budget.signal}));
  if([401,403].includes(v.status))return reply(401,'INVALID_SESSION');if(v.status!==200)return reply(503,'AUTH_UNAVAILABLE');
  const user=await readJson(v.body,budget.wait,32768);if(typeof user?.id!=='string'||!UUID.test(user.id))return reply(401,'INVALID_SESSION');const uid=user.id.toLowerCase();
  const hdr={apikey:srv,authorization:'Bearer '+srv};
  const call=async(target,options)=>{const r=await budget.wait(fetchImpl(target,{...options,redirect:'manual',signal:budget.signal}));if(r.status===204)return {status:204,data:null};let data=null;try{data=await readJson(r.body,budget.wait,32768);}catch{}return {status:r.status,data};};
  const read=async()=>{const t=new URL('/rest/v1/domain_import_orders',base);t.searchParams.set('select','order_id,user_id,domain,mode,payment_state,import_state,zone_id,zone_status,review_reason');t.searchParams.set('order_id','eq.'+id);t.searchParams.set('user_id','eq.'+uid);t.searchParams.set('limit','1');const r=await call(t.href,{method:'GET',headers:hdr});if(r.status!==200||!Array.isArray(r.data))throw Error('STORAGE_UNAVAILABLE');return r.data.length===1&&r.data[0].order_id===id?r.data[0]:null;};
  const rpc=async(name,args)=>{const r=await call(new URL('/rest/v1/rpc/'+name,base).href,{method:'POST',headers:{...hdr,'content-type':'application/json'},body:JSON.stringify(args)});return r.status===200||r.status===204;};
  const flag=async reason=>{try{await rpc('domain_import_flag_review_v1',{p_order_id:id,p_reason:reason});}catch{}try{warnImpl({event:'domain_import_zone_review',reason,order_id:id});}catch{}};
  const o=await read();if(!o)return reply(404,'IMPORT_ORDER_NOT_FOUND');
  if(o.mode!=='nameserver')return reply(409,'IMPORT_MODE_NOT_SUPPORTED');
  if(o.payment_state!=='paid')return reply(409,'IMPORT_PAYMENT_REQUIRED');
  if(o.review_reason)return reply(409,'IMPORT_ORDER_UNDER_REVIEW',{needsReview:true});
  const matches=z=>z&&ZONE_ID.test(String(z.id||''))&&String(z.name||'').toLowerCase().replace(/\.$/,'')===o.domain&&String(z.account?.id||'').toLowerCase()===account;
  const record=async z=>{
   const s=provider.publicZoneState(z),status=s.status.toLowerCase();
   if(!ZONE_ID.test(s.id)||!ZONE_STATUS.includes(status)){await flag('ZONE_STATUS_UNEXPECTED');return reply(409,'IMPORT_ZONE_STATUS_UNEXPECTED',{needsReview:true});}
   const args={p_user_id:uid,p_order_id:id,p_zone_id:s.id,p_zone_status:status,p_name_servers:s.nameServers,p_original_name_servers:s.originalNameServers};
   if(!(await rpc('domain_import_record_zone_v1',args))&&!(await rpc('domain_import_record_zone_v1',args)))return reply(503,'IMPORT_ZONE_RECORD_FAILED');
   if(status==='active'){try{await budget.wait(provision(env,{domain:o.domain,zoneId:s.id,userId:uid,orderId:id,fetchImpl,signal:budget.signal}));}catch{}}
   return reply(200,'DOMAIN_IMPORT_ZONE',{zone:{status,active:status==='active',nameServers:s.nameServers,originalNameServers:s.originalNameServers}});
  };
  const adoptable=async z=>{
   if(!matches(z))return false;
   const s=provider.publicZoneState(z),st=s.status.toLowerCase(),t=Date.parse(s.createdOn||'');
   if(!['pending','initializing'].includes(st)||!Number.isFinite(t)||Date.now()-t>7*864e5||t>Date.now()+300000)return false;
   const u=new URL('/rest/v1/domain_import_orders',base);u.searchParams.set('select','order_id');u.searchParams.set('zone_id','eq.'+s.id);u.searchParams.set('order_id','neq.'+id);u.searchParams.set('limit','1');
   const r=await call(u.href,{method:'GET',headers:hdr});
   return r.status===200&&Array.isArray(r.data)&&r.data.length===0;
  };
  if(o.zone_id){
   let z;try{z=await provider.getFullZoneStatus(env,o.zone_id);}catch{return reply(503,'IMPORT_ZONE_UNAVAILABLE');}
   if(z?.id!==o.zone_id||!matches(z)){await flag('ZONE_MISMATCH');return reply(409,'IMPORT_ZONE_MISMATCH',{needsReview:true});}
   return record(z);
  }
  let existing;try{existing=await provider.findFullZone(env,o.domain);}catch{return reply(503,'IMPORT_ZONE_UNAVAILABLE');}
  if(existing){if(await adoptable(existing))return record(existing);await flag('ZONE_ALREADY_EXISTS');return reply(409,'IMPORT_ZONE_ALREADY_EXISTS',{needsReview:true});}
  let z;
  try{z=await provider.createFullZone(env,o.domain);}
  catch(e){
   const again=await read().catch(()=>null);if(again?.zone_id)return reply(409,'IMPORT_ZONE_IN_PROGRESS');
   let found=null;try{found=await provider.findFullZone(env,o.domain);}catch{}
   if(found){if(await adoptable(found))return record(found);await flag('ZONE_ALREADY_EXISTS');return reply(409,'IMPORT_ZONE_ALREADY_EXISTS',{needsReview:true});}
   const pc=String(e?.code||'CLOUDFLARE_ERROR').replace(/[^A-Za-z0-9_]/g,'').slice(0,64)||'CLOUDFLARE_ERROR';try{warnImpl({event:'domain_import_zone_create_failed',code:pc,status:Number(e?.providerStatus||e?.status)||null,order_id:id});}catch{}
   if(['CLOUDFLARE_ZONE_CREATE_PERMISSION_REQUIRED','CLOUDFLARE_DOMAIN_TOKEN_INVALID','CLOUDFLARE_CONFIGURATION_REQUIRED'].includes(pc))return reply(503,'IMPORT_ZONE_CREATE_UNAVAILABLE',{providerCode:pc});
   await flag('ZONE_CREATE_FAILED');return reply(503,'IMPORT_ZONE_CREATE_FAILED',{needsReview:true,providerCode:pc});
  }
  if(!matches(z)){await flag('ZONE_MISMATCH');return reply(409,'IMPORT_ZONE_MISMATCH',{needsReview:true});}
  return record(z);
 }catch{return reply(503,'IMPORT_ZONE_UNAVAILABLE');}
 finally{budget.close();request.signal?.removeEventListener('abort',abort);}
}
