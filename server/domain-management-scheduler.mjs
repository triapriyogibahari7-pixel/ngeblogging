import {readRegisteredDomainMetadata} from './domain-registered-metadata.mjs';
export const DOMAIN_MANAGEMENT_CRON='17,47 * * * *';
const BASE='https://polvmlrhqoiflumibfqs.supabase.co',ACCOUNT='095e57b46e7ba7f6b188480d9e4e5fe7',ORDER=/^DOM-[a-f0-9]{40}$/,UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
async function digest(value){const data=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value)));return [...new Uint8Array(data)].map(x=>x.toString(16).padStart(2,'0')).join('');}
export async function runDomainManagementSchedule(env,{fetchImpl=globalThis.fetch,readMetadata=readRegisteredDomainMetadata,digestImpl=digest}={}){
 if(env?.DOMAIN_MANAGEMENT_PRODUCTION_ENABLED!=='true'||env.DOMAIN_ORDER_ENV!=='production')return {enabled:false,ok:true};
 const failed=()=>({enabled:true,ok:false,providerMutation:false});
 if(env.SUPABASE_URL?.replace(/\/$/,'')!==BASE||env.CLOUDFLARE_ACCOUNT_ID!==ACCOUNT||typeof env.SUPABASE_SERVICE_ROLE_KEY!=='string'||!/^\S{1,8192}$/.test(env.SUPABASE_SERVICE_ROLE_KEY)||!env.CLOUDFLARE_REGISTRAR_API_TOKEN||!(env.CLOUDFLARE_DOMAIN_API_TOKEN||env.CLOUDFLARE_API_TOKEN))return failed();
 const c=new AbortController();let stop;
 const ended=new Promise((_,reject)=>{stop=()=>reject(Error('SCHEDULE_TIMEOUT'));c.signal.addEventListener('abort',stop,{once:true});});ended.catch(()=>{});
 const wait=p=>Promise.race([p,ended]),timer=setTimeout(()=>c.abort(),58000);
 const rpc=async(name,args)=>{
  if(c.signal.aborted)throw Error('SCHEDULE_TIMEOUT');
  const r=await wait(fetchImpl(BASE+'/rest/v1/rpc/'+name,{method:'POST',redirect:'manual',headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY,'content-type':'application/json'},body:JSON.stringify(args),signal:c.signal}));
  if(r.status!==200)throw Error('SCHEDULE_STORAGE_UNAVAILABLE');
  const reader=r.body?.getReader();if(!reader)throw Error('SCHEDULE_STORAGE_UNAVAILABLE');
  try{let size=0;const chunks=[];for(;;){const p=await wait(reader.read());if(p.done)break;size+=p.value.byteLength;if(size>131072)throw Error('SCHEDULE_RESPONSE_TOO_LARGE');chunks.push(p.value);}const bytes=new Uint8Array(size);let at=0;for(const p of chunks){bytes.set(p,at);at+=p.byteLength;}const value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));if(value?.ok!==true)throw Error('SCHEDULE_STORAGE_UNVERIFIED');return value;}finally{reader.cancel().catch(()=>{});try{reader.releaseLock();}catch{}}
 };
 try{
  const claimed=await rpc('domain_claim_metadata_refresh_v1',{p_limit:5});
  if(!Array.isArray(claimed.jobs)||claimed.jobs.length>5)throw Error('SCHEDULE_CLAIMS_UNVERIFIED');
  let saved=0,unavailable=0;
  for(const job of claimed.jobs){
   if(!ORDER.test(job?.order?.order_id||'')||!UUID.test(job?.order?.user_id||'')||!UUID.test(job?.attemptId||''))throw Error('SCHEDULE_CLAIMS_UNVERIFIED');
   const metadata=await wait(readMetadata(env,job.order,job.quote,{owner:job.order.user_id,fetchImpl,signal:c.signal}));
   const observed=metadata?.status==='observed';
   const proof=observed?await wait(digestImpl({orderId:job.order.order_id,domain:job.quote.domain,metadata})):null;
   const receipt=await rpc('domain_complete_metadata_refresh_v1',{p_order_id:job.order.order_id,p_attempt_id:job.attemptId,p_metadata:observed?metadata:null,p_evidence_sha256:proof});
   if(receipt.orderId!==job.order.order_id||receipt.attemptId!==job.attemptId||typeof receipt.snapshotSaved!=='boolean')throw Error('SCHEDULE_SAVE_UNVERIFIED');
   if(receipt.snapshotSaved)saved++;else unavailable++;
  }
  const notices=await rpc('domain_generate_expiry_notifications_v1',{p_limit:100});
  if(!Number.isInteger(notices.inserted)||notices.inserted<0||notices.inserted>100||notices.providerActionTaken!==false||notices.emailSent!==false)throw Error('SCHEDULE_NOTIFICATIONS_UNVERIFIED');
  return {enabled:true,ok:unavailable===0,claimed:claimed.jobs.length,saved,unavailable,notificationsCreated:notices.inserted,providerMutation:false};
 }catch{return failed();}
 finally{clearTimeout(timer);c.signal.removeEventListener('abort',stop);c.abort();}
}
