const PATH='/api/commerce/domains/order-cancel';
const ORDER=/^DOM-[a-f0-9]{40}$/;
const UUID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const ERRORS={DOMAIN_ORDER_NOT_FOUND:404,INVALID_CANCELLATION_REQUEST:400,ORDER_ALREADY_PROCESSED:409,ORDER_REVIEW_REQUIRED:409,GATEWAY_CANCELLATION_REQUIRED:409,REGISTRATION_DETAILS_LOCKED:409};
// Requires separately approved DB migration and router wiring. Disabled by default.
// This endpoint never calls a gateway and only supports cancellation before checkout.
export async function domainOrderCancellationResponse(request,env,{fetchImpl=globalThis.fetch}={}){
 const url=new URL(request.url);if(url.pathname!==PATH)return null;
 const reply=(status,code,extra={})=>new Response(JSON.stringify({code,environment:'production',cancellationConfirmed:false,gatewayActionTaken:false,registrationStarted:false,...extra}),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','vary':'Authorization','x-content-type-options':'nosniff',...(status===405?{allow:'POST'}:{})}});
 if(url.protocol!=='https:'||url.hostname!=='ngeblogging.com'||url.port)return reply(404,'NOT_FOUND');
 if(request.method!=='POST')return reply(405,'METHOD_NOT_ALLOWED');
 if(request.headers.get('origin')!==url.origin)return reply(403,'ORIGIN_NOT_ALLOWED');
 if(url.search)return reply(400,'QUERY_NOT_ALLOWED');
 if(env?.DOMAIN_ORDER_ENV!=='production'||env.DOMAIN_CUSTOMER_PRODUCTION_ENABLED!=='true'||env.DOMAIN_ORDER_CANCELLATION_ENABLED!=='true')return reply(503,'DOMAIN_CANCELLATION_DISABLED');
 const auth=request.headers.get('authorization')||'';if(!/^Bearer [^\s]{1,8192}$/.test(auth))return reply(401,'AUTH_REQUIRED');
 if(!/^application\/json(?:\s*;.*)?$/i.test(request.headers.get('content-type')||''))return reply(415,'JSON_REQUIRED');
 let base;try{base=new URL(env.SUPABASE_URL);if(base.href!=='https://polvmlrhqoiflumibfqs.supabase.co/'||typeof env.SUPABASE_PUBLISHABLE_KEY!=='string'||!env.SUPABASE_PUBLISHABLE_KEY||typeof env.SUPABASE_SERVICE_ROLE_KEY!=='string'||!env.SUPABASE_SERVICE_ROLE_KEY)throw Error();}catch{return reply(503,'DOMAIN_CANCELLATION_CONFIGURATION_UNAVAILABLE');}
 if(request.signal.aborted)return reply(503,'DOMAIN_CANCELLATION_RETRY_REQUIRED',{retryWithSameOrder:true});
 const c=new AbortController(),abort=()=>c.abort();let stop;
 const ended=new Promise((_,reject)=>{stop=()=>reject(Error('CANCELLATION_TIMEOUT'));c.signal.addEventListener('abort',stop,{once:true});});
 const timer=setTimeout(abort,10000),wait=p=>Promise.race([p,ended]);request.signal.addEventListener('abort',abort,{once:true});
 async function read(stream,limit){const reader=stream?.getReader();if(!reader)throw Error('INVALID_BODY');try{let size=0;const parts=[];for(;;){const x=await wait(reader.read());if(x.done)break;size+=x.value.length;if(size>limit)throw Error('BODY_TOO_LARGE');parts.push(x.value);}const bytes=new Uint8Array(size);let offset=0;for(const x of parts){bytes.set(x,offset);offset+=x.length;}return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}finally{reader.cancel().catch(()=>{});try{reader.releaseLock();}catch{}}}
 const json=r=>/^application\/json(?:\s*;.*)?$/i.test(r.headers.get('content-type')||'');
 try{
  let body;try{body=await read(request.body,1024);}catch(error){if(c.signal.aborted)throw error;return reply(error.message==='BODY_TOO_LARGE'?413:400,error.message==='BODY_TOO_LARGE'?'BODY_TOO_LARGE':'INVALID_BODY');}
  if(!body||Array.isArray(body)||typeof body!=='object'||Object.keys(body).length!==2||!Object.hasOwn(body,'orderId')||!Object.hasOwn(body,'confirmed')||typeof body.orderId!=='string'||!ORDER.test(body.orderId)||body.confirmed!==true)return reply(400,'INVALID_CANCELLATION_REQUEST');
  const verified=await wait(fetchImpl(new URL('/auth/v1/user',base).href,{method:'GET',redirect:'manual',headers:{authorization:auth,apikey:env.SUPABASE_PUBLISHABLE_KEY},signal:c.signal}));
  if([401,403].includes(verified.status))return reply(401,'INVALID_SESSION');
  if(verified.status!==200||!json(verified))return reply(503,'AUTH_UNAVAILABLE');
  const user=await read(verified.body,32768);if(typeof user?.id!=='string'||!UUID.test(user.id))return reply(401,'INVALID_SESSION');
  const response=await wait(fetchImpl(new URL('/rest/v1/rpc/domain_cancel_before_checkout_v1',base).href,{method:'POST',redirect:'manual',headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY,'content-type':'application/json'},body:JSON.stringify({p_user_id:user.id.toLowerCase(),p_order_id:body.orderId}),signal:c.signal}));
  if(response.status!==200||!json(response))return reply(503,'DOMAIN_CANCELLATION_UNVERIFIED',{retryWithSameOrder:true});
  const result=await read(response.body,32768);
  if(result?.ok===false){const known=typeof result.error==='string'&&Object.hasOwn(ERRORS,result.error);return reply(known?ERRORS[result.error]:503,known?result.error:'DOMAIN_CANCELLATION_UNVERIFIED',{retryWithSameOrder:true});}
  if(result?.ok!==true||result.order_id!==body.orderId||result.environment!=='production'||result.currency!=='IDR'||!Number.isSafeInteger(result.amount_idr)||result.amount_idr<1||result.amount_idr>1000000000000||result.payment_state!=='cancelled'||result.registration_state!=='not_started'||result.cancelled!==true||typeof result.reused!=='boolean'||result.scope!=='before_checkout'||result.gateway_action_taken!==false||result.registration_action_taken!==false)return reply(503,'DOMAIN_CANCELLATION_UNVERIFIED',{retryWithSameOrder:true});
  return reply(200,'DOMAIN_ORDER_CANCELLED',{cancellationConfirmed:true,reused:result.reused,scope:'before_checkout',order:{orderId:result.order_id,currency:'IDR',amountIdr:result.amount_idr,paymentState:'cancelled',registrationState:'not_started'}});
 }catch{return reply(503,'DOMAIN_CANCELLATION_RETRY_REQUIRED',{retryWithSameOrder:true});}
 finally{clearTimeout(timer);request.signal.removeEventListener('abort',abort);c.signal.removeEventListener('abort',stop);}
}
