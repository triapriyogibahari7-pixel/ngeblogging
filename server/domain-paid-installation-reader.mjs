import {planRegisteredDomainInstallation} from './domain-paid-installation-plan.mjs';
const BASE='https://polvmlrhqoiflumibfqs.supabase.co',ORDER=/^DOM-[a-f0-9]{40}$/,UUID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const ORDER_FIELDS='order_id,user_id,quote_id,environment,currency,amount_idr,payment_state,registration_state,review_reason,paid_at,midtrans_transaction_id,registered_at,registrar_domain_ref';
const BINDING_FIELDS='order_id,user_id,site_id,environment',SITE_FIELDS='id,owner_id';
const uuid=value=>typeof value==='string'&&UUID.test(value);
const same=(a,b,fields)=>Boolean(a&&b&&fields.split(',').every(key=>a[key]===b[key]));
// Internal backend read-only inspection; never mount this as an unauthenticated route.
export async function inspectPaidDomainInstallation(env,orderId,{fetchImpl=globalThis.fetch,clock=Date.now,signal,timeoutMs=10000}={}){
 const blocked=code=>Object.freeze({eligible:false,code,evidenceReadOnly:true,snapshotAtomic:false,installationStarted:false,installationConfirmed:false,purchaseAllowed:false});
 if(env?.DOMAIN_INSTALLATION_PREFLIGHT_ENABLED!=='true'||env.DOMAIN_ORDER_ENV!=='production')return blocked('INSTALLATION_PREFLIGHT_DISABLED');
 if(typeof orderId!=='string'||!ORDER.test(orderId)||env.SUPABASE_URL?.replace(/\/$/,'')!==BASE||typeof env.SUPABASE_SERVICE_ROLE_KEY!=='string'||!env.SUPABASE_SERVICE_ROLE_KEY||env.SUPABASE_SERVICE_ROLE_KEY.length>8192||/[\u0000-\u0020\u007f]/.test(env.SUPABASE_SERVICE_ROLE_KEY)||typeof fetchImpl!=='function'||typeof clock!=='function'||!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>20000)return blocked('INSTALLATION_EVIDENCE_CONFIGURATION_UNAVAILABLE');
 if(signal?.aborted)return blocked('INSTALLATION_EVIDENCE_UNAVAILABLE');
 const c=new AbortController(),abort=()=>c.abort();let stop;
 const ended=new Promise((_,reject)=>{stop=()=>reject(Error('INSPECTION_STOPPED'));c.signal.addEventListener('abort',stop,{once:true});});ended.catch(()=>{});
 const timer=setTimeout(abort,timeoutMs),wait=value=>Promise.race([value,ended]);signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)c.abort();
 const rows=async(table,select,filters,max=2)=>{
  if(c.signal.aborted)throw Error('INSPECTION_STOPPED');
  const target=new URL('/rest/v1/'+table,BASE);target.search=new URLSearchParams({select,...filters,limit:String(max)}).toString();
  const response=await wait(fetchImpl(target.href,{method:'GET',redirect:'manual',cache:'no-store',credentials:'omit',headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY,accept:'application/json'},signal:c.signal}));
  if(response.status!==200||response.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json'){try{Promise.resolve(response.body?.cancel()).catch(()=>{});}catch{}throw Error('EVIDENCE_UNAVAILABLE');}
  const stream=response.body?.getReader();if(!stream)throw Error('EVIDENCE_UNAVAILABLE');
  try{let size=0;const chunks=[];for(;;){const part=await wait(stream.read());if(part.done)break;if(!(part.value instanceof Uint8Array))throw Error('EVIDENCE_UNAVAILABLE');size+=part.value.byteLength;if(size>32768)throw Error('EVIDENCE_UNAVAILABLE');chunks.push(part.value);}const bytes=new Uint8Array(size);let at=0;for(const part of chunks){bytes.set(part,at);at+=part.byteLength;}const value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));if(!Array.isArray(value)||value.length>max)throw Error('EVIDENCE_UNAVAILABLE');return value;}finally{try{Promise.resolve(stream.cancel()).catch(()=>{});}catch{}try{stream.releaseLock();}catch{}}
 };
 const one=async(table,select,filters)=>{const value=await rows(table,select,filters);if(value.length>1)throw Error('AMBIGUOUS_EVIDENCE');return value[0]||null;};
 const readOrder=()=>one('domain_purchase_orders',ORDER_FIELDS,{order_id:'eq.'+orderId,environment:'eq.production'});
 const readBinding=()=>one('domain_order_site_bindings',BINDING_FIELDS,{order_id:'eq.'+orderId,environment:'eq.production'});
 try{
  const initial=clock();if(!Number.isSafeInteger(initial)||Math.abs(initial)>8640000000000000)return blocked('INSTALLATION_CLOCK_UNVERIFIED');
  const order=await readOrder();
  if(!order||order.order_id!==orderId||order.environment!=='production'||!uuid(order.user_id)||!uuid(order.quote_id)||order.currency!=='IDR'||!Number.isSafeInteger(order.amount_idr)||order.amount_idr<1||order.amount_idr>1000000000000)return blocked('INSTALLATION_ORDER_UNVERIFIED');
  if(order.payment_state!=='paid'||order.registration_state!=='registered'||order.review_reason!==null||typeof order.midtrans_transaction_id!=='string'||!/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(order.midtrans_transaction_id))return blocked('INSTALLATION_CONFIRMATIONS_REQUIRED');
  const binding=await readBinding();if(!binding||binding.order_id!==orderId||binding.user_id!==order.user_id||binding.environment!=='production'||!uuid(binding.site_id))return blocked('INSTALLATION_SITE_BINDING_REQUIRED');
  const readSite=()=>one('sites',SITE_FIELDS,{id:'eq.'+binding.site_id});
  const site=await readSite();if(!site||site.id!==binding.site_id||site.owner_id!==order.user_id)return blocked('INSTALLATION_SITE_OWNER_REQUIRED');
  const quote=await one('domain_sale_quotes','id,user_id,environment,currency,sale_price_idr,provider_id,operation,years,domain',{id:'eq.'+order.quote_id,user_id:'eq.'+order.user_id,environment:'eq.production'});
  if(!quote||typeof quote.domain!=='string'||quote.domain.length>253||quote.domain.split('.').length!==2||quote.domain.split('.').some(label=>!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)))return blocked('INSTALLATION_QUOTE_UNVERIFIED');
  const registration=await one('domain_registration_jobs','order_id,user_id,quote_id,domain,amount_idr,state,provider_state,attempt_id,evidence_sha256,provider_resource_ref,post_started_at,provider_updated_at',{order_id:'eq.'+orderId});
  const paymentEvents=await rows('domain_payment_events','order_id,environment,provider,currency,amount_idr,transaction_id,verified_state',{order_id:'eq.'+orderId,environment:'eq.production',provider:'eq.midtrans',currency:'eq.IDR',amount_idr:'eq.'+order.amount_idr,transaction_id:'eq.'+order.midtrans_transaction_id,verified_state:'eq.paid'},10);
  const domains=await rows('site_domains','id,site_id,hostname,provider',{hostname:'eq.'+quote.domain});
  const plan=await planRegisteredDomainInstallation({order,binding,site,quote,registration,paymentEvents,domains},{now:clock()});
  if(!plan.eligible)return Object.freeze({...plan,evidenceReadOnly:true,snapshotAtomic:false});
  const finalOrder=await readOrder(),finalBinding=await readBinding(),finalSite=await readSite();
  if(!same(order,finalOrder,ORDER_FIELDS)||!same(binding,finalBinding,BINDING_FIELDS)||!same(site,finalSite,SITE_FIELDS))return blocked('INSTALLATION_EVIDENCE_CHANGED');
  if(c.signal.aborted)throw Error('INSPECTION_STOPPED');
  return Object.freeze({...plan,evidenceReadOnly:true,snapshotAtomic:false,evidenceCheckedAt:new Date(clock()).toISOString()});
 }catch{return blocked('INSTALLATION_EVIDENCE_UNAVAILABLE');}
 finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);c.signal.removeEventListener('abort',stop);c.abort();}
}
