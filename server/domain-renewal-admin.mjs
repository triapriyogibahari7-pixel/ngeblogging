import {readRegisteredDomainMetadata} from './domain-registered-metadata.mjs';
const BASE='/api/commerce/domains/manage/renewal-admin';
const REN=/^REN-[a-f0-9]{40}$/;
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const SUPABASE='https://polvmlrhqoiflumibfqs.supabase.co/';
const ADMIN_ID='91d4b436-6d7a-4e46-93f5-1ecdc6d33fb3';
const ADMIN_EMAIL='triapriyogibahari7@gmail.com';
const MIN_EXTENSION_MS=300*86400000;
const isAdmin=u=>u?.id===ADMIN_ID&&typeof u.email==='string'&&u.email.trim().toLowerCase()===ADMIN_EMAIL&&typeof u.email_confirmed_at==='string'&&Number.isFinite(Date.parse(u.email_confirmed_at))&&u.is_anonymous!==true;
const reply=(status,code,extra={},headers={})=>new Response(JSON.stringify({code,environment:'production',...extra}),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'private, no-store',vary:'Authorization','x-content-type-options':'nosniff',...headers}});
const COLUMNS='order_id,user_id,domain_order_id,domain,price_idr,payment_state,renewal_state,paid_at,expires_at_before,expires_at_after,completed_at,created_at,review_reason';
const PURCHASE='order_id,user_id,quote_id,environment,currency,amount_idr,payment_state,registration_state,midtrans_transaction_id,paid_at,registered_at,registrar_domain_ref,review_reason';
const view=r=>({orderId:r.order_id,userId:r.user_id,domainOrderId:r.domain_order_id,domain:r.domain,amountIdr:r.price_idr,paymentState:r.payment_state,renewalState:r.renewal_state,paidAt:r.paid_at,expiresAtBefore:r.expires_at_before,expiresAtAfter:r.expires_at_after,completedAt:r.completed_at,createdAt:r.created_at,reviewReason:r.review_reason});
export async function domainRenewalAdminResponse(request,env,{fetchImpl=globalThis.fetch,readMetadata=readRegisteredDomainMetadata}={}){
 const url=new URL(request.url);
 if(!url.pathname.startsWith(BASE+'/'))return null;
 const routes={'/orders':{GET:'list'},'/complete':{POST:'complete'}};
 const route=routes[url.pathname.slice(BASE.length)];if(!route)return reply(404,'NOT_FOUND');
 const action=route[request.method];if(!action)return reply(405,'METHOD_NOT_ALLOWED',{},{allow:Object.keys(route).join(', ')});
 if(url.protocol!=='https:'||url.hostname!=='ngeblogging.com'||url.port||url.search)return reply(404,'NOT_FOUND');
 if(env?.DOMAIN_RENEWAL_ENABLED!=='true')return reply(503,'DOMAIN_RENEWAL_DISABLED');
 if(request.method!=='GET'&&request.headers.get('origin')!==url.origin)return reply(403,'ORIGIN_NOT_ALLOWED');
 if(request.headers.has('origin')&&request.headers.get('origin')!==url.origin)return reply(403,'ORIGIN_NOT_ALLOWED');
 if(request.method==='POST'&&!/^application\/json(?:\s*;.*)?$/i.test(request.headers.get('content-type')||''))return reply(415,'JSON_REQUIRED');
 if(env?.DOMAIN_ORDER_ENV!=='production')return reply(503,'DOMAIN_RENEWAL_CONFIGURATION_UNAVAILABLE');
 let base;try{base=new URL(env.SUPABASE_URL);if(base.href!==SUPABASE||!env.SUPABASE_SERVICE_ROLE_KEY||!env.SUPABASE_PUBLISHABLE_KEY)throw Error();}catch{return reply(503,'DOMAIN_RENEWAL_CONFIGURATION_UNAVAILABLE');}
 const auth=request.headers.get('authorization')||'';if(!/^Bearer [^\s]{1,8192}$/.test(auth))return reply(401,'AUTH_REQUIRED');
 const c=new AbortController(),timer=setTimeout(()=>c.abort(),20000),abort=()=>c.abort();request.signal?.addEventListener('abort',abort,{once:true});
 const service={apikey:env.SUPABASE_SERVICE_ROLE_KEY,authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY};
 const select=async(table,params)=>{const t=new URL('/rest/v1/'+table,base);for(const [k,v] of Object.entries(params))t.searchParams.set(k,v);const r=await fetchImpl(t.href,{method:'GET',redirect:'manual',cache:'no-store',headers:service,signal:c.signal});if(r.status!==200)throw Error('STORAGE');const rows=await r.json();return Array.isArray(rows)?rows:[];};
 try{
  const v=await fetchImpl(new URL('/auth/v1/user',base).href,{method:'GET',redirect:'manual',headers:{authorization:auth,apikey:env.SUPABASE_PUBLISHABLE_KEY},signal:c.signal});
  if([401,403].includes(v.status))return reply(401,'INVALID_SESSION');if(v.status!==200)return reply(503,'AUTH_UNAVAILABLE');
  const user=await v.json();if(typeof user?.id!=='string'||!UUID.test(user.id))return reply(401,'INVALID_SESSION');
  if(!isAdmin(user))return reply(403,'ADMIN_REQUIRED');
  if(action==='list'){
   const rows=await select('domain_renewal_orders',{select:COLUMNS,renewal_state:'in.(awaiting_admin,review_required)',order:'created_at.asc,order_id.asc',limit:'100'});
   return reply(200,'DOMAIN_RENEWAL_ADMIN_ORDERS',{orders:rows.map(view)});
  }
  let b;try{b=await request.json();}catch{return reply(400,'INVALID_BODY');}
  if(!b||Array.isArray(b)||Object.keys(b).length!==1||typeof b.orderId!=='string'||!REN.test(b.orderId))return reply(400,'INVALID_COMPLETE_REQUEST');
  const rs=await select('domain_renewal_orders',{select:COLUMNS,order_id:'eq.'+b.orderId,limit:'2'});
  if(!rs.length)return reply(404,'RENEWAL_ORDER_NOT_FOUND');
  const r=rs.length===1?rs[0]:null;if(!r||r.order_id!==b.orderId||!UUID.test(r.user_id||''))return reply(503,'RENEWAL_DOMAIN_UNVERIFIED');
  if(r.payment_state!=='paid'||r.renewal_state!=='awaiting_admin')return reply(409,'RENEWAL_NOT_COMPLETABLE');
  const os=await select('domain_purchase_orders',{select:PURCHASE,order_id:'eq.'+r.domain_order_id,user_id:'eq.'+r.user_id,environment:'eq.production',limit:'2'});
  const o=os.length===1?os[0]:null;if(!o||o.order_id!==r.domain_order_id||o.user_id!==r.user_id||!UUID.test(o.quote_id||''))return reply(503,'RENEWAL_DOMAIN_UNVERIFIED');
  const qs=await select('domain_sale_quotes',{select:'id,user_id,environment,domain,currency,sale_price_idr,provider_id,registrar_cost_idr',id:'eq.'+o.quote_id,user_id:'eq.'+r.user_id,environment:'eq.production',limit:'2'});
  const q=qs.length===1?qs[0]:null;if(!q||q.id!==o.quote_id||q.domain!==r.domain)return reply(503,'RENEWAL_DOMAIN_UNVERIFIED');
  const meta=await readMetadata(env,o,q,{owner:r.user_id,fetchImpl,signal:c.signal});
  if(meta?.status!=='observed'||typeof meta.expiresAt!=='string'||!Number.isFinite(Date.parse(meta.expiresAt)))return reply(503,'RENEWAL_DOMAIN_UNVERIFIED');
  const before=Date.parse(r.expires_at_before),after=Date.parse(meta.expiresAt);
  if(!Number.isFinite(before)||after-before<MIN_EXTENSION_MS)return reply(409,'RENEWAL_NOT_YET_EXTENDED',{expiresAt:meta.expiresAt,expiresAtBefore:r.expires_at_before});
  const done=await fetchImpl(new URL('/rest/v1/rpc/domain_renewal_complete_v1',base).href,{method:'POST',redirect:'manual',cache:'no-store',headers:{...service,'content-type':'application/json'},body:JSON.stringify({p_order_id:r.order_id,p_expires_after:meta.expiresAt}),signal:c.signal});
  if(done.status!==200)return reply(503,'DOMAIN_RENEWAL_ADMIN_UNAVAILABLE');
  const res=await done.json();
  if(res!=='completed')return reply(409,'RENEWAL_NOT_COMPLETABLE');
  return reply(200,'DOMAIN_RENEWAL_COMPLETED',{orderId:r.order_id,domain:r.domain,expiresAtAfter:meta.expiresAt});
 }catch{return reply(503,'DOMAIN_RENEWAL_ADMIN_UNAVAILABLE');}
 finally{clearTimeout(timer);request.signal?.removeEventListener('abort',abort);}
}
