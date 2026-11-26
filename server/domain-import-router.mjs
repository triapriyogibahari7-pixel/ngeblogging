import {domainImportOrdersResponse} from './domain-import-orders.mjs';
import {domainImportPaymentResponse} from './domain-import-payment.mjs';
import {domainImportZoneResponse,importZoneExists} from './domain-import-zone.mjs';
const BASE='/api/commerce/domains/manage/import';
const ORDER=/^IMP-[a-f0-9]{40}$/;
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const SUPABASE='https://polvmlrhqoiflumibfqs.supabase.co/';
const INVALID=['DOMAIN_REQUIRED','INVALID_DOMAIN','INVALID_ROOT_DOMAIN','USE_MANAGED_SUBDOMAIN'];
const reply=(status,code)=>new Response(JSON.stringify({code,environment:'production'}),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
async function guard(request,env,{fetchImpl,zoneExists}){
 const url=new URL(request.url),create=url.pathname===BASE+'/orders',pay=url.pathname===BASE+'/checkout';
 if(request.method!=='POST'||(!create&&!pay))return null;
 if(env?.DOMAIN_IMPORT_ENABLED!=='true'||url.protocol!=='https:'||url.hostname!=='ngeblogging.com'||url.port||url.search||request.headers.get('origin')!==url.origin)return null;
 const auth=request.headers.get('authorization')||'';if(!/^Bearer [^\s]{1,8192}$/.test(auth))return null;
 if(!/^application\/json(?:\s*;.*)?$/i.test(request.headers.get('content-type')||''))return null;
 let b;try{const text=await request.clone().text();if(text.length>1024)return null;b=JSON.parse(text);}catch{return null;}
 if(!b||typeof b!=='object'||Array.isArray(b))return null;
 let domain=null,orderId=null;
 if(create){if(typeof b.domain!=='string'||b.mode!=='nameserver')return null;domain=b.domain.trim().toLowerCase();}
 else{if(typeof b.orderId!=='string'||!ORDER.test(b.orderId))return null;orderId=b.orderId;}
 const srv=env.SUPABASE_SERVICE_ROLE_KEY;
 if(typeof srv!=='string'||!srv||typeof env.SUPABASE_PUBLISHABLE_KEY!=='string'||!env.SUPABASE_PUBLISHABLE_KEY||env.SUPABASE_URL?.replace(/\/$/,'')+'/'!==SUPABASE)return null;
 const c=new AbortController(),timer=setTimeout(()=>c.abort(),8000);
 try{
  const v=await fetchImpl(new URL('/auth/v1/user',SUPABASE).href,{method:'GET',redirect:'manual',headers:{authorization:auth,apikey:env.SUPABASE_PUBLISHABLE_KEY},signal:c.signal});
  if(v.status!==200)return null;
  const user=await v.json();if(typeof user?.id!=='string'||!UUID.test(user.id))return null;
  if(pay){
   const t=new URL('/rest/v1/domain_import_orders',SUPABASE);t.searchParams.set('select','order_id,domain,payment_state,import_state');t.searchParams.set('order_id','eq.'+orderId);t.searchParams.set('user_id','eq.'+user.id.toLowerCase());t.searchParams.set('limit','1');
   const r=await fetchImpl(t.href,{method:'GET',redirect:'manual',headers:{apikey:srv,authorization:'Bearer '+srv},signal:c.signal});
   if(r.status!==200)return reply(503,'IMPORT_ZONE_CHECK_UNAVAILABLE');
   const rows=await r.json();const row=Array.isArray(rows)&&rows.length===1?rows[0]:null;
   if(!row||row.order_id!==orderId||row.payment_state!=='unpaid'||row.import_state!=='created'||typeof row.domain!=='string')return null;
   domain=row.domain;
  }
  let exists;
  try{exists=await zoneExists(domain);}catch(e){if(INVALID.includes(e?.code))return create?reply(400,'IMPORT_DOMAIN_INVALID'):null;return reply(503,'IMPORT_ZONE_CHECK_UNAVAILABLE');}
  return exists?reply(409,'IMPORT_ZONE_ALREADY_EXISTS'):null;
 }catch{return reply(503,'IMPORT_ZONE_CHECK_UNAVAILABLE');}
 finally{clearTimeout(timer);}
}
export async function domainImportRouterResponse(request,env,deps={}){
 const url=new URL(request.url);
 if(!url.pathname.startsWith(BASE+'/'))return null;
 const d={fetchImpl:globalThis.fetch,zoneExists:domain=>importZoneExists(env,domain),orders:domainImportOrdersResponse,payment:domainImportPaymentResponse,zone:domainImportZoneResponse,...deps};
 const blocked=await guard(request,env,d);if(blocked)return blocked;
 return (await d.orders(request,env,{fetchImpl:d.fetchImpl}))??(await d.payment(request,env,{fetchImpl:d.fetchImpl,now:d.now,warnImpl:d.warnImpl}))??(await d.zone(request,env,{fetchImpl:d.fetchImpl,provider:d.provider,warnImpl:d.warnImpl}));
}
