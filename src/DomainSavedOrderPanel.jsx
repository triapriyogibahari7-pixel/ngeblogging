import DomainOrderActions from './DomainOrderActions.mjs';
import React,{useEffect,useRef,useState} from 'react';
import {getVerifiedSession} from './lib/auth-session-v76.js';
import {loadOrderStatus,paymentLabels,registrationLabels} from './domain-order-status-model.mjs';
import {readPurchaseAttempt} from './domain-purchase-model.mjs';
import {recoverMissingOrderAttempt} from './domain-direct-checkout-model.mjs';
const h=React.createElement;
const changed=()=>{throw Object.assign(Error('ATTEMPT_HELD'),{code:'ATTEMPT_HELD',heldReason:'ATTEMPT_CHANGED'});};
export default function DomainSavedOrderPanel({attempt,unreadable,owner,siteId}){
 const [revision,setRevision]=useState(0),[result,setResult]=useState(null),[busy,setBusy]=useState(false),[review,setReview]=useState(null),[notice,setNotice]=useState(''),[recovered,setRecovered]=useState(null);
 const operation=useRef(null);
 const id=attempt?.orderId,scope=JSON.stringify([owner,id,siteId]);
 const session=async()=>{const auth=await getVerifiedSession({force:true});if(auth?.verification!=='verified'||auth.user?.id!==owner||!auth.session?.access_token)throw Object.assign(Error(),{code:'INVALID_SESSION'});return auth.session;};
 useEffect(()=>{
  setReview(null);setNotice('');
  if(!id||!owner||unreadable){setBusy(false);setResult(null);return;}
  const controller=new AbortController();operation.current=controller;let live=true;const current=()=>live&&!controller.signal.aborted;
  setBusy(true);setResult(null);
  (async()=>{try{const auth=await session();if(!current())return;const order=await loadOrderStatus(id,auth.access_token,{signal:controller.signal});if(!current())return;await session();if(current())setResult({scope,order});}catch(error){if(current())setResult({scope,message:error?.status===404?'Endpoint status merespons HTTP 404. Status pesanan belum terverifikasi. Untuk catatan tahap order, gunakan pemeriksaan pemulihan terpisah di bawah; HTTP 404 saja tidak cukup.':'Status pesanan belum dapat diverifikasi. Catatan tetap disimpan; jangan membuat pembayaran ulang.'});}finally{if(operation.current===controller)operation.current=null;if(current())setBusy(false);}})();
  return()=>{live=false;controller.abort();operation.current?.abort();};
 },[scope,revision,unreadable,attempt?.phase]);
 const eligible=Boolean(attempt&&attempt.phase==='order'&&attempt.siteId===siteId&&recovered!==scope);
 function requestRecovery(){
  if(operation.current||busy||!eligible)return;
  try{const key='ngeblogging:domain-purchase:v1:'+owner.toLowerCase(),raw=localStorage.getItem(key),current=readPurchaseAttempt(owner,localStorage);if(!current||current.orderId!==id||current.key!==attempt.key||current.phase!=='order'||current.siteId!==siteId||current.quote.domain!==attempt.quote.domain||current.quote.quoteId!==attempt.quote.quoteId)changed();setNotice('');setReview({scope,raw});}catch{setReview(null);setNotice('Catatan berubah atau belum dapat dibaca. Muat ulang panel; tidak ada catatan yang dilepas.');}
 }
 async function confirmRecovery(){
  if(operation.current||busy||!eligible||review?.scope!==scope)return;
  const controller=new AbortController();operation.current=controller;setBusy(true);setNotice('');const approved=review;
  try{
   const auth=await session();if(controller.signal.aborted)return;
   const key='ngeblogging:domain-purchase:v1:'+owner.toLowerCase(),archiveKey=key+':missing-order-recovery:v1',uniqueArchive=archiveKey+':'+attempt.key;let removed=false,archived=null;
   const ensure=()=>{if(controller.signal.aborted)throw Object.assign(Error(),{code:'REQUEST_ABORTED'});if(localStorage.getItem(key)!==approved.raw)changed();};
   const guarded={
    getItem(name){if(name!==key)changed();const value=localStorage.getItem(name);if(value!==approved.raw&&!(removed&&value===null))changed();return value;},
    setItem(name,value){ensure();if(name!==archiveKey)changed();const prior=localStorage.getItem(uniqueArchive);if(prior!==null&&prior!==value)changed();localStorage.setItem(uniqueArchive,value);if(localStorage.getItem(uniqueArchive)!==value)throw Object.assign(Error(),{code:'ATTEMPT_UNREADABLE'});archived=value;},
    removeItem(name){ensure();if(name!==key||archived===null||localStorage.getItem(uniqueArchive)!==archived)changed();localStorage.removeItem(name);removed=true;}
   };
   ensure();
   const done=await recoverMissingOrderAttempt(attempt.quote.domain,auth.access_token,{owner,siteId,storage:guarded,locks:navigator.locks,signal:controller.signal});
   if(controller.signal.aborted)return;if(!done)changed();
   setRecovered(scope);setReview(null);setNotice('Catatan persiapan lokal berhasil diarsipkan dan dilepas setelah server memberikan DOMAIN_ORDER_NOT_FOUND produksi. Tidak ada transaksi yang dibatalkan atau checkout baru yang dibuat. Cari ulang untuk harga terbaru dan persetujuan baru.');
  }catch(error){if(!controller.signal.aborted){setReview(null);const code=typeof error?.code==='string'&&/^[A-Z_]{1,80}$/.test(error.code)?error.code:'RECOVERY_UNVERIFIED';const reason=typeof error?.heldReason==='string'&&/^[A-Z_]{1,80}$/.test(error.heldReason)?' / '+error.heldReason:'';setNotice('Pemulihan belum berhasil. Jangan menghapus catatan atau membuat pembayaran pengganti. Kode: '+code+reason+'.');}}
  finally{if(operation.current===controller){operation.current=null;if(!controller.signal.aborted)setBusy(false);}}
 }
 if(unreadable)return h('section',{className:'dosp-warning',role:'alert','aria-label':'Catatan pesanan bermasalah'},h('h3',null,'Catatan pesanan belum dapat dibaca'),h('p',null,'Checkout baru ditahan. Jangan menghapus penyimpanan browser untuk mengulang pembayaran.'));
 if(!attempt)return null;
 const visible=result?.scope===scope?result:null,order=visible?.order;
 return h('section',{className:'dosp-warning','aria-label':'Pesanan domain tersimpan','data-domain-saved-order':'persistent'},
  h('h3',null,'Pesanan domain yang perlu diselesaikan'),
  h('p',null,'ID pesanan: ',h('code',null,id)),
  h('p',null,'Domain pada catatan browser: ',attempt.quote.domain),
  h('p',null,'Situs pada catatan: ',h('code',null,attempt.siteId||'Belum tercatat')),
  h('p',null,'Tahap catatan browser: ',h('code',null,attempt.phase),'. Tahap lokal bukan bukti status transaksi server.'),
  attempt.siteId!==siteId?h('p',null,'Tujuan pada catatan berbeda atau belum cocok dengan situs aktif. Pemulihan tidak diizinkan dari situs ini.'):null,
  h('div',{role:'status','aria-live':'polite','aria-busy':busy},busy?h('p',null,'Memeriksa pesanan atau pemulihan catatan...'):null,order?h(React.Fragment,null,h('p',null,'Domain dari server: ',order.domain),h('p',null,'Pembayaran: ',paymentLabels[order.paymentState],'. Pendaftaran: ',registrationLabels[order.registrationState],'.'),h('p',null,order.message),order.domain!==attempt.quote.domain?h('p',null,'Domain server berbeda dari catatan lokal; diperlukan pemeriksaan sebelum melanjutkan.'):null):h('p',null,visible?.message||'Status server belum terverifikasi. Catatan browser bukan bukti tagihan atau pembayaran.')),
  h('button',{type:'button',className:'sv124-secondary',disabled:busy||Boolean(review)||recovered===scope,onClick:()=>{if(!operation.current)setRevision(value=>value+1);}},busy?'Memeriksa...':'Periksa status pesanan yang sama'),
  h('p',null,h('a',{href:'/domains/orders/'+id},'Lihat detail pesanan')),
  order&&order.domain===attempt.quote.domain&&attempt.siteId===siteId&&!busy&&!review?h(DomainOrderActions,{key:scope,order,owner,onRefresh:()=>setRevision(value=>value+1)}):null,
  eligible&&!order?h('button',{type:'button',className:'sv124-secondary',disabled:busy||Boolean(review),onClick:requestRecovery},'Periksa dan pulihkan catatan persiapan'):null,
  attempt.phase!=='order'?h('p',null,'Catatan mungkin sudah mencapai proses pembayaran. Pemulihan otomatis tidak diizinkan meskipun status merespons HTTP 404.'):null,
  review?.scope===scope&&eligible?h('section',{'aria-label':'Konfirmasi pemulihan catatan'},h('h4',null,'Periksa ulang dan arsipkan catatan persiapan?'),h('p',null,'Target: ',id,' untuk ',attempt.quote.domain,'. Server akan diperiksa ulang menggunakan akun pemilik di bawah pengunci browser. Catatan hanya dilepas jika tetap identik, tahapnya order, dan respons JSON produksi menyatakan DOMAIN_ORDER_NOT_FOUND. Arsip disimpan sebelum pelepasan. Ini bukan pembatalan transaksi dan tidak membuat pesanan baru.'),h('button',{type:'button',disabled:busy,onClick:()=>setReview(null)},'Kembali'),h('button',{type:'button',disabled:busy,onClick:()=>void confirmRecovery()},'Ya, periksa ulang dan pulihkan catatan')):null,
  notice?h('p',{role:'status','aria-live':'polite'},notice):null,
  h('p',null,'Panel ini mengikuti catatan browser akun ini, bukan daftar seluruh pesanan lintas perangkat. Aksi pesanan mengikuti status server. Pembatalan sebelum checkout saja; tagihan Midtrans yang sudah terbit memerlukan penanganan gateway.'));
}
