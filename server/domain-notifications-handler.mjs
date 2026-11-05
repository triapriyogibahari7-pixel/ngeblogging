const BASE='https://polvmlrhqoiflumibfqs.supabase.co';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const PATH=/^\/api\/commerce\/domains\/orders\/(DOM-[a-f0-9]{40})\/notifications(\/read)?$/;
async function json(stream,wait,limit){const reader=stream?.getReader();if(!reader)throw Error('INVALID_JSON');try{let size=0;const chunks=[];for(;;){const p=await wait(reader.read());if(p.done)break;size+=p.value.byteLength;if(size>limit)throw Error('BODY_TOO_LARGE');chunks.push(p.value);}const bytes=new Uint8Array(size);let at=0;for(const p of chunks){bytes.set(p,at);at+=p.byteLength;}return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}finally{reader.cancel().catch(()=>{});try{reader.releaseLock();}catch{}}}
export async function domainNotificationsResponse(request,env,{fetchImpl=globalThis.fetch}={}){
 const u=new URL(request.url),match=PATH.exec(u.pathname);if(!match)return null;
 const mark=Boolean(match[2]),id=match[1],method=mark?'POST':'GET';
 const reply=(status,code,extra={})=>new Response(JSON.stringify({code,environment:'production',orderId:id,...extra}),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'private, no-store',vary:'Authorization','x-content-type-options':'nosniff',...(status===405?{allow:method}:{})}});
 if(u.protocol!=='https:'||u.hostname!=='ngeblogging.com'||u.port)return reply(404,'NOT_FOUND');
 if(request.method!==method)return reply(405,'METHOD_NOT_ALLOWED');
 if(u.search)return reply(400,'QUERY_NOT_ALLOWED');
 if((mark||request.headers.has('origin'))&&request.headers.get('origin')!==u.origin)return reply(403,'ORIGIN_NOT_ALLOWED');
 const auth=request.headers.get('authorization')||'';if(!/^Bearer [^\s]{1,8192}$/.test(auth))return reply(401,'AUTH_REQUIRED');
 if(mark&&!/^application\/json(?:\s*;.*)?$/i.test(request.headers.get('content-type')||''))return reply(415,'JSON_REQUIRED');
 if(env?.DOMAIN_ORDER_ENV!=='production'||env.SUPABASE_URL?.replace(/\/$/,'')!==BASE||!env.SUPABASE_PUBLISHABLE_KEY||!env.SUPABASE_SERVICE_ROLE_KEY)return reply(503,'NOTIFICATIONS_UNAVAILABLE');
 if(request.signal.aborted)return reply(503,'NOTIFICATIONS_UNAVAILABLE');
 const c=new AbortController(),abort=()=>c.abort();let stop;
 const ended=new Promise((_,reject)=>{stop=()=>reject(Error('TIMEOUT'));c.signal.addEventListener('abort',stop,{once:true});});ended.catch(()=>{});
 const timer=setTimeout(abort,8000),wait=p=>Promise.race([p,ended]);request.signal.addEventListener('abort',abort,{once:true});if(request.signal.aborted)abort();
 let writeStarted=false;
 try{
  const a=await wait(fetchImpl(BASE+'/auth/v1/user',{method:'GET',redirect:'manual',headers:{authorization:auth,apikey:env.SUPABASE_PUBLISHABLE_KEY},signal:c.signal}));
  if([401,403].includes(a.status))return reply(401,'INVALID_SESSION');if(a.status!==200)throw Error('AUTH_UNAVAILABLE');
  const actor=await json(a.body,wait,32768);if(typeof actor?.id!=='string'||!UUID.test(actor.id))throw Error('AUTH_UNAVAILABLE');
  let notificationId;
  if(mark){let input;try{input=await json(request.body,wait,1024);}catch{return reply(400,'INVALID_NOTIFICATION_REQUEST');}if(!input||Array.isArray(input)||Object.keys(input).length!==1||typeof input.notificationId!=='string'||!UUID.test(input.notificationId))return reply(400,'INVALID_NOTIFICATION_REQUEST');notificationId=input.notificationId;}
  const name=mark?'domain_mark_order_notification_read_v1':'domain_read_owned_notifications_v1';
  const args={p_user_id:actor.id.toLowerCase(),p_order_id:id,...(mark?{p_notification_id:notificationId}:{})};
  writeStarted=mark;
  const r=await wait(fetchImpl(BASE+'/rest/v1/rpc/'+name,{method:'POST',redirect:'manual',headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY,'content-type':'application/json'},body:JSON.stringify(args),signal:c.signal}));
  if(r.status!==200)throw Error('NOTIFICATIONS_UNAVAILABLE');const value=await json(r.body,wait,32768);
  if(value?.ok===false&&['DOMAIN_ORDER_NOT_FOUND','NOTIFICATION_NOT_FOUND'].includes(value.error))return reply(404,value.error);
  if(value?.ok!==true||value.orderId!==id)throw Error('NOTIFICATIONS_UNVERIFIED');
  if(mark){if(value.notificationId!==notificationId||typeof value.readAt!=='string'||!Number.isFinite(Date.parse(value.readAt)))throw Error('NOTIFICATIONS_UNVERIFIED');return reply(200,'DOMAIN_NOTIFICATION_READ',{notificationId,readAt:value.readAt});}
  if(!Array.isArray(value.notifications)||value.notifications.length>50)throw Error('NOTIFICATIONS_UNVERIFIED');
  return reply(200,'DOMAIN_NOTIFICATIONS',{notifications:value.notifications});
 }catch{return reply(503,writeStarted?'NOTIFICATION_UPDATE_UNCONFIRMED':'NOTIFICATIONS_UNAVAILABLE',{retryAutomatically:false});}
 finally{clearTimeout(timer);request.signal.removeEventListener('abort',abort);c.signal.removeEventListener('abort',stop);c.abort();}
}
