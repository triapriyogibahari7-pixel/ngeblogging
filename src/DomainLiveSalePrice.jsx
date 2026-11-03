import React,{useEffect,useState} from 'react';
import {getVerifiedSession} from './lib/auth-session-v76.js';
import {fetchPurchaseQuote} from './domain-purchase-model.mjs';
const money=value=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(value);
const jobs=[];let running=0;
function drain(){while(running<2&&jobs.length){const job=jobs.shift();running++;Promise.resolve().then(job.work).then(job.resolve,job.reject).finally(()=>{running--;drain();});}}
function enqueue(work){return new Promise((resolve,reject)=>{jobs.push({work,resolve,reject});drain();});}
const errors={DOMAIN_PRICING_INPUTS_UNAVAILABLE:'Konfigurasi biaya, pajak, atau kurs server belum valid. Penawaran tidak diterbitkan.',DOMAIN_PRODUCTION_QUOTE_DISABLED:'Layanan penawaran harga belum diaktifkan di server.',DOMAIN_UNAVAILABLE:'Domain ini tidak lagi tersedia untuk didaftarkan.',PREMIUM_NOT_SUPPORTED:'Pembelian domain premium belum didukung.',UNSUPPORTED_EXTENSION:'Ekstensi ini belum didukung untuk pembelian.',REGISTRAR_QUOTE_UNAVAILABLE:'Registrar belum dapat memastikan harga dan ketersediaan.',INVALID_SESSION:'Sesi akun perlu diperbarui. Masuk kembali sebelum memeriksa harga.',SESSION_CHANGED:'Akun berubah. Cari kembali dengan akun pemilik situs.',QUOTE_UNVERIFIED:'Penawaran server belum lolos validasi. Harga tidak digunakan.',SNAPSHOT_REFRESH_REQUIRED:'Data harga perlu diperbarui. Silakan coba lagi.'};
export default function DomainLiveSalePrice({domain,userId,disabled=false,onSelect}){
 const [retry,setRetry]=useState(0),[state,setState]=useState({kind:'loading'}),[clock,setClock]=useState(Date.now());
 useEffect(()=>{let live=true;const controller=new AbortController();setState({kind:'loading'});const current=()=>live&&!controller.signal.aborted;
  enqueue(async()=>{if(!current())return;const auth=await getVerifiedSession({force:true});if(!current())return;if(auth?.verification!=='verified'||auth.user?.id!==userId||!auth.session?.access_token)throw Object.assign(Error(),{code:'INVALID_SESSION'});const quote=await fetchPurchaseQuote(domain,auth.session.access_token,{signal:controller.signal});if(!current())return;const next=await getVerifiedSession({force:true});if(!current())return;if(next?.verification!=='verified'||next.user?.id!==userId)throw Object.assign(Error(),{code:'SESSION_CHANGED'});setClock(Date.now());setState({kind:'ready',quote});}).catch(error=>{if(current())setState({kind:'error',message:errors[error?.code]||'Harga belum dapat diambil dari server. Silakan coba lagi; belum ada pesanan atau pembayaran.'});});
  return ()=>{live=false;controller.abort();};
 },[domain,userId,retry]);
 useEffect(()=>{if(state.kind!=='ready')return;const timer=setInterval(()=>setClock(Date.now()),1000);return ()=>clearInterval(timer);},[state]);
 const quote=state.kind==='ready'?state.quote:null,expired=quote&&Date.parse(quote.expiresAt)<=clock;
 return <div className="dcs-sale-price" aria-label={'Harga jual '+domain} aria-busy={state.kind==='loading'}>
  {state.kind==='loading'&&<p role="status">Menghitung harga jual melalui server…</p>}
  {state.kind==='error'&&<><p role="alert">{state.message}</p><button type="button" className="sv124-secondary" disabled={disabled} onClick={()=>setRetry(value=>value+1)}>Coba ambil harga lagi</button></>}
  {quote&&<><dl className="dosp-details"><div><dt>Harga jual total</dt><dd>{money(quote.amountIdr)}</dd></div><div><dt>Padanan harga jual USD</dt><dd>USD {quote.salePriceUsd}</dd></div><div><dt>Pendaftaran</dt><dd>{quote.years} tahun</dd></div><div><dt>Penawaran berlaku sampai</dt><dd>{new Date(quote.expiresAt).toLocaleString('id-ID')}</dd></div></dl><p>Total berasal dari penawaran server, bukan harga modal registrar. Tidak ada pesanan atau pembayaran dibuat saat memeriksa harga.</p>{expired?<><p role="status">Penawaran kedaluwarsa. Perbarui harga sebelum memilih.</p><button type="button" className="sv124-secondary" disabled={disabled} onClick={()=>setRetry(value=>value+1)}>Perbarui harga</button></>:<button type="button" className="sv124-primary" disabled={disabled} onClick={()=>{if(Date.parse(quote.expiresAt)<=Date.now()){setClock(Date.now());return;}onSelect?.();}}>Pilih nama untuk formulir</button>}</>}
 </div>;
}
