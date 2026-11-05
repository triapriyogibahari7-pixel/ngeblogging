const ACCOUNT='095e57b46e7ba7f6b188480d9e4e5fe7';
const ORDER=/^DOM-[a-f0-9]{40}$/,UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const host=x=>typeof x==='string'&&x.length<=253&&x.includes('.')&&x===x.toLowerCase()&&x.split('.').every(p=>/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(p));
const stamp=x=>typeof x==='string'&&x.length<=64&&Number.isFinite(Date.parse(x));
// Internal read-only adapter. Caller must authenticate and load owner-scoped order/quote.
export async function readRegisteredDomainMetadata(env,o,q,{owner,fetchImpl=globalThis.fetch,clock=Date.now,signal,timeoutMs=5000}={}){
 const unavailable=()=>({status:'unavailable',nameservers:[],registeredAt:null,expiresAt:null,autoRenew:null,checkedAt:null,providerActionTaken:false});
 if(env?.DOMAIN_ORDER_ENV!=='production'||!UUID.test(owner||'')||o?.user_id!==owner||q?.user_id!==owner||!ORDER.test(o?.order_id||'')||o.environment!=='production'||q.environment!=='production'||o.payment_state!=='paid'||o.registration_state!=='registered'||o.review_reason!==null||!stamp(o.paid_at)||!stamp(o.registered_at)||typeof o.midtrans_transaction_id!=='string'||!o.midtrans_transaction_id.trim()||o.quote_id!==q.id||q.provider_id!=='cloudflare'||o.currency!=='IDR'||q.currency!=='IDR'||!Number.isSafeInteger(o.amount_idr)||o.amount_idr<1||o.amount_idr!==q.sale_price_idr||!host(q.domain)||!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>10000)return unavailable();
 const token=env.CLOUDFLARE_REGISTRAR_API_TOKEN,zoneToken=env.CLOUDFLARE_DOMAIN_API_TOKEN||env.CLOUDFLARE_API_TOKEN;
 if(typeof token!=='string'||!token||/\s/.test(token)||typeof zoneToken!=='string'||!zoneToken||/\s/.test(zoneToken)||(env.CLOUDFLARE_ACCOUNT_ID&&env.CLOUDFLARE_ACCOUNT_ID!==ACCOUNT)||signal?.aborted)return unavailable();
 const c=new AbortController(),abort=()=>c.abort();let stop;
 const ended=new Promise((_,reject)=>{stop=()=>reject(Error('METADATA_TIMEOUT'));c.signal.addEventListener('abort',stop,{once:true});});ended.catch(()=>{});
 const timer=setTimeout(abort,timeoutMs),wait=p=>Promise.race([p,ended]);signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
 const read=async(path,key)=>{
  if(c.signal.aborted)throw Error('METADATA_TIMEOUT');
  const r=await wait(fetchImpl('https://api.cloudflare.com/client/v4'+path,{method:'GET',redirect:'manual',cache:'no-store',headers:{authorization:'Bearer '+key,accept:'application/json'},signal:c.signal}));
  if(r.status!==200||r.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json'){try{r.body?.cancel().catch(()=>{});}catch{}throw Error('METADATA_UNAVAILABLE');}
  const reader=r.body?.getReader();if(!reader)throw Error('METADATA_UNAVAILABLE');
  try{let size=0;const chunks=[];for(;;){const part=await wait(reader.read());if(part.done)break;size+=part.value.byteLength;if(size>65536)throw Error('METADATA_TOO_LARGE');chunks.push(part.value);}const bytes=new Uint8Array(size);let at=0;for(const part of chunks){bytes.set(part,at);at+=part.byteLength;}const data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));if(data?.success!==true)throw Error('METADATA_UNAVAILABLE');return data.result;}finally{reader.cancel().catch(()=>{});try{reader.releaseLock();}catch{}}
 };
 try{
  const now=clock();if(!Number.isSafeInteger(now)||!Number.isFinite(new Date(now).getTime()))return unavailable();
  const r=await read('/accounts/'+ACCOUNT+'/registrar/registrations/'+encodeURIComponent(q.domain),token);
  if(r?.domain_name!==q.domain||!['active','expired'].includes(r.status)||!stamp(r.created_at)||!stamp(r.expires_at)||Date.parse(r.created_at)>=Date.parse(r.expires_at)||Date.parse(r.created_at)>now+300000||typeof r.auto_renew!=='boolean')return unavailable();
  const params=new URLSearchParams({name:q.domain,'account.id':ACCOUNT,per_page:'2'});
  const zones=await read('/zones?'+params,zoneToken);
  if(!Array.isArray(zones)||zones.length!==1)return unavailable();
  const z=zones[0],ns=z?.name_servers;
  if(z?.name!==q.domain||z.account?.id!==ACCOUNT||z.type!=='full'||!Array.isArray(ns)||ns.length<2||ns.length>13||ns.some(x=>!host(x))||new Set(ns).size!==ns.length)return unavailable();
  const checked=clock();if(!Number.isSafeInteger(checked)||checked<now||checked-now>timeoutMs||c.signal.aborted)return unavailable();
  return {status:'observed',registrarStatus:r.status,nameservers:[...ns],registeredAt:r.created_at,expiresAt:r.expires_at,autoRenew:r.auto_renew,checkedAt:new Date(checked).toISOString(),source:'registrar_api',providerActionTaken:false};
 }catch{return unavailable();}
 finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);c.signal.removeEventListener('abort',stop);c.abort();}
}
