import React,{useEffect,useState} from 'react';
import {getVerifiedSession} from './lib/auth-session-v76.js';
import {fetchDomainAutomaticEstimate} from './domain-automatic-price-model.mjs';
import {getFinalDomainQuote} from './domain-final-quote-source.mjs';
import {readPricingDiagnostic} from './domain-purchase-model.mjs';
const money=value=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(value);
const jobs=[];let running=0;
function drain(){while(running<1&&jobs.length){const job=jobs.shift();running++;Promise.resolve().then(job.work).then(job.resolve,job.reject).finally(()=>{running--;drain();});}}
function enqueue(work){return new Promise((resolve,reject)=>{jobs.push({work,resolve,reject});drain();});}
const messages={INVALID_SESSION:'Sesi akun perlu diperbarui. Masuk kembali sebelum mengambil harga.',SESSION_CHANGED:'Akun berubah. Ambil harga kembali dengan akun yang benar.',DOMAIN_ESTIMATE_RATE_LIMITED:'Batas permintaan estimasi tercapai. Tunggu sebelum mencoba kembali.',DOMAIN_ESTIMATE_BUSY:'Permintaan estimasi masih diproses atau kapasitas sementara penuh.',ESTIMATE_RESPONSE_UNVERIFIED:'Respons estimasi tidak lolos pemeriksaan. Angka tidak ditampilkan.',ESTIMATE_FX_UNAVAILABLE:'Kurs referensi belum tersedia atau kedaluwarsa.',INVALID_REFERENCE_FX:'Data kurs referensi tidak valid.',ESTIMATE_POLICY_INVALID:'Kebijakan estimasi pajak atau biaya pembayaran di server tidak valid.',ESTIMATE_REGISTRAR_UNAVAILABLE:'Registrar belum memberikan harga pendaftaran standar yang dapat digunakan.',ESTIMATE_REGISTRAR_EXPIRED:'Data harga registrar kedaluwarsa. Ambil harga kembali.',DOMAIN_PRICING_INPUTS_UNAVAILABLE:'Harga final belum tersedia. Estimasi tidak dapat digunakan sebagai tagihan checkout.',QUOTE_UNVERIFIED:'Quote final belum lolos validasi. Harga tidak digunakan.'};
function diagnostic(error){const code=typeof error?.code==='string'&&/^[A-Z][A-Z0-9_]{0,79}$/.test(error.code)?error.code:'PRICE_REQUEST_FAILED',detail=readPricingDiagnostic(error),reason=detail.reason||(typeof error?.reason==='string'&&Object.hasOwn(messages,error.reason)?error.reason:null);return {kind:'error',code,reason,status:Number.isInteger(error?.status)&&error.status>=100&&error.status<=599?error.status:null,message:messages[reason]||messages[code]||'Harga belum tersedia. Tidak ada pesanan atau pembayaran dibuat.'};}
export default function DomainLiveSalePrice({domain,userId,disabled=false}){
 const [retry,setRetry]=useState(0),[state,setState]=useState({kind:'loading'}),[clock,setClock]=useState(Date.now());
 useEffect(()=>{let live=true;const controller=new AbortController(),current=()=>live&&!controller.signal.aborted;setState({kind:'loading'});
  enqueue(async()=>{
   if(!current())return;const auth=await getVerifiedSession({force:true});if(!current())return;
   if(auth?.verification!=='verified'||auth.user?.id!==userId||!auth.session?.access_token)throw Object.assign(Error(),{code:'INVALID_SESSION'});
   let nextState;
   try{const quote=await getFinalDomainQuote(domain,auth.session.access_token,{owner:userId,signal:controller.signal,force:retry>0});nextState={kind:'final',quote};}
   catch(error){
    if(!current())return;if(error?.code!=='DOMAIN_PRICING_INPUTS_UNAVAILABLE')throw error;
    const finalDiagnostic=diagnostic(error);
    try{const estimate=await fetchDomainAutomaticEstimate(domain,auth.session.access_token,{signal:controller.signal});nextState={kind:'estimate',estimate,finalReason:finalDiagnostic.reason||null};}
    catch(estimateError){if(!current())return;nextState={...diagnostic(estimateError),finalDiagnostic};}
   }
   if(!current())return;const next=await getVerifiedSession({force:true});if(!current())return;
   if(next?.verification!=='verified'||next.user?.id!==userId)throw Object.assign(Error(),{code:'SESSION_CHANGED'});
   setClock(Date.now());setState(nextState);
  }).catch(error=>{if(current())setState(diagnostic(error));});
  return ()=>{live=false;controller.abort();};
 },[domain,userId,retry]);
 useEffect(()=>{if(!['final','estimate'].includes(state.kind))return;const timer=setInterval(()=>setClock(Date.now()),1000);return ()=>clearInterval(timer);},[state]);
 const quote=state.kind==='final'?state.quote:null,estimate=state.kind==='estimate'?state.estimate:null,price=quote||estimate,expired=price&&Date.parse(price.expiresAt)<=clock;
 return <div className="dcs-sale-price" aria-label={'Harga '+domain} aria-busy={state.kind==='loading'}>
  {state.kind==='loading'&&<p role="status">Meminta quote harga final dari server…</p>}
  {state.kind==='error'&&<>{state.finalDiagnostic&&<p role="status">Quote harga final belum tersedia. Kode: <code>{state.finalDiagnostic.code}</code>{state.finalDiagnostic.status!==null?' · HTTP '+state.finalDiagnostic.status:''}{state.finalDiagnostic.reason&&<> · Alasan: <code>{state.finalDiagnostic.reason}</code></>}. Estimasi berikut juga gagal; estimasi tidak menggantikan quote final.</p>}<p role="alert">{state.message}</p><p>Kode: <code>{state.code}</code>{state.status!==null?' · HTTP '+state.status:''}{state.reason&&<> · Alasan: <code>{state.reason}</code></>}. Tidak ada pesanan atau pembayaran dibuat.</p></>}
  {expired&&<p role="status">Harga kedaluwarsa. Quote baru diperlukan; total terbaru harus disetujui kembali sebelum pembayaran.</p>}
  {quote&&!expired&&<><p><strong>Harga final dari quote server</strong></p><dl className="dosp-details"><div><dt>Total pembayaran</dt><dd>{money(quote.amountIdr)}</dd></div><div><dt>Pendaftaran</dt><dd>{quote.years} tahun</dd></div><div><dt>Berlaku sampai</dt><dd>{new Date(quote.expiresAt).toLocaleString('id-ID')}</dd></div></dl><p>Checkout menggunakan quote yang sama selama masih berlaku untuk akun dan domain ini. Persetujuan harga dan ketentuan tetap diperlukan sebelum pembayaran.</p></>}
  {estimate&&!expired&&<><p><strong>Estimasi saja, bukan harga final checkout</strong></p><p>Server belum menerbitkan quote final{state.finalReason?<> · Alasan: <code>{state.finalReason}</code></>:null}. Angka di bawah tidak dipakai sebagai tagihan.</p><dl className="dosp-details"><div><dt>Perkiraan biaya registrar</dt><dd>{money(estimate.registrarCostEstimateIdr)}</dd></div><div><dt>Target margin layanan</dt><dd>{money(estimate.targetMarginIdr)}</dd></div><div><dt>Subtotal sebelum pajak dan biaya pembayaran</dt><dd>{money(estimate.subtotalBeforeTaxAndPaymentFeesIdr)}</dd></div><div><dt>Estimasi pajak</dt><dd>{estimate.taxEstimateIdr===null?'Belum dihitung; bukan nol':money(estimate.taxEstimateIdr)}</dd></div><div><dt>Estimasi biaya pembayaran</dt><dd>{estimate.paymentFeeEstimateIdr===null?'Belum dihitung; bukan nol':money(estimate.paymentFeeEstimateIdr)}</dd></div><div><dt>Total estimasi, bukan tagihan</dt><dd>{estimate.totalEstimateIdr===null?'Belum tersedia':money(estimate.totalEstimateIdr)}</dd></div><div><dt>Kurs referensi</dt><dd>1 USD = {estimate.fx.rate} IDR · {estimate.fx.source} · {estimate.fx.rateDate}</dd></div></dl><p>Kurs referensi bukan biaya konversi aktual yang terverifikasi. Rp25.000 adalah target margin, bukan jaminan keuntungan bersih. Checkout tetap memerlukan quote final.</p></>}
  {state.kind!=='loading'&&<button type="button" className="sv124-secondary" disabled={disabled} onClick={()=>setRetry(value=>value+1)}>Perbarui harga dari server</button>}
 </div>;
}
