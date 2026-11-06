import React,{useEffect,useRef,useState} from 'react';
import {supabase} from './lib/supabase.js';
import {getVerifiedSession} from './lib/auth-session-v76.js';
import {loadOrderHistory} from './domain-order-history-client.mjs';
import DomainOrderSummaryCard from './DomainOrderSummaryCard.mjs';
import DomainOrderActions from './DomainOrderActions.mjs';
import DomainGatewaySync from './DomainGatewaySync.mjs';
const h=React.createElement;
const HIDEABLE=new Set(['pending','failed','expired','cancelled']);
const canHide=o=>HIDEABLE.has(o.paymentState)&&o.registrationState==='not_started'&&o.resolution==='none';
const ORDER=/^DOM-[a-f0-9]{40}$/;
const hiddenKey=owner=>'ngeblogging:domain-order-list-hidden:v1:'+String(owner||'').toLowerCase();
function readHidden(owner){try{const raw=localStorage.getItem(hiddenKey(owner));if(raw===null)return [];const value=JSON.parse(raw);return Array.isArray(value)?[...new Set(value.filter(id=>typeof id==='string'&&ORDER.test(id)))].slice(0,500):[];}catch{return [];}}
function writeHidden(owner,ids){const clean=[...new Set(ids.filter(id=>typeof id==='string'&&ORDER.test(id)))];if(clean.length>500)throw Error('LIST_PREFERENCE_LIMIT');localStorage.setItem(hiddenKey(owner),JSON.stringify(clean));if(localStorage.getItem(hiddenKey(owner))!==JSON.stringify(clean))throw Error('LIST_PREFERENCE_UNVERIFIED');return clean;}
export default function DomainOrderHistory({owner,refreshKey='',onCoverage}){
 const [state,setState]=useState({kind:'loading'}),[retry,setRetry]=useState(0),[hidden,setHidden]=useState(()=>readHidden(owner)),[showHidden,setShowHidden]=useState(false),[listNotice,setListNotice]=useState('');
 const active=useRef(null),coverage=useRef(onCoverage);coverage.current=onCoverage;
 useEffect(()=>{setHidden(readHidden(owner));setShowHidden(false);setListNotice('');},[owner]);
 useEffect(()=>{
  const {data}=supabase?.auth?.onAuthStateChange((_event,next)=>{
   if(next?.user?.id!==owner){active.current?.abort();coverage.current?.([]);setState({kind:'error',message:'Akun berubah atau sesi berakhir. Riwayat disembunyikan.'});}
  })||{};
  return()=>data?.subscription?.unsubscribe();
 },[owner]);
 useEffect(()=>{
  const c=new AbortController();active.current?.abort();active.current=c;setState({kind:'loading'});coverage.current?.([]);
  (async()=>{try{
   const auth=await getVerifiedSession({force:true});if(c.signal.aborted)return;
   if(auth?.verification!=='verified'||auth.user?.id!==owner||!auth.session?.access_token)throw Error('INVALID_SESSION');
   const result=await loadOrderHistory(owner,auth.session.access_token,{signal:c.signal});if(c.signal.aborted)return;
   const current=await getVerifiedSession({force:true});if(c.signal.aborted)return;
   if(current?.verification!=='verified'||current.user?.id!==owner)throw Error('SESSION_CHANGED');
   setState({kind:'ready',owner,...result});coverage.current?.(result.orders.map(o=>({orderId:o.orderId,domain:o.domain})));
  }catch{if(!c.signal.aborted){coverage.current?.([]);setState({kind:'error',message:'Riwayat belum dapat dimuat. Ini bukan berarti pesanan kosong; catatan checkout tetap disimpan.'});}}
  finally{if(active.current===c)active.current=null;}})();
  return()=>{c.abort();if(active.current===c)active.current=null;};
 },[owner,refreshKey,retry]);
 const ready=state.kind==='ready'&&state.owner===owner;
 const all=ready?state.orders:[],hiddenSet=new Set(hidden),hiddenOrders=all.filter(o=>hiddenSet.has(o.orderId)&&canHide(o)),visible=showHidden?all:all.filter(o=>!hiddenSet.has(o.orderId)||!canHide(o)),bulk=all.filter(o=>!hiddenSet.has(o.orderId)&&canHide(o));
 function save(next,message){if(!ready)return;try{setHidden(writeHidden(owner,next));setListNotice(message);}catch{setListNotice('Pilihan daftar tidak dapat disimpan pada browser ini. Tidak ada pesanan atau catatan checkout yang diubah. Kode: LIST_PREFERENCE_UNAVAILABLE.');}}
 function hideOrder(o){if(!canHide(o)){setListNotice('Pesanan ini perlu tetap terlihat karena statusnya memerlukan perhatian. Kode: ORDER_NOT_HIDEABLE.');return;}save([...hidden,o.orderId],'Pesanan disembunyikan dari daftar utama. Pesanan server, tagihan, dan catatan checkout tidak dihapus atau dibatalkan. Gunakan tombol tampilkan untuk melihatnya kembali.');}
 function unhideOrder(o){save(hidden.filter(id=>id!==o.orderId),'Pesanan ditampilkan kembali di daftar utama.');}
 function hideBulk(){if(!bulk.length){setListNotice('Tidak ada pesanan belum selesai yang dapat disembunyikan dari daftar utama.');return;}if(typeof window!=='undefined'&&!window.confirm('Sembunyikan '+bulk.length+' pesanan yang belum dibayar/gagal/kedaluwarsa/dibatalkan dari daftar utama? Pesanan dan tagihan server tidak dihapus atau dibatalkan, dan dapat ditampilkan kembali.'))return;save([...hidden,...bulk.map(o=>o.orderId)],bulk.length+' pesanan disembunyikan dari daftar utama. Tidak ada pesanan, tagihan, atau catatan checkout yang dihapus atau dibatalkan.');}
 return h('section',{'aria-label':'Riwayat pesanan domain','data-domain-order-history':'server','aria-busy':state.kind==='loading'},
  h('h3',null,'Pesanan saya'),
  h('button',{type:'button',className:'sv124-secondary',disabled:state.kind==='loading',onClick:()=>setRetry(n=>n+1)},state.kind==='loading'?'Memuat pesanan…':'Perbarui daftar pesanan'),
  ready&&bulk.length?h('button',{type:'button',className:'sv124-secondary',onClick:hideBulk},'Sembunyikan '+bulk.length+' pesanan belum selesai dari daftar utama'):null,
  ready&&hiddenOrders.length?h('button',{type:'button',className:'sv124-secondary','aria-pressed':showHidden,onClick:()=>setShowHidden(value=>!value)},showHidden?'Kembali ke daftar utama':'Tampilkan '+hiddenOrders.length+' pesanan tersembunyi'):null,
  h('p',{role:'status','aria-live':'polite'},listNotice),
  state.kind==='loading'?h('p',{role:'status'},'Mengambil riwayat pesanan akun ini dari server…'):state.kind==='error'?h('p',{role:'alert'},state.message):null,
  ready?(visible.length?h(DomainOrderSummaryCard,{orders:visible,onRefresh:()=>setRetry(n=>n+1),renderActions:o=>h('div',{'data-order-actions':'visible'},h('h4',null,'Aksi pesanan dan arsip lokal'),hiddenSet.has(o.orderId)?h('button',{type:'button',className:'sv124-secondary',onClick:()=>unhideOrder(o)},'Tampilkan kembali di daftar utama'):canHide(o)?h('button',{type:'button',className:'sv124-secondary',onClick:()=>hideOrder(o)},'Sembunyikan dari daftar utama'):null,h(DomainGatewaySync,{key:'sync:'+owner+':'+o.orderId,order:o,owner,onRefresh:()=>setRetry(n=>n+1)}),h(DomainOrderActions,{key:owner+':'+o.orderId,order:{...o,registrar:undefined},owner,onRefresh:()=>setRetry(n=>n+1)}))}):h('p',{role:'status'},all.length?'Semua pesanan sedang disembunyikan dari daftar utama. Tidak ada yang dihapus.':'Belum ada pesanan yang ditampilkan.')):null,
  ready&&state.hasMore?h('p',{role:'status'},'Masih ada pesanan lain yang belum dimuat. Riwayat lama tidak dihapus.'):null);
}
