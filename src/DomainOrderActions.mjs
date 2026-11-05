import React,{useEffect,useRef,useState} from 'react';
import DomainManagementCard from './DomainManagementCard.jsx';
import DomainNotificationInbox from './DomainNotificationInbox.jsx';
import DomainOrderSummaryCard from './DomainOrderSummaryCard.mjs';
import {getVerifiedSession} from './lib/auth-session-v76.js';
import {clearCompletedPurchase} from './domain-purchase-model.mjs';
import {orderActionAvailability,performExistingOrderAction,orderActionErrors} from './domain-order-actions.mjs';
import {verifyDomainMidtransTarget} from './domain-midtrans-payment-target.mjs';
const h=React.createElement;
export default function DomainOrderActions({order,owner,token,onRefresh,detail=false}){
 const [busy,setBusy]=useState(false),[review,setReview]=useState(false),[notice,setNotice]=useState(''),[target,setTarget]=useState(null),[clock,setClock]=useState(Date.now());
 const active=useRef(null),scope=JSON.stringify([order.orderId,owner,token,order.amountIdr,order.domain,order.paymentState,order.registrationState,order.resolution]);
 useEffect(()=>{setBusy(false);setReview(false);setNotice('');setTarget(null);const timer=setInterval(()=>setClock(Date.now()),1000);return()=>{clearInterval(timer);active.current?.abort();active.current=null;};},[scope]);
 const allowed=orderActionAvailability(order,clock);
 async function session(expected){const a=await getVerifiedSession({force:true});if(a?.verification!=='verified'||!a.user?.id||!a.session?.access_token)throw Object.assign(Error(),{code:'INVALID_SESSION'});if((owner&&a.user.id!==owner)||(expected&&a.user.id!==expected)||(token&&a.session.access_token!==token))throw Object.assign(Error(),{code:'SESSION_CHANGED'});return a;}
 async function release(auth,signal){
  const key='ngeblogging:domain-purchase:v1:'+auth.user.id.toLowerCase();let snapshot;
  const guarded={getItem(name){if(name!==key)throw Error();const raw=localStorage.getItem(name);if(snapshot!==undefined&&snapshot!==raw)throw Error();snapshot=raw;if(raw!==null&&JSON.parse(raw)?.orderId!==order.orderId)throw Object.assign(Error(),{code:'LOCAL_ORDER_MISMATCH'});return raw;},removeItem(name){if(signal.aborted||name!==key||typeof snapshot!=='string'||localStorage.getItem(name)!==snapshot)throw Error();const archive=key+':terminal-archive:'+order.orderId,prior=localStorage.getItem(archive);if(prior!==null&&prior!==snapshot)throw Error();localStorage.setItem(archive,snapshot);if(signal.aborted||localStorage.getItem(archive)!==snapshot||localStorage.getItem(name)!==snapshot)throw Error();localStorage.removeItem(name);}};
  await clearCompletedPurchase({owner:auth.user.id,token:auth.session.access_token,storage:guarded,locks:navigator.locks,signal});
 }
 async function run(action){
  if(!['pay','cancel','archive'].includes(action)||active.current||busy||(action==='cancel'&&!review))return;
  const c=new AbortController();active.current=c;setBusy(true);setNotice('');
  try{const auth=await session();if(c.signal.aborted)return;
   if(action==='archive'){await release(auth,c.signal);await session(auth.user.id);if(!c.signal.aborted){setReview(false);setTarget(null);setNotice('Catatan lokal pesanan yang sama sudah dilepas atau memang tidak ada. Jika ada catatan, arsip disimpan sebelum penghapusan. Pesanan dan tagihan di server tidak dihapus.');}return;}
   const result=await performExistingOrderAction(action,order,auth.session.access_token,{confirmed:action==='cancel',signal:c.signal});
   if(c.signal.aborted)return;await session(auth.user.id);if(c.signal.aborted)return;
   if(result.kind==='payment'){setTarget(result.target);setNotice('Tautan resmi untuk order yang sama siap. Membuka tautan bukan bukti pembayaran lunas.');}
   else{setReview(false);try{await release(auth,c.signal);}catch{}if(!c.signal.aborted){setNotice('Pembatalan dikonfirmasi server. Perbarui status; catatan lokal dapat dilepas dengan tombol arsip jika masih tertahan.');onRefresh?.();}}
  }catch(error){if(!c.signal.aborted){const code=typeof error?.code==='string'&&/^[A-Z][A-Z0-9_]{0,79}$/.test(error.code)?error.code:'ORDER_ACTION_UNCONFIRMED';const localErrors={ATTEMPT_HELD:'Catatan lokal dipertahankan karena status server belum mengizinkan pelepasan. Perbarui status pesanan yang sama; jangan membuat pembayaran pengganti.',LOCAL_ORDER_MISMATCH:'Catatan lokal milik pesanan lain. Tidak ada catatan yang dihapus.',CHECKOUT_LOCK_UNAVAILABLE:'Penguncian antar-tab tidak tersedia pada browser ini. Catatan lokal tidak dihapus.',CHECKOUT_IN_PROGRESS:'Pesanan sedang diproses di tab lain. Catatan lokal tidak dihapus.'};setNotice((localErrors[code]||orderActionErrors[code]||orderActionErrors.ORDER_ACTION_UNCONFIRMED)+' Kode: '+code+'.');setTarget(null);setReview(false);}}
  finally{if(active.current===c){active.current=null;if(!c.signal.aborted)setBusy(false);}}
 }
 let payment=null;try{if(target&&allowed.pay)payment=verifyDomainMidtransTarget(target,{orderId:order.orderId,amountIdr:order.amountIdr,now:clock});}catch{}
 const compact=!detail&&Boolean(order.registrar);
 const controls=h('section',{'aria-label':'Aksi pesanan domain','aria-busy':busy},h(compact?'details':'div',{className:'nd-sheet-policy'},compact?h('summary',null,'Ketentuan pembayaran'):null,h('p',null,allowed.reason)),
  h('div',{style:{display:'flex',gap:8,flexWrap:'wrap'}},payment?h('a',{className:'sv124-primary',href:payment.url,target:'_blank',rel:'noopener noreferrer',referrerPolicy:'no-referrer',onClick:event=>{try{if(busy||review)throw Error();verifyDomainMidtransTarget(target,{orderId:order.orderId,amountIdr:order.amountIdr});}catch{event.preventDefault();setTarget(null);setNotice('Tautan tidak lagi tersedia. Periksa status order yang sama.');}}},'Bayar Midtrans'):h('button',{type:'button',className:'sv124-primary',disabled:busy||review||!allowed.pay,onClick:()=>void run('pay')},busy?'Memproses...':'Lanjutkan pembayaran'),
  h('button',{type:'button',className:'sv124-secondary',disabled:busy||!allowed.cancel,onClick:()=>{if(!active.current){setTarget(null);setReview(true);setNotice('');}}},'Batalkan pesanan')),
  review?h('section',{'aria-label':'Konfirmasi pembatalan pesanan'},h('h4',null,'Batalkan pesanan ini?'),h('p',null,order.domain,' — ',order.orderId,' — IDR ',String(order.amountIdr),'. Pembatalan sebelum checkout saja; ini bukan refund atau pembatalan tagihan Midtrans yang sudah terbit.'),h('button',{type:'button',disabled:busy,onClick:()=>setReview(false)},'Kembali'),h('button',{type:'button',disabled:busy,onClick:()=>void run('cancel')},'Ya, batalkan pesanan')):null,
  h('button',{type:'button',className:'sv124-secondary',disabled:busy||review,onClick:()=>void run('archive')},'Arsipkan dan lepas catatan lokal pesanan ini'),
  h('p',null,'Pelepasan memeriksa status server terbaru dan hanya mengarsipkan catatan lokal pesanan yang sama jika aman. Ini bukan pembatalan tagihan, refund, atau penghapusan riwayat pesanan.'),
  h('p',{role:'status','aria-live':'polite'},notice),h('p',null,'Server memutuskan kelayakan terakhir. Aksi ini tidak membuat order pengganti.'));
 if(compact)return h(DomainOrderSummaryCard,{order,onRefresh,renderActions:row=>row.orderId===order.orderId?controls:null});
 return h(React.Fragment,null,order.registrar?h(DomainManagementCard,{order}):null,order.registrar?h(DomainNotificationInbox,{key:scope,orderId:order.orderId,getSession:session}):null,controls);
}
