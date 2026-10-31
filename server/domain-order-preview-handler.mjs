const PREVIEW='feature-domain-stages5-10-integration-20261030-ngeblogging.triapriyogibahari7.workers.dev';
const PATH='/api/commerce/domains/order';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const invalid=()=>new Error('INVALID_DOMAIN_ORDER_RESPONSE');
function scaled(value,digits){
 if(typeof value!=='string'||!new RegExp('^(?:0|[1-9]\\d{0,11})(?:\\.\\d{1,'+digits+'})?$').test(value))throw invalid();
 const [whole,fraction='']=value.split('.');const n=BigInt(whole)*10n**BigInt(digits)+BigInt(fraction.padEnd(digits,'0'));if(n<=0n)throw invalid();return n;
}
async function orderId(user,key){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('sandbox:'+user+':'+key));return 'DOM-'+Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,'0')).join('').slice(0,40);}
function orderView(r,{quoteId,expectedId}){
 if(r?.ok!==true||typeof r.reused!=='boolean'||r.order_id!==expectedId||r.quote_id!==quoteId||r.environment!=='sandbox'||r.operation!=='registration'||r.years!==1||r.payment_state!=='pending'||r.registration_state!=='not_started'||r.display_currency!=='USD'||r.currency!=='IDR'||r.checkout_created!==false||r.registration_started!==false)throw invalid();
 if(typeof r.domain!=='string'||r.domain.length>253||r.domain!==r.domain.toLowerCase()||!r.domain.includes('.')||/^\d+(?:\.\d+){3}$/.test(r.domain)||r.domain.split('.').some(x=>!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(x))||typeof r.provider_id!=='string'||!/^[a-z0-9][a-z0-9-]{0,39}$/.test(r.provider_id))throw invalid();
 if(!Number.isSafeInteger(r.amount_idr)||r.amount_idr<=0||r.amount_idr>1000000000000)throw invalid();
 const cents=scaled(r.sale_price_usd,2),rate=scaled(r.fx?.rate_usd_idr,6);
 if(rate>1000000000000n||(cents*rate+99999999n)/100000000n!==BigInt(r.amount_idr))throw invalid();
 const dates=[r.price_locked_at,r.quote_expires_at,r.fx?.observed_at,r.fx?.expires_at];if(dates.some(x=>typeof x!=='string'||!Number.isFinite(Date.parse(x))))throw invalid();
 const [locked,expires,observed,fxExpires]=dates.map(Date.parse);
 if(observed>locked||locked>=expires||expires>fxExpires||fxExpires<=observed||fxExpires-observed>86400000||typeof r.fx.source!=='string'||!r.fx.source.trim()||r.fx.source.length>200||/[\u0000-\u001f\u007f]/.test(r.fx.source))throw invalid();
 return {orderId:r.order_id,quoteId:r.quote_id,domain:r.domain,providerId:r.provider_id,years:1,reused:r.reused,paymentState:'pending',registrationState:'not_started',displayCurrency:'USD',salePriceUsd:r.sale_price_usd,currency:'IDR',amountIdr:r.amount_idr,priceLockedAt:r.price_locked_at,quoteExpiresAt:r.quote_expires_at,fx:{rateUsdIdr:r.fx.rate_usd_idr,source:r.fx.source,observedAt:r.fx.observed_at,expiresAt:r.fx.expires_at}};
}
async function readBody(request,signal){
 const reader=request.body?.getReader();if(!reader)throw Error('INVALID_BODY');
 let abort;const stopped=new Promise((_,reject)=>{abort=()=>reject(Error('ORDER_TIMEOUT'));signal.addEventListener('abort',abort,{once:true});});
 try{return await Promise.race([(async()=>{let size=0;const chunks=[];while(true){if(signal.aborted)throw Error('ORDER_TIMEOUT');const next=await reader.read();if(next.done)break;size+=next.value.length;if(size>4096)throw Error('BODY_TOO_LARGE');chunks.push(next.value);}const bytes=new Uint8Array(size);let pos=0;for(const chunk of chunks){bytes.set(chunk,pos);pos+=chunk.length;}return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));})(),stopped]);}
 finally{signal.removeEventListener('abort',abort);reader.cancel().catch(()=>{});try{reader.releaseLock();}catch{}}
}
export async function domainOrderPreviewResponse(request,env,{fetchImpl=globalThis.fetch}={}){
 const url=new URL(request.url);if(url.pathname!==PATH)return null;
 const reply=(status,code,extra={})=>new Response(JSON.stringify({code,purchaseAllowed:false,checkoutCreated:false,registrationStarted:false,...extra}),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff',...(status===405?{allow:'POST'}:{})}});
 if(url.protocol!=='https:'||url.hostname!==PREVIEW)return reply(404,'NOT_FOUND');
 if(request.method!=='POST')return reply(405,'METHOD_NOT_ALLOWED');
 if(request.headers.get('origin')!==url.origin)return reply(403,'ORIGIN_NOT_ALLOWED');
 if(url.search)return reply(400,'QUERY_NOT_ALLOWED');
 if(env?.DOMAIN_ORDER_PREVIEW_ENABLED!=='true')return reply(503,'DOMAIN_ORDER_PREVIEW_DISABLED');
 if(env.DOMAIN_ORDER_ENV!=='sandbox')return reply(503,'DOMAIN_ORDER_SANDBOX_REQUIRED');
 const auth=request.headers.get('authorization')||'';if(!/^Bearer [^\s]{1,8192}$/.test(auth))return reply(401,'AUTH_REQUIRED');
 if(!/^application\/json(?:\s*;.*)?$/i.test(request.headers.get('content-type')||''))return reply(415,'JSON_REQUIRED');
 let base;try{base=new URL(env.SUPABASE_URL);if(base.protocol!=='https:'||!base.hostname.endsWith('.supabase.co')||base.port||base.username||base.password||base.pathname!=='/'||base.search||base.hash)throw Error();}catch{return reply(503,'DOMAIN_ORDER_CONFIGURATION_UNAVAILABLE');}
 if(typeof env.SUPABASE_PUBLISHABLE_KEY!=='string'||!env.SUPABASE_PUBLISHABLE_KEY||typeof env.SUPABASE_SERVICE_ROLE_KEY!=='string'||!env.SUPABASE_SERVICE_ROLE_KEY)return reply(503,'DOMAIN_ORDER_CONFIGURATION_UNAVAILABLE');
 const controller=new AbortController(),abort=()=>controller.abort(),timer=setTimeout(abort,10000);if(request.signal.aborted)abort();else request.signal.addEventListener('abort',abort,{once:true});
 try{
  let body;try{body=await readBody(request,controller.signal);}catch(error){if(controller.signal.aborted)throw error;return reply(error.message==='BODY_TOO_LARGE'?413:400,error.message==='BODY_TOO_LARGE'?'BODY_TOO_LARGE':'INVALID_BODY');}
  if(!body||Array.isArray(body)||typeof body!=='object'||Object.keys(body).length!==2||!Object.hasOwn(body,'quoteId')||!Object.hasOwn(body,'idempotencyKey')||typeof body.quoteId!=='string'||typeof body.idempotencyKey!=='string'||!UUID.test(body.quoteId)||!UUID.test(body.idempotencyKey))return reply(400,'INVALID_DOMAIN_ORDER_REQUEST');
  const quoteId=body.quoteId.toLowerCase(),key=body.idempotencyKey.toLowerCase();
  const verified=await fetchImpl(new URL('/auth/v1/user',base).href,{method:'GET',redirect:'manual',headers:{authorization:auth,apikey:env.SUPABASE_PUBLISHABLE_KEY},signal:controller.signal});
  if([401,403].includes(verified.status))return reply(401,'INVALID_SESSION');
  if(!verified.ok||verified.status>=300&&verified.status<400)return reply(503,'AUTH_UNAVAILABLE');
  const user=await verified.json();if(typeof user?.id!=='string'||!UUID.test(user.id))return reply(401,'INVALID_SESSION');
  const userId=user.id.toLowerCase(),expectedId=await orderId(userId,key);
  const response=await fetchImpl(new URL('/rest/v1/rpc/domain_create_purchase_order',base).href,{method:'POST',redirect:'manual',headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY,'content-type':'application/json'},body:JSON.stringify({p_user_id:userId,p_quote_id:quoteId,p_idempotency_key:key,p_environment:'sandbox'}),signal:controller.signal});
  if(!response.ok)return reply(503,'DOMAIN_ORDER_STORAGE_UNAVAILABLE',{retryWithSameKey:true});
  const result=await response.json();
  if(result?.ok===false){const errors={QUOTE_NOT_FOUND:404,QUOTE_EXPIRED:409,IDEMPOTENCY_CONFLICT:409,QUOTE_ALREADY_ORDERED:409,ORDER_ALREADY_PROCESSED:409,INVALID_DOMAIN_ORDER_REQUEST:400};const known=typeof result.error==='string'&&Object.hasOwn(errors,result.error);return reply(known?errors[result.error]:503,known?result.error:'DOMAIN_ORDER_STORAGE_UNAVAILABLE');}
  let order;try{order=orderView(result,{quoteId,expectedId});}catch{return reply(503,'DOMAIN_ORDER_RESPONSE_UNVERIFIED',{retryWithSameKey:true});}
  return reply(order.reused?200:201,'DOMAIN_ORDER_PREVIEW',{order});
 }catch{return reply(503,'DOMAIN_ORDER_RETRY_REQUIRED',{retryWithSameKey:true});}
 finally{clearTimeout(timer);request.signal.removeEventListener('abort',abort);}
}
