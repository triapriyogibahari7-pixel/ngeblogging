export const RECOVERY_ROUTER_VERSION='domain-recovery-router-v3';
export function createDomainRecoveryDispatcher({quoteHandler,acceptHandler,fetchImpl}={}){
 if(typeof quoteHandler!=='function'||typeof acceptHandler!=='function'||typeof fetchImpl!=='function')throw Error('INVALID_RECOVERY_ROUTER_CONFIGURATION');
 return async(request,env)=>{
  const u=new URL(request.url),handler=u.pathname==='/api/commerce/domains/order-recovery-quote'?quoteHandler:u.pathname==='/api/commerce/domains/order-recovery-accept'?acceptHandler:null;
  if(!handler)return null;
  const reply=(status,code)=>Response.json({code,routerVersion:RECOVERY_ROUTER_VERSION,environment:'production',paymentAllowed:false,checkoutCreated:false,orderChanged:false,registrationStarted:false},{status,headers:{'cache-control':'private, no-store',vary:'Authorization','x-content-type-options':'nosniff','x-ngeblogging-recovery-router':RECOVERY_ROUTER_VERSION,...(status===405?{allow:'POST'}:{})}});
  if(u.origin!=='https://ngeblogging.com'||u.search)return reply(404,'NOT_FOUND');
  if(request.method!=='POST')return reply(405,'METHOD_NOT_ALLOWED');
  if(request.headers.get('origin')!==u.origin)return reply(403,'ORIGIN_NOT_ALLOWED');
  if(env?.DOMAIN_ORDER_RECOVERY_ENABLED!=='true')return reply(503,'DOMAIN_RECOVERY_DISABLED');
  try{const r=await handler(request,env,{fetchImpl});if(!(r instanceof Response))return reply(503,'DOMAIN_RECOVERY_UNAVAILABLE');const headers=new Headers(r.headers);headers.set('x-ngeblogging-recovery-router',RECOVERY_ROUTER_VERSION);return new Response(r.body,{status:r.status,statusText:r.statusText,headers});}
  catch{return reply(503,'DOMAIN_RECOVERY_UNAVAILABLE');}
 };
}
