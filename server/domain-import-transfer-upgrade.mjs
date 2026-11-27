const BASE='/api/commerce/domains/manage/import/transfer/upgrade';
const ORDER=/^IMP-[a-f0-9]{40}$/;
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const SUPABASE='https://polvmlrhqoiflumibfqs.supabase.co/';
const ADMIN_ID='91d4b436-6d7a-4e46-93f5-1ecdc6d33fb3';
const ADMIN_EMAIL='triapriyogibahari7@gmail.com';
const TLDS=['com','net','org'];
const isAdmin=u=>u?.id===ADMIN_ID&&typeof u.email==='string'&&u.email.trim().toLowerCase()===ADMIN_EMAIL&&typeof u.email_confirmed_at==='string'&&Number.isFinite(Date.parse(u.email_confirmed_at))&&u.is_anonymous!==true;
const reply=(status,code,extra={})=>new Response(JSON.stringify({code,environment:'production',...extra}),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff',...(status===405?{allow:'POST'}:{})}});
async function readJson(res,limit){const text=await res.text();if(text.length>limit)throw Error('BODY_TOO_LARGE');return JSON.parse(text);}
export async function domainImportTransferUpgradeResponse(request,env,{fetchImpl=globalThis.fetch}={}){
 const url=new URL(request.url);
 if(url.pathname!==BASE)return null;
 if(url.protocol!=='https:'||url.hostname!=='ngeblogging.com'||url.port)return reply(404,'NOT_FOUND');
 if(request.method!=='POST')return reply(405,'METHOD_NOT_ALLOWED');
 if(url.search)return reply(400,'QUERY_NOT_ALLOWED');
 if(env?.DOMAIN_IMPORT_ENABLED!=='true'||env.DOMAIN_IMPORT_TRANSFER_ENABLED!=='true')return reply(503,'DOMAIN_IMPORT_TRANSFER_DISABLED');
 if(request.headers.get('origin')!==url.origin)return reply(403,'ORIGIN_NOT_ALLOWED');
 const auth=request.headers.get('authorization')||'';
 if(!/^Bearer [^\s]{1,8192}$/.test(auth))return reply(401,'AUTH_REQUIRED');
 if(!/^application\/json(?:\s*;.*)?$/i.test(request.headers.get('content-type')||''))return reply(415,'JSON_REQUIRED');
 let base;try{base=new URL(env.SUPABASE_URL);if(base.href!==SUPABASE)throw Error();}catch{return reply(503,'DOMAIN_IMPORT_CONFIGURATION_UNAVAILABLE',{configurationUnavailable:true});}
 const srv=env.SUPABASE_SERVICE_ROLE_KEY;
 if(typeof srv!=='string'||!srv||typeof env.SUPABASE_PUBLISHABLE_KEY!=='string'||!env.SUPABASE_PUBLISHABLE_KEY)return reply(503,'DOMAIN_IMPORT_CONFIGURATION_UNAVAILABLE',{configurationUnavailable:true});
 const c=new AbortController(),timer=setTimeout(()=>c.abort(),10000);
 try{
  let b;try{b=JSON.parse(await request.text());}catch{return reply(400,'INVALID_BODY');}
  if(!b||Array.isArray(b)||typeof b!=='object'||Object.keys(b).length!==1||typeof b.orderId!=='string'||!ORDER.test(b.orderId))return reply(400,'INVALID_REQUEST');
  const id=b.orderId;
  const v=await fetchImpl(new URL('/auth/v1/user',base).href,{method:'GET',redirect:'manual',headers:{authorization:auth,apikey:env.SUPABASE_PUBLISHABLE_KEY},signal:c.signal});
  if([401,403].includes(v.status))return reply(401,'INVALID_SESSION');
  if(v.status!==200)return reply(503,'AUTH_UNAVAILABLE');
  const user=await readJson(v,32768);
  if(typeof user?.id!=='string'||!UUID.test(user.id))return reply(401,'INVALID_SESSION');
  const uid=user.id.toLowerCase();
  if(!isAdmin({...user,id:uid}))return reply(403,'IMPORT_UPGRADE_NOT_ALLOWED');
  const hdr={apikey:srv,authorization:'Bearer '+srv};
  const t=new URL('/rest/v1/domain_import_orders',base);
  t.searchParams.set('select','order_id,domain,mode,payment_state,import_state');t.searchParams.set('order_id','eq.'+id);t.searchParams.set('user_id','eq.'+uid);t.searchParams.set('limit','1');
  const r=await fetchImpl(t.href,{method:'GET',redirect:'manual',headers:hdr,signal:c.signal});
  if(r.status!==200)return reply(503,'IMPORT_UNAVAILABLE');
  const rows=await readJson(r,32768),o=Array.isArray(rows)&&rows.length===1&&rows[0].order_id===id?rows[0]:null;
  if(!o)return reply(404,'IMPORT_ORDER_NOT_FOUND');
  const view={orderId:id,domain:o.domain,mode:'transfer'};
  if(o.mode==='transfer')return reply(200,'DOMAIN_IMPORT_TRANSFER_UPGRADED',{order:view,alreadyUpgraded:true});
  if(!TLDS.includes(String(o.domain).slice(String(o.domain).lastIndexOf('.')+1)))return reply(409,'IMPORT_TRANSFER_TLD_NOT_AVAILABLE');
  const p=await fetchImpl(new URL('/rest/v1/rpc/domain_import_upgrade_to_transfer_admin_v1',base).href,{method:'POST',redirect:'manual',headers:{...hdr,'content-type':'application/json'},body:JSON.stringify({p_user_id:uid,p_order_id:id}),signal:c.signal});
  if(p.status===200||p.status===204)return reply(200,'DOMAIN_IMPORT_TRANSFER_UPGRADED',{order:view});
  let m='';try{m=String((await readJson(p,32768))?.message||'');}catch{}
  if(m.includes('IMPORT_ORDER_NOT_UPGRADABLE'))return reply(409,'IMPORT_ORDER_NOT_UPGRADABLE');
  return reply(503,'IMPORT_UNAVAILABLE');
 }catch{return reply(503,'IMPORT_UNAVAILABLE');}
 finally{clearTimeout(timer);}
}
