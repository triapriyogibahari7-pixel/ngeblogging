import {readKeyDiagnosticUiCode,keyDiagnosticMessages} from './domain-key-diagnostic-ui.mjs';
import {loadOrderStatus} from './domain-order-status-model.mjs';
import {verifyDomainMidtransTarget} from './domain-midtrans-payment-target.mjs';
import {standardOrderPaymentDeadline} from '../shared/domain-standard-checkout-window.mjs';
const ORDER=/^DOM-[a-f0-9]{40}$/;
const fail=code=>{throw Object.assign(Error(code),{code});};
export function orderActionAvailability(o,now=Date.now()){
 if(!o||!ORDER.test(o.orderId)||o.currency!=='IDR'||!Number.isSafeInteger(o.amountIdr)||o.amountIdr<1||o.amountIdr>1000000000000||typeof o.domain!=='string'||!Number.isSafeInteger(now)||!Number.isFinite(Date.parse(o.createdAt)))return {pay:false,cancel:false,reason:'Status pesanan belum terverifikasi.'};
 if(o.paymentState!=='pending'||o.registrationState!=='not_started'||o.resolution!=='none')return {pay:false,cancel:false,reason:'Pesanan bukan pembayaran tertunda yang dapat diproses. Periksa status terbaru.'};
 let deadline;try{deadline=standardOrderPaymentDeadline(o.createdAt);}catch{return {pay:false,cancel:false,reason:'Status pesanan belum terverifikasi.'};}
 const created=Date.parse(o.createdAt),pay=created<=now&&now<deadline;
 const reason=now<created?'Waktu perangkat berada sebelum waktu pembuatan pesanan. Pembayaran ditahan; periksa waktu perangkat dan status pesanan yang sama.':pay?'Pembayaran memiliki batas 2 jam sejak pesanan dibuat. Server tetap memeriksa registran, harga terkunci, dan checkout pesanan yang sama.':'Batas pembayaran 2 jam sejak pesanan dibuat sudah berakhir. Memuat ulang halaman tidak memperpanjang tenggat. Periksa status pesanan yang sama; jangan membuat tagihan pengganti. Pembatalan tetap harus diverifikasi server dan tidak membatalkan tagihan gateway.';
 return {pay,cancel:true,reason};
}
async function post(path,body,token,{fetchImpl,signal}){
 if(typeof token!=='string'||!/^\S{1,8192}$/.test(token))fail('INVALID_SESSION');if(signal?.aborted)fail('REQUEST_ABORTED');
 const c=new AbortController(),abort=()=>c.abort();let stop,reader;
 const ended=new Promise((_,reject)=>{stop=()=>reject(Error('ORDER_ACTION_UNCONFIRMED'));c.signal.addEventListener('abort',stop,{once:true});});
 const timer=setTimeout(abort,25000),wait=p=>Promise.race([p,ended]);signal?.addEventListener('abort',abort,{once:true});
 try{
  const r=await wait(fetchImpl(path,{method:'POST',redirect:'error',cache:'no-store',credentials:'same-origin',headers:{authorization:'Bearer '+token,accept:'application/json','content-type':'application/json'},body:JSON.stringify(body),signal:c.signal}));
  if(!/^application\/json(?:\s*;.*)?$/i.test(r.headers.get('content-type')||''))fail('ORDER_ACTION_UNCONFIRMED');
  reader=r.body?.getReader();if(!reader)fail('ORDER_ACTION_UNCONFIRMED');let size=0;const chunks=[];
  for(;;){const x=await wait(reader.read());if(x.done)break;size+=x.value.length;if(size>32768)fail('ORDER_ACTION_UNCONFIRMED');chunks.push(x.value);}
  const bytes=new Uint8Array(size);let at=0;for(const x of chunks){bytes.set(x,at);at+=x.length;}
  const value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  if(!r.ok){const diagnostic=path==='/api/commerce/domains/checkout'?readKeyDiagnosticUiCode(value):null;fail(diagnostic||(typeof value?.code==='string'&&/^[A-Z][A-Z0-9_]{0,79}$/.test(value.code)?value.code:'ORDER_ACTION_UNCONFIRMED'));}
  return value;
 }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);c.signal.removeEventListener('abort',stop);if(reader){reader.cancel().catch(()=>{});try{reader.releaseLock();}catch{}}}
}
export async function performExistingOrderAction(action,expected,token,{confirmed=false,signal,fetchImpl=globalThis.fetch,now=()=>Date.now(),loadStatus=loadOrderStatus}={}){
 if(!['pay','cancel'].includes(action)||!expected||typeof expected.orderId!=='string'||!ORDER.test(expected.orderId))fail('ORDER_ACTION_UNCONFIRMED');
 if(action==='cancel'&&confirmed!==true)fail('CANCELLATION_CONFIRMATION_REQUIRED');
 const fresh=await loadStatus(expected.orderId,token,{signal,fetchImpl});
 if(fresh.orderId!==expected.orderId||fresh.domain!==expected.domain||fresh.currency!=='IDR'||fresh.amountIdr!==expected.amountIdr)fail('ORDER_ACTION_UNCONFIRMED');
 const allowed=orderActionAvailability(fresh,now());if(!allowed[action])fail(action==='pay'&&allowed.cancel?'CHECKOUT_WINDOW_EXPIRED':'ORDER_ALREADY_PROCESSED');
 const value=await post(action==='pay'?'/api/commerce/domains/checkout':'/api/commerce/domains/order-cancel',action==='pay'?{orderId:expected.orderId}:{orderId:expected.orderId,confirmed:true},token,{fetchImpl,signal});
 if(signal?.aborted)fail('REQUEST_ABORTED');
 if(action==='pay'){
  if(value?.code!=='DOMAIN_CHECKOUT_PRODUCTION'||value.environment!=='production'||value.purchaseAllowed!==true||value.checkoutCreated!==true||value.registrationStarted!==false||typeof value.reused!=='boolean')fail('ORDER_ACTION_UNCONFIRMED');
  return {kind:'payment',target:verifyDomainMidtransTarget({...value.checkout,environment:value.environment},{orderId:expected.orderId,amountIdr:fresh.amountIdr,now:now()})};
 }
 const o=value?.order;
 if(value?.code!=='DOMAIN_ORDER_CANCELLED'||value.environment!=='production'||value.cancellationConfirmed!==true||value.scope!=='before_checkout'||typeof value.reused!=='boolean'||value.gatewayActionTaken!==false||value.registrationStarted!==false||o?.orderId!==expected.orderId||o.currency!=='IDR'||o.amountIdr!==fresh.amountIdr||o.paymentState!=='cancelled'||o.registrationState!=='not_started')fail('ORDER_ACTION_UNCONFIRMED');
 return {kind:'cancelled',orderId:expected.orderId,reused:value.reused};
}
export const orderActionErrors={...keyDiagnosticMessages,REGISTRANT_DETAILS_REQUIRED:'Data registran untuk order ini belum lengkap. Pembayaran belum dibuat.',CHECKOUT_WINDOW_EXPIRED:'Jendela pembayaran order sudah berakhir. Tidak ada tagihan pengganti dibuat.',CHECKOUT_EXPIRED:'Checkout pesanan yang sama sudah kedaluwarsa.',CHECKOUT_IN_PROGRESS:'Checkout pesanan ini sedang diproses. Periksa status; jangan membuat order baru.',CHECKOUT_RECONCILIATION_REQUIRED:'Status checkout perlu direkonsiliasi. Jangan membuat tagihan pengganti.',DOMAIN_CANCELLATION_DISABLED:'Pembatalan belum diaktifkan di server. Pesanan belum dinyatakan dibatalkan.',GATEWAY_CANCELLATION_REQUIRED:'Order sudah memiliki jejak checkout/pembayaran. Jalur ini tidak membatalkan tagihan Midtrans; diperlukan penanganan gateway.',ORDER_ALREADY_PROCESSED:'Status order berubah atau sudah diproses. Perbarui status sebelum melanjutkan.',ORDER_REVIEW_REQUIRED:'Order memerlukan peninjauan; pembayaran dan pembatalan otomatis tidak dilanjutkan.',REGISTRATION_DETAILS_LOCKED:'Data registrasi sudah terkunci; pembatalan otomatis tidak dilanjutkan.',INVALID_SESSION:'Sesi tidak valid. Masuk kembali dengan akun pemilik order.',SESSION_CHANGED:'Akun berubah. Aksi tidak dilanjutkan.',ORDER_ACTION_UNCONFIRMED:'Hasil aksi belum terverifikasi. Periksa status pesanan yang sama; jangan membuat pembayaran pengganti.'};
