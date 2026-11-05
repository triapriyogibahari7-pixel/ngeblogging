const PATH='/api/commerce/domains/orders/history';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const ORDER=/^DOM-[a-f0-9]{40}$/;
const FIELDS='order_id,user_id,quote_id,environment,currency,amount_idr,payment_state,registration_state,midtrans_transaction_id,paid_at,registered_at,registrar_domain_ref,review_reason,created_at,updated_at';
export async function domainOrderHistoryResponse(request,env,{fetchImpl=globalThis.fetch,toView}={}){
 const url=new URL(request.url);if(url.pathname!==PATH)return null;
 const reply=(status,code,extra={})=>new Response(JSON.stringify({code,environment:'production',...extra}),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','vary':'Authorization','x-content-type-options':'nosniff',...(status===405?{allow:'GET'}:{})}});
 if(url.protocol!=='https:'||url.hostname!=='ngeblogging.com'||url.port)return reply(404,'NOT_FOUND');
 if(request.method!=='GET')return reply(405,'METHOD_NOT_ALLOWED');
 if(url.search)return reply(400,'QUERY_NOT_ALLOWED');
 if(request.headers.has('origin')&&request.headers.get('origin')!==url.origin)return reply(403,'ORIGIN_NOT_ALLOWED');
 if(env?.DOMAIN_ORDER_ENV!=='production'||typeof toView!=='function')return reply(503,'DOMAIN_HISTORY_UNAVAILABLE');
 const auth=request.headers.get('authorization')||'';if(!/^Bearer [^\s]{1,8192}$/.test(auth))return reply(401,'AUTH_REQUIRED');
 let base;try{base=new URL(env.SUPABASE_URL);if(base.href!=='https://polvmlrhqoiflumibfqs.supabase.co/'||typeof env.SUPABASE_PUBLISHABLE_KEY!=='string'||!env.SUPABASE_PUBLISHABLE_KEY||typeof env.SUPABASE_SERVICE_ROLE_KEY!=='string'||!env.SUPABASE_SERVICE_ROLE_KEY)throw Error();}catch{return reply(503,'DOMAIN_HISTORY_CONFIGURATION_UNAVAILABLE');}
 if(request.signal.aborted)return reply(503,'DOMAIN_HISTORY_UNAVAILABLE');
 const c=new AbortController(),abort=()=>c.abort();let stop;
 const ended=new Promise((_,reject)=>{stop=()=>reject(Error('TIMEOUT'));c.signal.addEventListener('abort',stop,{once:true});});
 const wait=p=>Promise.race([p,ended]),timer=setTimeout(abort,10000);request.signal.addEventListener('abort',abort,{once:true});
 async function read(response,limit){
  if(!/^application\/json(?:\s*;.*)?$/i.test(response.headers.get('content-type')||''))throw Error('INVALID_JSON');
  const reader=response.body?.getReader();if(!reader)throw Error('INVALID_BODY');
  try{let size=0;const chunks=[];for(;;){const part=await wait(reader.read());if(part.done)break;size+=part.value.byteLength;if(size>limit)throw Error('BODY_TOO_LARGE');chunks.push(part.value);}const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}
  finally{reader.cancel().catch(()=>{});try{reader.releaseLock();}catch{}}
 }
 const headers={apikey:env.SUPABASE_SERVICE_ROLE_KEY,authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY};
 async function get(target){const r=await wait(fetchImpl(target.href,{method:'GET',redirect:'manual',cache:'no-store',headers,signal:c.signal}));if(r.status!==200)throw Error('STORAGE_UNAVAILABLE');return read(r,262144);}
 try{
  const verified=await wait(fetchImpl(new URL('/auth/v1/user',base).href,{method:'GET',redirect:'manual',cache:'no-store',headers:{authorization:auth,apikey:env.SUPABASE_PUBLISHABLE_KEY},signal:c.signal}));
  if([401,403].includes(verified.status))return reply(401,'INVALID_SESSION');if(verified.status!==200)return reply(503,'AUTH_UNAVAILABLE');
  const user=await read(verified,32768);if(typeof user?.id!=='string'||!UUID.test(user.id))return reply(401,'INVALID_SESSION');const owner=user.id.toLowerCase();
  const target=new URL('/rest/v1/domain_purchase_orders',base);target.searchParams.set('select',FIELDS);target.searchParams.set('user_id','eq.'+owner);target.searchParams.set('environment','eq.production');target.searchParams.set('order','created_at.desc,order_id.desc');target.searchParams.set('limit','51');
  const found=await get(target);if(!Array.isArray(found)||found.length>51)throw Error('INVALID_ORDERS');
  const seen=new Set();for(const o of found){if(!o||!ORDER.test(o.order_id||'')||o.user_id!==owner||o.environment!=='production'||o.currency!=='IDR'||typeof o.quote_id!=='string'||!UUID.test(o.quote_id)||seen.has(o.order_id))throw Error('INVALID_ORDER_SCOPE');seen.add(o.order_id);}
  const page=found.slice(0,50);if(!page.length)return reply(200,'DOMAIN_ORDER_HISTORY',{ownerId:owner,orders:[],count:0,hasMore:false});
  const ids=[...new Set(page.map(o=>o.quote_id))];
  const quote=new URL('/rest/v1/domain_sale_quotes',base);quote.searchParams.set('select','id,user_id,environment,domain,currency,sale_price_idr,years,operation,provider_id');quote.searchParams.set('id','in.('+ids.join(',')+')');quote.searchParams.set('user_id','eq.'+owner);quote.searchParams.set('environment','eq.production');quote.searchParams.set('limit',String(ids.length));
  const quotes=await get(quote);if(!Array.isArray(quotes)||quotes.length!==ids.length)throw Error('INVALID_QUOTES');
  const byId=new Map();for(const q of quotes){if(!q||!ids.includes(q.id)||q.user_id!==owner||q.environment!=='production'||q.currency!=='IDR'||byId.has(q.id))throw Error('INVALID_QUOTE_SCOPE');byId.set(q.id,q);}
  const orders=page.map(o=>{const q=byId.get(o.quote_id);if(!q||q.sale_price_idr!==o.amount_idr)throw Error('QUOTE_PRICE_MISMATCH');return toView(o,q);});
  orders.sort((a,b)=>Date.parse(a.createdAt)-Date.parse(b.createdAt)||a.orderId.localeCompare(b.orderId));
  return reply(200,'DOMAIN_ORDER_HISTORY',{ownerId:owner,orders,count:orders.length,hasMore:found.length>50});
 }catch{return reply(503,'DOMAIN_HISTORY_UNAVAILABLE');}
 finally{clearTimeout(timer);request.signal.removeEventListener('abort',abort);c.signal.removeEventListener('abort',stop);}
}
