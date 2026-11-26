const BASE='/api/commerce/domains/manage/import';
const ORDER=/^IMP-[a-f0-9]{40}$/;
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const SUPABASE='https://polvmlrhqoiflumibfqs.supabase.co/';
const PRICE_NAMESERVER_IDR=30000;
const MAX_OPEN=5;
const DOMAIN=/^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z](?:[a-z0-9-]{0,61}[a-z0-9])$/;
const COLUMNS='order_id,domain,mode,price_idr,payment_state,import_state,zone_status,name_servers,original_name_servers,created_at,paid_at,review_reason';
const view=o=>({orderId:o.order_id,domain:o.domain,mode:o.mode,priceIdr:o.price_idr??null,paymentState:o.payment_state,importState:o.import_state,zoneStatus:o.zone_status??null,nameServers:Array.isArray(o.name_servers)?o.name_servers:[],originalNameServers:Array.isArray(o.original_name_servers)?o.original_name_servers:[],createdAt:o.created_at,paidAt:o.paid_at??null,needsReview:Boolean(o.review_reason),canPay:o.import_state==='created'&&['unpaid','pending'].includes(o.payment_state)&&Number.isSafeInteger(o.price_idr)&&o.price_idr>0,canCancel:o.import_state==='created'&&['unpaid','failed'].includes(o.payment_state)});
function deadline(ms){const c=new AbortController();let stop;const stopped=new Promise((_,reject)=>{stop=()=>reject(Error('TIMEOUT'));c.signal.addEventListener('abort',stop,{once:true});});const timer=setTimeout(()=>c.abort(),ms);return {signal:c.signal,abort:()=>c.abort(),wait:p=>Promise.race([p,stopped]),close:()=>{clearTimeout(timer);c.signal.removeEventListener('abort',stop);}};}
async function readJson(stream,wait,limit){const reader=stream?.getReader();if(!reader)throw Error('INVALID_JSON');try{let size=0;const chunks=[];for(;;){const x=await wait(reader.read());if(x.done)break;size+=x.value.length;if(size>limit)throw Error('BODY_TOO_LARGE');chunks.push(x.value);}const bytes=new Uint8Array(size);let pos=0;for(const chunk of chunks){bytes.set(chunk,pos);pos+=chunk.length;}return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}finally{reader.cancel().catch(()=>{});try{reader.releaseLock();}catch{}}}
export async function domainImportOrdersResponse(request,env,{fetchImpl=globalThis.fetch}={}){
 const url=new URL(request.url),path=url.pathname,prefix=BASE+'/orders/';
 let route=null;
 if(path===BASE+'/orders')route='collection';else if(path===prefix+'cancel')route='cancel';else if(path.startsWith(prefix)&&ORDER.test(path.slice(prefix.length)))route='single';
 if(!route)return null;
 const allowed={collection:['GET','POST'],cancel:['POST'],single:['GET']}[route];
 const reply=(status,code,extra={},headers={})=>new Response(JSON.stringify({code,environment:'production',...extra}),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff',...headers}});
 if(url.protocol!=='https:'||url.hostname!=='ngeblogging.com'||url.port)return reply(404,'NOT_FOUND');
 if(!allowed.includes(request.method))return reply(405,'METHOD_NOT_ALLOWED',{},{allow:allowed.join(', ')});
 if(url.search)return reply(400,'QUERY_NOT_ALLOWED');
 if(env?.DOMAIN_IMPORT_ENABLED!=='true')return reply(503,'DOMAIN_IMPORT_DISABLED');
 const write=request.method==='POST';
 if(write&&request.headers.get('origin')!==url.origin)return reply(403,'ORIGIN_NOT_ALLOWED');
 const auth=request.headers.get('authorization')||'';if(!/^Bearer [^\s]{1,8192}$/.test(auth))return reply(401,'AUTH_REQUIRED');
 if(write&&!/^application\/json(?:\s*;.*)?$/i.test(request.headers.get('content-type')||''))return reply(415,'JSON_REQUIRED');
 let base;try{base=new URL(env.SUPABASE_URL);if(base.href!==SUPABASE)throw Error();}catch{return reply(503,'DOMAIN_IMPORT_CONFIGURATION_UNAVAILABLE',{configurationUnavailable:true});}
 const srv=env.SUPABASE_SERVICE_ROLE_KEY;
 if(typeof srv!=='string'||!srv||typeof env.SUPABASE_PUBLISHABLE_KEY!=='string'||!env.SUPABASE_PUBLISHABLE_KEY)return reply(503,'DOMAIN_IMPORT_CONFIGURATION_UNAVAILABLE',{configurationUnavailable:true});
 const budget=deadline(10000),abort=()=>budget.abort();request.signal?.addEventListener('abort',abort,{once:true});
 try{
  let b=null;
  if(write){try{b=await readJson(request.body,budget.wait,1024);}catch(e){return reply(e.message==='BODY_TOO_LARGE'?413:400,e.message==='BODY_TOO_LARGE'?'BODY_TOO_LARGE':'INVALID_BODY');}if(!b||Array.isArray(b)||typeof b!=='object')return reply(400,'INVALID_REQUEST');}
  const v=await budget.wait(fetchImpl(new URL('/auth/v1/user',base).href,{method:'GET',redirect:'manual',headers:{authorization:auth,apikey:env.SUPABASE_PUBLISHABLE_KEY},signal:budget.signal}));
  if([401,403].includes(v.status))return reply(401,'INVALID_SESSION');if(v.status!==200)return reply(503,'AUTH_UNAVAILABLE');
  const user=await readJson(v.body,budget.wait,32768);if(typeof user?.id!=='string'||!UUID.test(user.id))return reply(401,'INVALID_SESSION');const uid=user.id.toLowerCase();
  const hdr={apikey:srv,authorization:'Bearer '+srv};
  const call=async(target,options)=>{const r=await budget.wait(fetchImpl(target,{...options,redirect:'manual',signal:budget.signal}));if(r.status===204)return {status:204,data:null};let data=null;try{data=await readJson(r.body,budget.wait,32768);}catch{}return {status:r.status,data};};
  const get=async q=>{const t=new URL('/rest/v1/domain_import_orders',base);for(const [k,x] of Object.entries(q))t.searchParams.set(k,x);const r=await call(t.href,{method:'GET',headers:hdr});if(r.status!==200||!Array.isArray(r.data))throw Error('STORAGE_UNAVAILABLE');return r.data;};
  const rpc=(name,args)=>call(new URL('/rest/v1/rpc/'+name,base).href,{method:'POST',headers:{...hdr,'content-type':'application/json'},body:JSON.stringify(args)});
  const one=async id=>{const rows=await get({select:COLUMNS,order_id:'eq.'+id,user_id:'eq.'+uid,limit:'1'});return rows.length===1&&rows[0].order_id===id?rows[0]:null;};
  if(route==='collection'&&!write){const rows=await get({select:COLUMNS,user_id:'eq.'+uid,import_state:'neq.cancelled',order:'created_at.desc',limit:'50'});return reply(200,'DOMAIN_IMPORT_ORDERS',{orders:rows.map(view)});}
  if(route==='single'){const o=await one(path.slice(prefix.length));return o?reply(200,'DOMAIN_IMPORT_ORDER',{order:view(o)}):reply(404,'IMPORT_ORDER_NOT_FOUND');}
  if(route==='cancel'){
   if(Object.keys(b).length!==1||typeof b.orderId!=='string'||!ORDER.test(b.orderId))return reply(400,'INVALID_REQUEST');
   const r=await rpc('domain_import_cancel_v1',{p_user_id:uid,p_order_id:b.orderId});
   if(r.status===200||r.status===204)return reply(200,'DOMAIN_IMPORT_ORDER_CANCELLED');
   return String(r.data?.message||'').includes('IMPORT_ORDER_NOT_CANCELLABLE')?reply(409,'IMPORT_ORDER_NOT_CANCELLABLE'):reply(503,'IMPORT_UNAVAILABLE');
  }
  if(Object.keys(b).length!==2||typeof b.domain!=='string'||typeof b.mode!=='string')return reply(400,'INVALID_REQUEST');
  const domain=b.domain.trim().toLowerCase();
  if(!DOMAIN.test(domain)||domain==='ngeblogging.com'||domain.endsWith('.ngeblogging.com'))return reply(400,'IMPORT_DOMAIN_INVALID');
  if(b.mode==='transfer')return reply(409,'IMPORT_TRANSFER_NOT_AVAILABLE');
  if(b.mode!=='nameserver')return reply(400,'IMPORT_MODE_INVALID');
  const open=await get({select:'order_id',user_id:'eq.'+uid,import_state:'eq.created',payment_state:'in.(unpaid,pending)',limit:'50'});
  if(open.length>=MAX_OPEN)return reply(429,'IMPORT_TOO_MANY_OPEN_ORDERS');
  const r=await rpc('domain_import_create_v1',{p_user_id:uid,p_domain:domain,p_mode:'nameserver',p_price_idr:PRICE_NAMESERVER_IDR});
  if(r.status!==200||typeof r.data!=='string'||!ORDER.test(r.data)){const m=String(r.data?.message||'');if(m.includes('IMPORT_DOMAIN_ALREADY_CLAIMED'))return reply(409,'IMPORT_DOMAIN_ALREADY_CLAIMED');if(m.includes('IMPORT_DOMAIN_INVALID'))return reply(400,'IMPORT_DOMAIN_INVALID');return reply(503,'IMPORT_UNAVAILABLE');}
  const o=await one(r.data);if(!o)return reply(503,'IMPORT_UNAVAILABLE');
  return reply(201,'DOMAIN_IMPORT_ORDER_CREATED',{order:view(o)});
 }catch{return reply(503,'IMPORT_UNAVAILABLE');}
 finally{budget.close();request.signal?.removeEventListener('abort',abort);}
}
