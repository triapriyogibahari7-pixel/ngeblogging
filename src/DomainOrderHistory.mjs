import React,{useEffect,useRef,useState} from 'react';
import {supabase} from './lib/supabase.js';
import {getVerifiedSession} from './lib/auth-session-v76.js';
import {loadOrderHistory} from './domain-order-history-client.mjs';
import DomainOrderSummaryCard from './DomainOrderSummaryCard.mjs';
import DomainOrderActions from './DomainOrderActions.mjs';
const h=React.createElement;
export default function DomainOrderHistory({owner,refreshKey='',onCoverage}){
 const [state,setState]=useState({kind:'loading'}),[retry,setRetry]=useState(0);
 const active=useRef(null),coverage=useRef(onCoverage);coverage.current=onCoverage;
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
 return h('section',{'aria-label':'Riwayat pesanan domain','data-domain-order-history':'server','aria-busy':state.kind==='loading'},
  h('h3',null,'Pesanan saya'),
  h('button',{type:'button',className:'sv124-secondary',disabled:state.kind==='loading',onClick:()=>setRetry(n=>n+1)},state.kind==='loading'?'Memuat pesanan…':'Perbarui daftar pesanan'),
  state.kind==='loading'?h('p',{role:'status'},'Mengambil riwayat pesanan akun ini dari server…'):state.kind==='error'?h('p',{role:'alert'},state.message):null,
  ready?h(DomainOrderSummaryCard,{orders:state.orders,onRefresh:()=>setRetry(n=>n+1),renderActions:o=>h('div',{'data-order-actions':'visible'},h('h4',null,'Aksi pesanan dan arsip lokal'),h(DomainOrderActions,{key:owner+':'+o.orderId,order:{...o,registrar:undefined},owner,onRefresh:()=>setRetry(n=>n+1)}))}):null,
  ready&&state.hasMore?h('p',{role:'status'},'Masih ada pesanan lain yang belum dimuat. Riwayat lama tidak dihapus.'):null);
}
