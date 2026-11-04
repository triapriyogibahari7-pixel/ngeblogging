import React,{useEffect,useState} from 'react';
import {getVerifiedSession} from './lib/auth-session-v76.js';
import {loadOrderStatus,paymentLabels,registrationLabels} from './domain-order-status-model.mjs';
const h=React.createElement;
export default function DomainSavedOrderPanel({attempt,unreadable,owner,siteId}){
 const [revision,setRevision]=useState(0),[result,setResult]=useState(null),[busy,setBusy]=useState(false);
 const id=attempt?.orderId,scope=JSON.stringify([owner,id,siteId]);
 useEffect(()=>{
  if(!id||!owner||unreadable){setBusy(false);setResult(null);return;}
  const controller=new AbortController();let live=true;const current=()=>live&&!controller.signal.aborted;
  setBusy(true);setResult(null);
  const session=async()=>{const auth=await getVerifiedSession({force:true});if(auth?.verification!=='verified'||auth.user?.id!==owner||!auth.session?.access_token)throw Error('INVALID_SESSION');return auth.session;};
  (async()=>{try{const auth=await session();if(!current())return;const order=await loadOrderStatus(id,auth.access_token,{signal:controller.signal});if(!current())return;await session();if(current())setResult({scope,order});}catch(error){if(current())setResult({scope,message:error?.status===404?'Endpoint status merespons HTTP 404. Pesanan belum terverifikasi; ini bukan bukti tagihan dibatalkan atau catatan aman dihapus.':'Status pesanan belum dapat diverifikasi. Catatan tetap disimpan; jangan membuat pembayaran ulang.'});}finally{if(current())setBusy(false);}})();
  return()=>{live=false;controller.abort();};
 },[scope,revision,unreadable]);
 if(unreadable)return h('section',{className:'dosp-warning',role:'alert','aria-label':'Catatan pesanan bermasalah'},h('h3',null,'Catatan pesanan belum dapat dibaca'),h('p',null,'Checkout baru ditahan. Jangan menghapus penyimpanan browser untuk mengulang pembayaran.'));
 if(!attempt)return null;
 const visible=result?.scope===scope?result:null,order=visible?.order;
 return h('section',{className:'dosp-warning','aria-label':'Pesanan domain tersimpan','data-domain-saved-order':'persistent'},
  h('h3',null,'Pesanan domain yang perlu diselesaikan'),
  h('p',null,'ID pesanan: ',h('code',null,id)),
  h('p',null,'Domain pada catatan browser: ',attempt.quote.domain),
  h('p',null,'Situs pada catatan: ',h('code',null,attempt.siteId||'Belum tercatat')),
  attempt.siteId!==siteId?h('p',null,'Tujuan pada catatan berbeda atau belum cocok dengan situs aktif. Jangan membuat pesanan pengganti.'):null,
  h('div',{role:'status','aria-live':'polite','aria-busy':busy},busy?h('p',null,'Memeriksa status pesanan yang sama...'):null,order?h(React.Fragment,null,h('p',null,'Domain dari server: ',order.domain),h('p',null,'Pembayaran: ',paymentLabels[order.paymentState],'. Pendaftaran: ',registrationLabels[order.registrationState],'.'),h('p',null,order.message),order.domain!==attempt.quote.domain?h('p',null,'Domain server berbeda dari catatan lokal; diperlukan pemeriksaan sebelum melanjutkan.'):null):h('p',null,visible?.message||'Status server belum terverifikasi. Catatan browser bukan bukti tagihan atau pembayaran.')),
  h('button',{type:'button',className:'sv124-secondary',disabled:busy,onClick:()=>setRevision(value=>value+1)},busy?'Memeriksa status...':'Periksa status pesanan yang sama'),
  h('p',null,h('a',{href:'/domains/orders/'+id},'Lihat detail pesanan')),
  h('p',null,'Panel ini mengikuti catatan browser akun ini, bukan daftar seluruh pesanan lintas perangkat. Menutup formulir checkout tidak menghapus catatan atau membatalkan tagihan. Pembatalan transaksi server belum tersedia dari panel ini.'));
}
