import React,{useEffect,useMemo,useRef,useState} from 'react';
import {loadPaymentSdk,openPaymentPopup,paymentPopupVisible} from './midtrans-popup-sdk.mjs';
import {embedFrameState} from './midtrans-embed-watchdog.mjs';
import {verifyDomainMidtransTarget,reserveDomainPaymentTab} from './domain-midtrans-payment-target.mjs';
const h=React.createElement;
export default function DomainMidtransPayment({payment,reservedTab,onCheckStatus,onClose}){
 const [message,setMessage]=useState('Menyiapkan kotak pembayaran untuk pesanan yang sama.'),[busy,setBusy]=useState(false),[clock,setClock]=useState(Date.now());
 const live=useRef(false),generation=useRef(0),lock=useRef(false),monitor=useRef(null),sdk=useRef(null),tab=useRef(reservedTab),callbacks=useRef({onCheckStatus});
 callbacks.current={onCheckStatus};
 const target=useMemo(()=>{try{return verifyDomainMidtransTarget(payment,{orderId:payment.orderId,amountIdr:payment.amountIdr});}catch{return null;}},[payment]);
 const expired=!target||Date.parse(target.expiresAt)<=clock;
 function stop(){clearInterval(monitor.current);monitor.current=null;lock.current=false;}
 async function check(){try{const result=await callbacks.current.onCheckStatus?.();if(live.current)setMessage(result?.paymentState?'Status pembayaran dari server: '+result.paymentState+'. Pendaftaran domain mengikuti verifikasi server.':'Status server belum pasti; jangan membuat pembayaran baru.');}catch{if(live.current)setMessage('Status server belum dapat diperiksa. Gunakan pesanan yang sama; jangan membayar ulang.');}}
 function open(retry=false){
  if(lock.current||!target)return;
  try{verifyDomainMidtransTarget(payment,{orderId:payment.orderId,amountIdr:payment.amountIdr});}catch{setMessage('Pembayaran kedaluwarsa atau tidak valid. Periksa status pesanan.');return;}
  if(retry){tab.current?.closeUnused();tab.current=reserveDomainPaymentTab(window);}
  const run=++generation.current,current=()=>live.current&&generation.current===run;let settled=false;
  lock.current=true;setBusy(true);setMessage('Memuat popup Midtrans untuk pesanan ini...');
  const report=text=>{if(current())setMessage(text);};
  function done(text){if(!current()||settled)return;settled=true;stop();tab.current?.closeUnused();setBusy(false);report(text);void check();}
  function fallback(text){
   if(!current()||settled)return;settled=true;stop();sdk.current?.hide?.();setBusy(false);
   try{const opened=tab.current?.navigate(payment,{orderId:payment.orderId,amountIdr:payment.amountIdr});report(opened?'Popup belum tampil. Pembayaran pesanan yang sama diarahkan ke tab cadangan.':text+' Gunakan tautan Buka pembayaran di tab baru.');}
   catch{tab.current?.closeUnused();report('Pembayaran tidak lagi valid. Periksa status pesanan sebelum melanjutkan.');}
  }
  (async()=>{try{
   if(!target.clientKey){fallback('Client Key popup belum tersedia.');return;}
   const loaded=await loadPaymentSdk('production',target.clientKey,{timeoutMs:8000});if(!current())return;sdk.current=loaded;
   openPaymentPopup(loaded,target.snapToken,{onSuccess:()=>done('Midtrans melaporkan hasil pembayaran; verifikasi server tetap diperlukan.'),onPending:()=>done('Pembayaran masih menunggu penyelesaian.'),onError:()=>done('Midtrans melaporkan kendala. Periksa pesanan yang sama.'),onClose:()=>done('Popup ditutup. Anda dapat membuka pesanan yang sama lagi.')});
   if(!current()||!lock.current)return;report('Menunggu kotak pembayaran benar-benar terlihat...');
   const started=Date.now();let seen=false,missing=null;
   const watcher=setInterval(()=>{
    if(!current()){clearInterval(watcher);return;}
    const now=Date.now(),visible=paymentPopupVisible(document,window,'production');if(visible)missing=null;else if(seen&&missing===null)missing=now;
    const state=embedFrameState({visible,seen,elapsed:now-started,missingFor:missing===null?0:now-missing});
    if(state==='visible'&&!seen){seen=true;tab.current?.closeUnused();report('Kotak pembayaran Midtrans terlihat. Selesaikan pesanan ini.');}
    else if(state==='timeout')fallback('Kotak pembayaran belum terlihat.');
    else if(state==='missing'){stop();setBusy(false);report('Kotak pembayaran tidak terlihat lagi. Buka kembali pesanan yang sama atau gunakan tautan resmi.');}
   },500);monitor.current=watcher;
  }catch{fallback('Popup gagal dimuat.');}})();
 }
 useEffect(()=>{live.current=true;if(target)open();const tick=setInterval(()=>setClock(Date.now()),1000);return()=>{live.current=false;generation.current++;clearInterval(tick);stop();sdk.current?.hide?.();};},[payment]);
 function manual(event){try{verifyDomainMidtransTarget(payment,{orderId:payment.orderId,amountIdr:payment.amountIdr});generation.current++;stop();sdk.current?.hide?.();tab.current?.closeUnused();setBusy(false);setMessage('Tautan resmi pesanan yang sama dipilih. Periksa status server setelah pembayaran.');}catch{event.preventDefault();setMessage('Pembayaran kedaluwarsa atau tidak valid. Periksa status pesanan.');}}
 const orderLink=/^DOM-[a-f0-9]{40}$/.test(payment?.orderId||'')?h('p',null,h('a',{href:'/domains/orders/'+payment.orderId},'Lihat status pesanan domain')):null;
 if(!target)return h('section',{className:'sv124-card domain-purchase-page'},h('p',{role:'alert'},'Pembayaran kedaluwarsa atau tidak lolos validasi. Jangan membuat tagihan pengganti.'),orderLink,h('button',{type:'button',onClick:onClose},'Tutup'));
 const price=new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(target.amountIdr);
 return h('section',{className:'sv124-card domain-purchase-page','aria-label':'Pembayaran domain Midtrans'},h('h2',null,'Pembayaran domain'),h('p',null,'Pesanan: ',h('code',null,target.orderId)),h('p',null,'Total: ',price),h('p',{role:'status','aria-live':'polite'},message),expired?h('p',{role:'alert'},'Waktu pembayaran habis. Periksa status pesanan.'):null,h('button',{type:'button',disabled:busy||expired,onClick:()=>open(true)},'Tampilkan pembayaran Midtrans'),h('button',{type:'button',onClick:()=>void check()},'Periksa status pesanan'),h('p',null,h('a',{href:expired?undefined:target.url,'aria-disabled':expired,target:'_blank',rel:'noopener noreferrer',onClick:manual},'Buka pembayaran di tab baru untuk pesanan ini')),orderLink,h('button',{type:'button',onClick:onClose},'Tutup'),h('p',null,'Popup atau halaman pembayaran bukan bukti pembayaran selesai. Pendaftaran domain hanya mengikuti verifikasi server. Jangan membuat pembayaran pengganti.'));
}
