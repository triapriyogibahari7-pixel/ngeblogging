import {parseDomainRegistrarView} from './domain-registrar-view.mjs';
export const paymentLabels={pending:'Menunggu pembayaran',paid:'Lunas terverifikasi',failed:'Gagal',expired:'Kedaluwarsa',cancelled:'Dibatalkan',review_required:'Perlu peninjauan',refund_pending:'Menunggu pengembalian dana',refunded:'Tercatat dikembalikan'};
export const registrationLabels={not_started:'Belum dimulai',queued:'Dalam antrean',processing:'Sedang diproses',registered:'Terdaftar',failed:'Gagal',review_required:'Perlu peninjauan'};
const ORDER=/^DOM-[a-f0-9]{40}$/;
const time=x=>typeof x==='string'&&x.length<=64&&Number.isFinite(Date.parse(x));
export function orderIdFromPath(path){const match=/^\/domains\/orders\/(DOM-[a-f0-9]{40})\/?$/.exec(path);return match?match[1]:null;}
export function parseOrderStatus(value,id){
 const o=value?.order;
 if(!ORDER.test(id)||value?.code!=='DOMAIN_ORDER_STATUS'||value.environment!=='production'||!o||o.orderId!==id||!Object.hasOwn(paymentLabels,o.paymentState)||!Object.hasOwn(registrationLabels,o.registrationState)||o.currency!=='IDR'||!Number.isSafeInteger(o.amountIdr)||o.amountIdr<1||o.amountIdr>1000000000000||o.years!==1||typeof o.domain!=='string'||o.domain.length>253||!o.domain.includes('.')||o.domain.split('.').some(x=>!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(x))||typeof o.message!=='string'||o.message.length>1000||!['none','review_required','refund_pending','refunded'].includes(o.resolution)||!time(o.createdAt)||!time(o.updatedAt)||Date.parse(o.updatedAt)<Date.parse(o.createdAt))throw Error('STATUS_UNVERIFIED');
 if(o.paymentConfirmed!==(o.paymentState==='paid')||o.registrationConfirmed!==(o.registrationState==='registered')||(o.paymentConfirmed&&!time(o.paidAt))||(o.registrationConfirmed&&(!o.paymentConfirmed||!time(o.registeredAt)))||(['queued','processing'].includes(o.registrationState)&&!o.paymentConfirmed))throw Error('STATUS_UNVERIFIED');
 return {orderId:id,domain:o.domain,years:1,currency:'IDR',amountIdr:o.amountIdr,paymentState:o.paymentState,registrationState:o.registrationState,paymentConfirmed:o.paymentConfirmed,registrationConfirmed:o.registrationConfirmed,paidAt:o.paymentConfirmed?o.paidAt:null,registeredAt:o.registrationConfirmed?o.registeredAt:null,createdAt:o.createdAt,updatedAt:o.updatedAt,resolution:o.resolution,message:o.message,...(Object.hasOwn(o,'registrar')?{registrar:parseDomainRegistrarView(o.registrar,o)}:{})};
}
export async function loadOrderStatus(id,token,{signal,fetchImpl=globalThis.fetch}={}){
 if(!ORDER.test(id)||typeof token!=='string'||!/^\S{1,8192}$/.test(token))throw Error('STATUS_UNVERIFIED');
 if(signal?.aborted)throw Error('STATUS_UNAVAILABLE');
 const c=new AbortController(),abort=()=>c.abort();let stop,reader;
 const ended=new Promise((_,reject)=>{stop=()=>reject(Error('STATUS_UNAVAILABLE'));c.signal.addEventListener('abort',stop,{once:true});});const wait=p=>Promise.race([p,ended]),timer=setTimeout(abort,12000);
 signal?.addEventListener('abort',abort,{once:true});
 try{
  if(c.signal.aborted)throw Error('STATUS_UNAVAILABLE');
  const r=await wait(fetchImpl('/api/commerce/domains/orders/'+id,{method:'GET',redirect:'error',cache:'no-store',credentials:'same-origin',headers:{accept:'application/json',authorization:'Bearer '+token},signal:c.signal}));
  if(!r.ok){const e=Error('STATUS_HTTP_ERROR');e.status=r.status;throw e;}
  reader=r.body?.getReader();if(!reader)throw Error('STATUS_UNVERIFIED');let size=0;const chunks=[];for(;;){const x=await wait(reader.read());if(x.done)break;size+=x.value.length;if(size>32768)throw Error('STATUS_UNVERIFIED');chunks.push(x.value);}const bytes=new Uint8Array(size);let at=0;for(const x of chunks){bytes.set(x,at);at+=x.length;}
  return parseOrderStatus(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)),id);
 }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);c.signal.removeEventListener('abort',stop);if(reader){reader.cancel().catch(()=>{});try{reader.releaseLock();}catch{}}}
}
