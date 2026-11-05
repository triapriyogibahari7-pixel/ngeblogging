import {normalizeDomainMidtransServerKey} from './domain-midtrans-server-key.mjs';
const ORDER=/^DOM-[a-f0-9]{40}$/;
const STATES=new Set(['pending','authorize','capture','settlement','deny','cancel','expire','failure','refund','partial_refund','chargeback','partial_chargeback']);
export async function observeDomainRecoveryGateway(env,{orderId,amountIdr,signal}={}, {fetchImpl=globalThis.fetch,clock=Date.now}={}){
 const result=(code,extra={})=>({ok:false,code,recoveryAllowed:false,...extra});
 if(!ORDER.test(orderId||'')||!Number.isSafeInteger(amountIdr)||amountIdr<1||amountIdr>1000000000000)return result('INVALID_RECOVERY_REQUEST');
 let key;try{key=normalizeDomainMidtransServerKey(env?.DOMAIN_MIDTRANS_PRODUCTION_SERVER_KEY,{environment:'production'});}catch{return result('GATEWAY_CONFIGURATION_UNAVAILABLE');}
 const merchant=env?.DOMAIN_MIDTRANS_PRODUCTION_MERCHANT_ID;
 if(env?.DOMAIN_ORDER_ENV!=='production'||typeof merchant!=='string'||!/^[A-Za-z0-9_-]{2,100}$/.test(merchant))return result('GATEWAY_CONFIGURATION_UNAVAILABLE');
 if(signal?.aborted)return result('GATEWAY_STATUS_UNAVAILABLE');
 const c=new AbortController(),abort=()=>c.abort();let stop,reader;
 const ended=new Promise((_,reject)=>{stop=()=>reject(Error('TIMEOUT'));c.signal.addEventListener('abort',stop,{once:true});}),wait=p=>Promise.race([p,ended]);
 const timer=setTimeout(abort,8000);signal?.addEventListener('abort',abort,{once:true});
 try{
  const r=await wait(fetchImpl('https://api.midtrans.com/v2/'+encodeURIComponent(orderId)+'/status',{method:'GET',redirect:'error',cache:'no-store',headers:{authorization:'Basic '+btoa(key+':'),accept:'application/json'},signal:c.signal}));
  if([401,403].includes(r.status))return result('GATEWAY_AUTH_REJECTED');
  if(![200,404].includes(r.status)||!/^application\/json(?:\s*;.*)?$/i.test(r.headers.get('content-type')||''))return result('GATEWAY_STATUS_UNAVAILABLE');
  reader=r.body?.getReader();if(!reader)return result('GATEWAY_STATUS_UNAVAILABLE');let size=0;const chunks=[];
  for(;;){const x=await wait(reader.read());if(x.done)break;size+=x.value.length;if(size>16384)throw Error('BODY_TOO_LARGE');chunks.push(x.value);}
  const bytes=new Uint8Array(size);let at=0;for(const x of chunks){bytes.set(x,at);at+=x.length;}
  const g=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)),now=clock();
  if(!Number.isSafeInteger(now)||now<0||now>8640000000000000)throw Error('INVALID_CLOCK');
  const checkedAt=new Date(now).toISOString();
  // A Core API 404 does not establish absence of an existing Snap checkout.
  if(g?.status_code==='404')return result('GATEWAY_SNAP_ABSENCE_UNPROVEN',{gatewayStatus:'unknown',checkedAt});
  if(r.status!==200||g?.order_id!==orderId||g.merchant_id!==merchant||g.currency!=='IDR'||typeof g.gross_amount!=='string'||!/^[1-9][0-9]{0,12}(?:\.0{1,2})?$/.test(g.gross_amount)||Number(g.gross_amount)!==amountIdr||typeof g.transaction_id!=='string'||!/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(g.transaction_id)||!STATES.has(g.transaction_status))return result('GATEWAY_IDENTITY_UNVERIFIED');
  return result('GATEWAY_EXISTING_TRANSACTION',{gatewayStatus:g.transaction_status,checkedAt});
 }catch{return result('GATEWAY_STATUS_UNAVAILABLE');}
 finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);c.signal.removeEventListener('abort',stop);if(reader){reader.cancel().catch(()=>{});try{reader.releaseLock();}catch{}}}
}
