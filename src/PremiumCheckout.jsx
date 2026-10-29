import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { hostedCheckoutUrl } from './midtrans-hosted-checkout.mjs';
import { recoverSnapToken } from './midtrans-token-recovery.mjs';
import { loadPaymentSdk, openPaymentPopup, paymentPopupVisible } from './midtrans-popup-sdk.mjs';
import { embedFrameState } from './midtrans-embed-watchdog.mjs';
import './premium-checkout.css';
import './payment-checkout-portal.css';
export default function PremiumCheckout({orderId,token,clientKey,environment,productName,amount,url,onRefresh,onBack}) {
  const [state,setState]=useState('ready'),[message,setMessage]=useState('Klik Tampilkan pembayaran untuk membuka kotak pembayaran Midtrans di atas halaman ini.');
  const live=useRef(false),lock=useRef(false),monitor=useRef(null),active=useRef(null),callbacks=useRef({onRefresh});
  callbacks.current={onRefresh};
  useEffect(()=>{live.current=true;return()=>{live.current=false;clearInterval(monitor.current);if(active.current)active.current.hide?.();};},[]);
  const target=hostedCheckoutUrl(url,environment);
  async function refresh() { await onRefresh?.(); }
  function report(next,text) { if(live.current){setState(next);setMessage(text);} }
  function stop() { clearInterval(monitor.current);monitor.current=null;lock.current=false; }
  function verifiedRefresh() { Promise.resolve().then(()=>callbacks.current.onRefresh?.()).catch(()=>report('error','Status server belum dapat diperiksa. Jangan membayar ulang sebelum status jelas.')); }
  async function open() {
    if(lock.current)return;lock.current=true;report('loading','Memuat kotak pembayaran untuk order yang sama...');
    try {
      let storage;try{storage=window.sessionStorage;}catch{}
      const resolved=recoverSnapToken({token,orderId,environment,storage});
      const sdk=await loadPaymentSdk(environment,clientKey);
      if(!live.current){lock.current=false;return;}
      active.current=sdk;
      openPaymentPopup(sdk,resolved,{
        onSuccess:()=>{stop();report('ready','Midtrans melaporkan pembayaran. Aktivasi tetap menunggu verifikasi server.');verifiedRefresh();},
        onPending:()=>{stop();report('ready','Pembayaran masih menunggu penyelesaian. Periksa status order sebelum membayar ulang.');verifiedRefresh();},
        onError:()=>{stop();report('error','Midtrans melaporkan kendala. Periksa status order yang sama sebelum mencoba kembali.');verifiedRefresh();},
        onClose:()=>{stop();report('ready','Kotak pembayaran ditutup. Anda dapat membukanya kembali untuk order yang sama.');verifiedRefresh();}
      });
      if(!lock.current)return;
      report('opening','Menunggu kotak pembayaran benar-benar terlihat...');
      const started=Date.now();let seen=false,missingSince=null;
      monitor.current=setInterval(()=>{
        if(!live.current){stop();return;}
        const now=Date.now(),visible=paymentPopupVisible(document,window,environment);
        if(visible)missingSince=null;
        else if(seen&&missingSince===null)missingSince=now;
        const frameState=embedFrameState({visible,seen,elapsed:now-started,missingFor:missingSince===null?0:now-missingSince});
        if(frameState==='visible'){
          if(!seen){seen=true;report('open','Kotak pembayaran Midtrans terlihat. Pilih metode yang tersedia di dalamnya.');}
        }else if(frameState==='missing'){
          stop();report('error','Kotak pembayaran tidak terlihat lagi. Tekan Tampilkan pembayaran untuk membuka order yang sama, atau gunakan tautan resmi di bawah. Jangan membuat tagihan baru.');
        }else if(frameState==='timeout'){
          stop();report('error','Kotak pembayaran belum terlihat. Gunakan tautan resmi di bawah untuk order yang sama; jangan membuat tagihan baru.');
        }
      },500);
    }catch(error){stop();report('error',error.message||'Pembayaran belum dapat dibuka.');}
  }
  const validAmount=Number.isSafeInteger(amount)&&amount>0;
  const price=validAmount?new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(amount):'Harga belum terverifikasi';
  const canOpen=validAmount&&/^NARA-[a-f0-9]{40}$/.test(orderId||'')&&Boolean(clientKey);
  if(typeof document==='undefined')return null;
  return createPortal(<div className="pc-portal-layer" role="dialog" aria-modal="true" aria-label="Pembayaran Nara AI"><section className="pc-shell" aria-label="Checkout Ngeblogging">
    <aside className="pc-summary"><span className="pc-eyebrow">NGEBLOGGING · CHECKOUT</span><h2>Ringkasan pembayaran</h2><h3>{productName}</h3><strong className="pc-price">{price}</strong><p className="pc-order">ID pesanan: {orderId}</p>{environment==='sandbox'&&<p role="status">Mode sandbox — bukan pembayaran produksi.</p>}<button type="button" onClick={onBack}>Kembali ke pilihan paket</button></aside>
    <div className="pc-payment"><span className="pc-eyebrow">PEMBAYARAN MIDTRANS DI DALAM SITUS</span><h2>Pilih cara bayar Anda</h2>
      <p>Ini popup resmi Midtrans di atas halaman Ngeblogging, bukan checkout Core API kustom. Pilihan VA, GoPay, dan QRIS mengikuti metode yang tersedia untuk transaksi ini. Ketersediaan GoPay Later belum diverifikasi.</p>
      <p role="status" aria-live="polite" className="pc-status">{message}</p>
      <button type="button" disabled={!canOpen||['loading','opening','open'].includes(state)} onClick={open}>{state==='loading'?'Memuat pembayaran...':state==='open'?'Pembayaran sedang terbuka':'Tampilkan pembayaran'}</button>
      <button type="button" onClick={()=>refresh().catch(()=>report('error','Status server belum dapat diperiksa.'))}>Periksa status order</button>
      {!canOpen&&<p role="alert">Konfigurasi popup belum lengkap. Gunakan pembayaran resmi untuk order yang sama.</p>}
      {target&&<p><a href={target} rel="noreferrer">Jika popup gagal, buka pembayaran order ini di Midtrans</a></p>}
      <p>Browser tidak mengaktifkan paket. Aktivasi mengikuti verifikasi pembayaran pada server; jangan membuat pembayaran pengganti saat status belum jelas.</p>
    </div>
  </section></div>,document.body);
}
