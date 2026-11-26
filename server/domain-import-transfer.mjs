import {findFullZone,createFullZone,getFullZoneStatus,publicZoneState,fullZoneProviderReady,normalizeZoneName} from './cloudflare-full-zone-provider.mjs';
const BASE='/api/commerce/domains/manage/import/transfer';
const ORDER=/^IMP-[a-f0-9]{40}$/;
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const SUPABASE='https://polvmlrhqoiflumibfqs.supabase.co/';
const ZONE_ID=/^[0-9a-f]{32}$/;
const ZONE_STATUS=['initializing','pending','active','moved','deleted','deactivated'];
const DOMAIN=/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.[a-z]{2,24}$/;
const ALLOWED_TLDS=['com','net','org'];
const MAX_OPEN=5;
const CF_API='https://api.cloudflare.com/client/v4';
const COLUMNS='order_id,domain,mode,price_idr,payment_state,import_state,transfer_status,zone_id,zone_status,review_reason,updated_at';
const defaultProvider={findFullZone,createFullZone,getFullZoneStatus,publicZoneState,fullZoneProviderReady,normalizeZoneName};
const ROUTES={[BASE+'/orders']:'orders',[BASE+'/zone']:'zone',[BASE+'/submit']:'submit',[BASE+'/status']:'status'};
function deadline(ms){const c=new AbortController();let stop;const stopped=new Promise((_,reject)=>{stop=()=>reject(Error('TIMEOUT'));c.signal.addEventListener('abort',stop,{once:true});});const timer=setTimeout(()=>c.abort(),ms);return {signal:c.signal,abort:()=>c.abort(),wait:p=>Promise.race([p,stopped]),close:()=>{clearTimeout(timer);c.signal.removeEventListener('abort',stop);}};}
async function readJson(stream,wait,limit){const reader=stream?.getReader();if(!reader)throw Error('INVALID_JSON');try{let size=0;const chunks=[];for(;;){const x=await wait(reader.read());if(x.done)break;size+=x.value.length;if(size>limit)throw Error('BODY_TOO_LARGE');chunks.push(x.value);}const bytes=new Uint8Array(size);let pos=0;for(const chunk of chunks){bytes.set(chunk,pos);pos+=chunk.length;}return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}finally{reader.cancel().catch(()=>{});try{reader.releaseLock();}catch{}}}
const str=(v,min,max)=>typeof v==='string'&&v.trim().length>=min&&v.trim().length<=max&&!/[\u0000-\u001f\u007f]/.test(v);
function parseRegistrant(r){
 if(!r||typeof r!=='object'||Array.isArray(r))return null;
 const allowed=['name','organization','email','phone','street','city','state','postalCode','countryCode'];
 if(Object.keys(r).some(k=>!allowed.includes(k)))return null;
 if(!str(r.name,2,100)||!str(r.street,3,200)||!str(r.city,2,100)||!str(r.state,1,100)||!str(r.postalCode,2,20))return null;
 if(typeof r.email!=='string'||r.email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(r.email))return null;
 if(typeof r.phone!=='string'||!/^\+\d{1,3}\.\d{4,14}$/.test(r.phone))return null;
 if(typeof r.countryCode!=='string'||!/^[A-Z]{2}$/.test(r.countryCode))return null;
 if(r.organization!==undefined&&!str(r.organization,1,100))return null;
 return {email:r.email,phone:r.phone,postal_info:{name:r.name.trim(),...(r.organization?{organization:r.organization.trim()}:{}),address:{street:r.street.trim(),city:r.city.trim(),state:r.state.trim(),postal_code:r.postalCode.trim(),country_code:r.countryCode}}};
}
function parseEpp(v){return typeof v==='string'&&v.length>=4&&v.length<=128&&/^[\x21-\x7e]+$/.test(v)?v:null;}
function base64(text){let s='';for(const b of new TextEncoder().encode(text))s+=String.fromCharCode(b);return btoa(s);}
const mapCf=s=>s==='succeeded'?'completed':s==='failed'?'failed':'pending';
const view=o=>({orderId:o.order_id,domain:o.domain,importState:o.import_state,transferStatus:o.transfer_status??null});
export async function domainImportTransferResponse(request,env,{fetchImpl=globalThis.fetch,provider=defaultProvider,now=()=>Date.now(),warnImpl=x=>console.warn(JSON.stringify(x))}={}){
 const url=new URL(request.url),route=Object.hasOwn(ROUTES,url.pathname)?ROUTES[url.pathname]:null;if(!route)return null;
 const reply=(status,code,extra={})=>new Response(JSON.stringify({code,environment:'production',...extra}),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff',...(status===405?{allow:'POST'}:{})}});
 if(url.protocol!=='https:'||url.hostname!=='ngeblogging.com'||url.port)return reply(404,'NOT_FOUND');
 if(request.method!=='POST')return reply(405,'METHOD_NOT_ALLOWED');
 if(url.search)return reply(400,'QUERY_NOT_ALLOWED');
 if(env?.DOMAIN_IMPORT_ENABLED!=='true'||env.DOMAIN_IMPORT_TRANSFER_ENABLED!=='true')return reply(503,'DOMAIN_IMPORT_TRANSFER_DISABLED');
 if(request.headers.get('origin')!==url.origin)return reply(403,'ORIGIN_NOT_ALLOWED');
 const auth=request.headers.get('authorization')||'';if(!/^Bearer [^\s]{1,8192}$/.test(auth))return reply(401,'AUTH_REQUIRED');
 if(!/^application\/json(?:\s*;.*)?$/i.test(request.headers.get('content-type')||''))return reply(415,'JSON_REQUIRED');
 const unavailable=()=>reply(503,'DOMAIN_IMPORT_CONFIGURATION_UNAVAILABLE',{configurationUnavailable:true});
 let base;try{base=new URL(env.SUPABASE_URL);if(base.href!==SUPABASE)throw Error();}catch{return unavailable();}
 const srv=env.SUPABASE_SERVICE_ROLE_KEY,account=String(env.CLOUDFLARE_ACCOUNT_ID||'').trim().toLowerCase();
 const token=String(env.CLOUDFLARE_DOMAIN_API_TOKEN||env.CLOUDFLARE_API_TOKEN||'').trim();
 if(typeof srv!=='string'||!srv||typeof env.SUPABASE_PUBLISHABLE_KEY!=='string'||!env.SUPABASE_PUBLISHABLE_KEY||!ZONE_ID.test(account)||!token||!provider.fullZoneProviderReady(env))return unavailable();
 const budget=deadline(25000),abort=()=>budget.abort();request.signal?.addEventListener('abort',abort,{once:true});
 let id=null,claimed=false;
 try{
  let b;try{b=await readJson(request.body,budget.wait,route==='submit'?4096:1024);}catch(e){return reply(e.message==='BODY_TOO_LARGE'?413:400,e.message==='BODY_TOO_LARGE'?'BODY_TOO_LARGE':'INVALID_BODY');}
  if(!b||Array.isArray(b)||typeof b!=='object')return reply(400,'INVALID_REQUEST');
  let epp=null,registrant=null,privacy='redaction';
  if(route==='orders'){if(Object.keys(b).length!==1||typeof b.domain!=='string')return reply(400,'INVALID_REQUEST');}
  else{
   const keys=Object.keys(b);
   if(typeof b.orderId!=='string'||!ORDER.test(b.orderId))return reply(400,'INVALID_REQUEST');id=b.orderId;
   if(route==='submit'){
    if(keys.some(k=>!['orderId','eppCode','registrant','privacyMode'].includes(k)))return reply(400,'INVALID_REQUEST');
    epp=parseEpp(b.eppCode);registrant=parseRegistrant(b.registrant);
    if(b.privacyMode!==undefined&&!['redaction','off'].includes(b.privacyMode))return reply(400,'INVALID_REQUEST');
    if(b.privacyMode)privacy=b.privacyMode;
    if(!epp)return reply(400,'INVALID_EPP_CODE');if(!registrant)return reply(400,'INVALID_REGISTRANT');
   }else if(keys.length!==1)return reply(400,'INVALID_REQUEST');
  }
  const v=await budget.wait(fetchImpl(new URL('/auth/v1/user',base).href,{method:'GET',redirect:'manual',headers:{authorization:auth,apikey:env.SUPABASE_PUBLISHABLE_KEY},signal:budget.signal}));
  if([401,403].includes(v.status))return reply(401,'INVALID_SESSION');if(v.status!==200)return reply(503,'AUTH_UNAVAILABLE');
  const user=await readJson(v.body,budget.wait,32768);if(typeof user?.id!=='string'||!UUID.test(user.id))return reply(401,'INVALID_SESSION');const uid=user.id.toLowerCase();
  const hdr={apikey:srv,authorization:'Bearer '+srv};
  const call=async(target,options)=>{const r=await budget.wait(fetchImpl(target,{...options,redirect:'manual',signal:budget.signal}));if(r.status===204)return {status:204,data:null};let data=null;try{data=await readJson(r.body,budget.wait,32768);}catch{}return {status:r.status,data};};
  const rest=async(path,q)=>{const t=new URL('/rest/v1/'+path,base);for(const [k,x] of Object.entries(q))t.searchParams.set(k,x);const r=await call(t.href,{method:'GET',headers:hdr});if(r.status!==200||!Array.isArray(r.data))throw Error('STORAGE_UNAVAILABLE');return r.data;};
  const read=async()=>{const rows=await rest('domain_import_orders',{select:COLUMNS,order_id:'eq.'+id,user_id:'eq.'+uid,limit:'1'});return rows.length===1&&rows[0].order_id===id?rows[0]:null;};
  const rpc=async(name,args)=>{const r=await call(new URL('/rest/v1/rpc/'+name,base).href,{method:'POST',headers:{...hdr,'content-type':'application/json'},body:JSON.stringify(args)});return {ok:r.status===200||r.status===204,status:r.status,data:r.data};};
  const flag=async reason=>{try{await rpc('domain_import_flag_review_v1',{p_order_id:id,p_reason:reason});}catch{}try{warnImpl({event:'domain_import_transfer_review',reason,order_id:id});}catch{}};
  const cf=async(method,path,body)=>{const r=await budget.wait(fetchImpl(CF_API+'/accounts/'+account+'/registrar/registrations/'+path,{method,redirect:'manual',headers:{authorization:'Bearer '+token,accept:'application/json',...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:budget.signal}));let data=null;try{data=await readJson(r.body,budget.wait,65536);}catch{}return {status:r.status,data};};
  const setTransfer=(status,ref,eppSubmitted)=>rpc('domain_import_set_transfer_v2',{p_user_id:uid,p_order_id:id,p_transfer_status:status,p_registrar_ref:ref,p_epp_submitted:eppSubmitted});
  const matches=(z,o)=>z&&ZONE_ID.test(String(z.id||''))&&String(z.name||'').toLowerCase().replace(/\.$/,'')===o.domain&&String(z.account?.id||'').toLowerCase()===account;

  if(route==='orders'){
   let domain;try{domain=provider.normalizeZoneName(b.domain);}catch{return reply(400,'IMPORT_DOMAIN_INVALID');}
   if(!DOMAIN.test(domain))return reply(400,'IMPORT_DOMAIN_INVALID');
   const tld=domain.slice(domain.lastIndexOf('.')+1);
   if(!ALLOWED_TLDS.includes(tld))return reply(409,'IMPORT_TRANSFER_TLD_NOT_AVAILABLE');
   const prices=await rest('domain_import_transfer_prices',{select:'tld,price_idr',tld:'eq.'+tld,enabled:'eq.true',limit:'1'});
   const p=prices.length===1&&prices[0].tld===tld?prices[0]:null;
   if(!p||!Number.isSafeInteger(p.price_idr)||p.price_idr<=0)return reply(409,'IMPORT_TRANSFER_PRICE_NOT_SET');
   const open=await rest('domain_import_orders',{select:'order_id',user_id:'eq.'+uid,import_state:'eq.created',payment_state:'in.(unpaid,pending)',limit:'50'});
   if(open.length>=MAX_OPEN)return reply(429,'IMPORT_TOO_MANY_OPEN_ORDERS');
   let exists;try{exists=Boolean(await provider.findFullZone(env,domain));}catch{return reply(503,'IMPORT_ZONE_CHECK_UNAVAILABLE');}
   if(exists)return reply(409,'IMPORT_ZONE_ALREADY_EXISTS');
   const r=await rpc('domain_import_create_v1',{p_user_id:uid,p_domain:domain,p_mode:'transfer',p_price_idr:p.price_idr});
   if(!r.ok||typeof r.data!=='string'||!ORDER.test(r.data)){const m=String(r.data?.message||'');if(m.includes('IMPORT_DOMAIN_ALREADY_CLAIMED'))return reply(409,'IMPORT_DOMAIN_ALREADY_CLAIMED');if(m.includes('IMPORT_DOMAIN_INVALID'))return reply(400,'IMPORT_DOMAIN_INVALID');return reply(503,'IMPORT_UNAVAILABLE');}
   return reply(201,'DOMAIN_IMPORT_TRANSFER_ORDER_CREATED',{order:{orderId:r.data,domain,mode:'transfer',priceIdr:p.price_idr}});
  }

  const o=await read();if(!o)return reply(404,'IMPORT_ORDER_NOT_FOUND');
  if(o.mode!=='transfer')return reply(409,'IMPORT_MODE_NOT_SUPPORTED');

  if(route==='zone'){
   if(o.payment_state!=='paid')return reply(409,'IMPORT_PAYMENT_REQUIRED');
   if(o.review_reason)return reply(409,'IMPORT_ORDER_UNDER_REVIEW',{needsReview:true});
   const record=async z=>{
    const s=provider.publicZoneState(z),status=s.status.toLowerCase();
    if(!ZONE_ID.test(s.id)||!ZONE_STATUS.includes(status)){await flag('ZONE_STATUS_UNEXPECTED');return reply(409,'IMPORT_ZONE_STATUS_UNEXPECTED',{needsReview:true});}
    const args={p_user_id:uid,p_order_id:id,p_zone_id:s.id,p_zone_status:status,p_name_servers:s.nameServers,p_original_name_servers:s.originalNameServers};
    if(!(await rpc('domain_import_record_zone_v2',args)).ok&&!(await rpc('domain_import_record_zone_v2',args)).ok)return reply(503,'IMPORT_ZONE_RECORD_FAILED');
    return reply(200,'DOMAIN_IMPORT_TRANSFER_ZONE',{zone:{status,active:status==='active',nameServers:s.nameServers,originalNameServers:s.originalNameServers}});
   };
   const adoptable=async z=>{
    if(!matches(z,o))return false;
    const s=provider.publicZoneState(z),st=s.status.toLowerCase(),t=Date.parse(s.createdOn||'');
    if(!['pending','initializing'].includes(st)||!Number.isFinite(t)||now()-t>7*864e5||t>now()+300000)return false;
    const rows=await rest('domain_import_orders',{select:'order_id',zone_id:'eq.'+s.id,order_id:'neq.'+id,limit:'1'});
    return rows.length===0;
   };
   if(o.zone_id){let z;try{z=await provider.getFullZoneStatus(env,o.zone_id);}catch{return reply(503,'IMPORT_ZONE_UNAVAILABLE');}
    if(z?.id!==o.zone_id||!matches(z,o)){await flag('ZONE_MISMATCH');return reply(409,'IMPORT_ZONE_MISMATCH',{needsReview:true});}
    return record(z);}
   let existing;try{existing=await provider.findFullZone(env,o.domain);}catch{return reply(503,'IMPORT_ZONE_UNAVAILABLE');}
   if(existing){if(await adoptable(existing))return record(existing);await flag('ZONE_ALREADY_EXISTS');return reply(409,'IMPORT_ZONE_ALREADY_EXISTS',{needsReview:true});}
   let z;try{z=await provider.createFullZone(env,o.domain);}catch{
    const again=await read().catch(()=>null);if(again?.zone_id)return reply(409,'IMPORT_ZONE_IN_PROGRESS');
    let found=null;try{found=await provider.findFullZone(env,o.domain);}catch{}
    if(found){if(await adoptable(found))return record(found);await flag('ZONE_ALREADY_EXISTS');return reply(409,'IMPORT_ZONE_ALREADY_EXISTS',{needsReview:true});}
    await flag('ZONE_CREATE_FAILED');return reply(503,'IMPORT_ZONE_CREATE_FAILED',{needsReview:true});}
   if(!matches(z,o)){await flag('ZONE_MISMATCH');return reply(409,'IMPORT_ZONE_MISMATCH',{needsReview:true});}
   return record(z);
  }

  if(route==='submit'){
   if(o.payment_state!=='paid')return reply(409,'IMPORT_PAYMENT_REQUIRED');
   if(o.review_reason)return reply(409,'IMPORT_ORDER_UNDER_REVIEW',{needsReview:true});
   if(['transfer_requested','transfer_pending','completed'].includes(o.import_state)||o.transfer_status)return reply(409,'IMPORT_TRANSFER_ALREADY_SUBMITTED');
   if(o.import_state!=='zone_active'||!ZONE_ID.test(String(o.zone_id||'')))return reply(409,'IMPORT_ZONE_NOT_ACTIVE');
   let z;try{z=await provider.getFullZoneStatus(env,o.zone_id);}catch{return reply(503,'IMPORT_ZONE_UNAVAILABLE');}
   if(z?.id!==o.zone_id||!matches(z,o)){await flag('ZONE_MISMATCH');return reply(409,'IMPORT_ZONE_MISMATCH',{needsReview:true});}
   if(String(z.status).toLowerCase()!=='active')return reply(409,'IMPORT_ZONE_NOT_ACTIVE');
   const ref='/accounts/'+account+'/registrar/registrations/'+o.domain;
   const claim=await setTransfer('submitted',ref,true);
   if(!claim.ok)return claim.status>=500?reply(503,'IMPORT_UNAVAILABLE'):reply(409,'IMPORT_TRANSFER_ALREADY_SUBMITTED');
   claimed=true;
   const r=await cf('POST',encodeURIComponent(o.domain)+'/transfer-in',{auth_code:base64(epp),contacts:{registrant},privacy_mode:privacy});
   epp=null;
   if(r.status>=500)return reply(503,'IMPORT_TRANSFER_SUBMIT_UNCLEAR');
   const msg=String(r.data?.errors?.[0]?.message||'').slice(0,200);
   if(r.status===200||r.status===202){
    const local=mapCf(r.data?.result?.state);
    const rec=await setTransfer(local,null,false);if(!rec.ok){try{warnImpl({event:'domain_import_transfer_record_failed',order_id:id});}catch{}}
    return reply(202,'DOMAIN_IMPORT_TRANSFER_SUBMITTED',{transfer:{state:r.data?.result?.state??'pending'}});
   }
   if(/already exists/i.test(msg))return reply(202,'DOMAIN_IMPORT_TRANSFER_SUBMITTED',{transfer:{state:'pending'}});
   if(r.status>=400&&r.status<500){await setTransfer('failed',null,false);return reply(422,'IMPORT_TRANSFER_REJECTED',{needsReview:true,message:msg});}
   return reply(503,'IMPORT_TRANSFER_SUBMIT_UNCLEAR');
  }

  if(!['transfer_requested','transfer_pending'].includes(o.import_state))return reply(200,'DOMAIN_IMPORT_TRANSFER_STATUS',{order:view(o),checkedWithCloudflare:false});
  if(o.import_state==='transfer_pending'&&now()-Date.parse(o.updated_at)<30000)return reply(200,'DOMAIN_IMPORT_TRANSFER_STATUS',{order:view(o),checkedWithCloudflare:false,throttled:true});
  const r=await cf('GET',encodeURIComponent(o.domain)+'/transfer-in-status');
  if(r.status>=500||(r.status!==200&&r.status<400))return reply(503,'IMPORT_TRANSFER_STATUS_UNAVAILABLE');
  if(r.status!==200||!r.data?.result?.state){
   if(o.import_state==='transfer_requested'&&now()-Date.parse(o.updated_at)>1800000){await flag('TRANSFER_WORKFLOW_NOT_FOUND');return reply(409,'IMPORT_TRANSFER_WORKFLOW_NOT_FOUND',{needsReview:true});}
   return reply(200,'DOMAIN_IMPORT_TRANSFER_STATUS',{order:view(o),checkedWithCloudflare:true,transfer:{state:'unconfirmed'}});
  }
  const cfState=String(r.data.result.state),local=mapCf(cfState);
  const rec=await setTransfer(local,null,false);
  if(!rec.ok)return reply(503,'IMPORT_TRANSFER_RECORD_FAILED');
  const errMsg=cfState==='failed'?String(r.data.result.error?.message||'').slice(0,200):undefined;
  return reply(200,'DOMAIN_IMPORT_TRANSFER_STATUS',{checkedWithCloudflare:true,transfer:{state:cfState,completed:cfState==='succeeded',actionRequired:cfState==='action_required',...(errMsg?{message:errMsg}:{})}});
 }catch{
  if(claimed){try{warnImpl({event:'domain_import_transfer_submit_unclear',order_id:id});}catch{}return reply(503,'IMPORT_TRANSFER_SUBMIT_UNCLEAR');}
  return reply(503,'IMPORT_UNAVAILABLE');
 }finally{budget.close();request.signal?.removeEventListener('abort',abort);}
}
