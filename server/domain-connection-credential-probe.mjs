import {authorizeDomainDiagnosticOperator} from './domain-connection-diagnostic-auth.mjs';
import {normalizeDomainMidtransServerKey} from './domain-midtrans-server-key.mjs';
import {DOMAIN_CONNECTION_ANNUAL_PRICE as PRICE} from '../shared/domain-connection-annual-price.mjs';
// Internal helper only: no HTTP route, Worker integration, activation, or mutations.
// Platform identity independently observed via Cloudflare metadata on 2026-11-22.
const ZONE='7658e226c2f165a24f3bbb1cf31db238',ACCOUNT='095e57b46e7ba7f6b188480d9e4e5fe7';
const DB='https://polvmlrhqoiflumibfqs.supabase.co',TARGET='connect.ngeblogging.com',ORIGIN='fallback.ngeblogging.com';
const ORDER=/^DCON-[a-f0-9]{32}$/;
const credential=v=>typeof v==='string'&&v.length>0&&v.length<=4096&&!/[\x00-\x20\x7f]/.test(v);
export async function runDomainConnectionCredentialProbe(request,env={}, {fetchImpl=globalThis.fetch,referenceOrderId,timeoutMs=5000}={}){
 await authorizeDomainDiagnosticOperator(request,env,{fetchImpl,timeoutMs});
 const report={version:'domain-connection-credential-probe-v3',operatorAuthorized:true,checkoutReady:false,mutationsRequested:false,cloudflare:{state:'not-checked',writePermissionVerified:false},storage:{state:'not-checked',serviceRoleVerified:false},midtrans:{state:'not-checked',merchantIdentityVerified:false},proofSecret:{present:credential(env.DOMAIN_CONNECTION_PROOF_SECRET),cryptographicProofVerified:false},signatureSecret:{present:credential(env.DOMAIN_CONNECTION_MIDTRANS_SIGNATURE_SECRET),providerVerified:false}};
 if(referenceOrderId!==undefined&&(typeof referenceOrderId!=='string'||!ORDER.test(referenceOrderId))){report.midtrans.state='invalid-reference-order';return report;}
 async function get(url,headers){
  const controller=new AbortController();let reader,timer;
  const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reader?.cancel().catch(()=>{});reject(Error('PROBE_DEADLINE'));},timeoutMs);});
  const operation=(async()=>{
   const r=await fetchImpl(url,{method:'GET',redirect:'error',credentials:'omit',signal:controller.signal,headers});
   if(r.status!==200){r.body?.cancel().catch(()=>{});if(r.status===429)throw Error('RATE_LIMIT_STOP');return {status:r.status};}
   reader=r.body?.getReader();if(!reader)throw Error('BODY_REQUIRED');
   let text='',size=0;const decoder=new TextDecoder('utf-8',{fatal:true});
   try{for(;;){if(controller.signal.aborted)throw Error('PROBE_DEADLINE');const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>65536)throw Error('BODY_LIMIT');text+=decoder.decode(part.value,{stream:true});}return {status:200,data:JSON.parse(text+decoder.decode())};}finally{reader.cancel().catch(()=>{});}
  })();
  try{return await Promise.race([operation,deadline]);}finally{clearTimeout(timer);controller.abort();}
 }
 const raw=env.CLOUDFLARE_DOMAIN_API_TOKEN||env.CLOUDFLARE_API_TOKEN,token=typeof raw==='string'?raw.trim():'';
 if(env.CLOUDFLARE_ZONE_ID!==ZONE||env.CLOUDFLARE_ACCOUNT_ID!==ACCOUNT||env.CLOUDFLARE_CUSTOM_HOSTNAME_TARGET!==TARGET||!credential(token)){report.cloudflare.state='configuration-incomplete';return report;}
 try{
  const base='https://api.cloudflare.com/client/v4/zones/'+ZONE,headers={authorization:'Bearer '+token,accept:'application/json'};
  const checks=[['',v=>v?.id===ZONE&&v?.account?.id===ACCOUNT&&v?.name==='ngeblogging.com'&&v?.status==='active'],['/custom_hostnames/fallback_origin',v=>v?.origin===ORIGIN&&v?.status==='active'],['/dns_records?name='+TARGET+'&per_page=5',v=>Array.isArray(v)&&v.some(r=>r.name===TARGET&&r.proxied===true&&['A','AAAA','CNAME'].includes(r.type))],['/custom_hostnames?per_page=5',Array.isArray]];
  for(const [suffix,valid] of checks){const r=await get(base+suffix,headers);if(r.status!==200||r.data?.success!==true||!valid(r.data.result)){report.cloudflare.state=r.status===401||r.status===403?'read-access-rejected':'read-result-unverified';return report;}}
  report.cloudflare.state='read-preflight-verified';
 }catch{report.cloudflare.state='read-probe-failed';return report;}
 if(env.SUPABASE_URL!==DB||!credential(env.SUPABASE_SERVICE_ROLE_KEY)){report.storage.state='configuration-incomplete';return report;}
 let reference;
 try{
  const key=env.SUPABASE_SERVICE_ROLE_KEY,path=referenceOrderId?'domain_connection_orders?order_id=eq.'+referenceOrderId+'&select=order_id,environment,merchant_id,purpose,amount_idr,currency,period_months,includes_www&limit=1':'domain_connection_orders?select=order_id&limit=0';
  const r=await get(DB+'/rest/v1/'+path,{apikey:key,authorization:'Bearer '+key,accept:'application/json'});
  if(r.status!==200||!Array.isArray(r.data)||r.data.length>(referenceOrderId?1:0)){report.storage.state='read-result-unverified';return report;}
  report.storage.state='ledger-read-accepted';
  if(referenceOrderId===undefined)return report;
  if(r.data.length===0){report.midtrans.state='no-existing-ledger-reference';return report;}
  reference=r.data[0];
 }catch{report.storage.state='read-probe-failed';return report;}
 const merchant=env.DOMAIN_MIDTRANS_PRODUCTION_MERCHANT_ID;
 if(typeof merchant!=='string'||!/^[A-Za-z0-9_-]{2,100}$/.test(merchant)||reference?.order_id!==referenceOrderId||reference.environment!=='production'||reference.merchant_id!==merchant||reference.purpose!==PRICE.billingPurpose||reference.amount_idr!==PRICE.amountIdr||reference.currency!==PRICE.currency||reference.period_months!==PRICE.periodMonths||reference.includes_www!==true){report.midtrans.state='ledger-reference-unverified';return report;}
 let key;try{key=normalizeDomainMidtransServerKey(env.DOMAIN_MIDTRANS_PRODUCTION_SERVER_KEY,{environment:'production'});}catch{report.midtrans.state='key-format-rejected';return report;}
 try{
  const r=await get('https://api.midtrans.com/v2/'+referenceOrderId+'/status',{authorization:'Basic '+btoa(key+':'),accept:'application/json'});
  if(r.status===404||String(r.data?.status_code)==='404'){report.midtrans.state='inconclusive-not-found';return report;}
  if(r.status!==200){report.midtrans.state=r.status===401||r.status===403?'read-access-rejected':'read-result-unverified';return report;}
  const p=r.data,amount=String(p?.gross_amount||'');
  const match=String(p?.status_code)==='200'&&p?.order_id===referenceOrderId&&p?.merchant_id===reference.merchant_id&&p?.currency===reference.currency&&/^\d{1,12}(?:\.\d{1,2})?$/.test(amount)&&(()=>{const [a,b='']=amount.split('.');return BigInt(a)*100n+BigInt(b.padEnd(2,'0'))===BigInt(reference.amount_idr)*100n;})();
  report.midtrans.state=match?'existing-transaction-identity-matched':'read-result-unverified';report.midtrans.merchantIdentityVerified=match;
 }catch{report.midtrans.state='read-probe-failed';}
 return report;
}
