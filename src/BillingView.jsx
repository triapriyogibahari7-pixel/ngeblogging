import React, { useEffect, useRef, useState } from 'react';
import { RefreshCw, Download, Check, Sparkles, Crown } from 'lucide-react';
import { supabase } from './lib/supabase';
import { checkoutTarget, attemptKey, finished } from './midtrans-checkout-utils.mjs';
import PremiumCheckout from './PremiumCheckout';
import './billing-view.css';
const money = value => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(value));
const date = value => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString('id-ID') : '—';
const CATALOG = [
  {id:'pro_monthly',name:'Nara AI Pro Bulanan',unit:'/bulan',months:1},
  {id:'pro_yearly',name:'Nara AI Pro Tahunan',unit:'/tahun',months:12},
  {id:'max_monthly',name:'Nara AI Max Bulanan',unit:'/bulan',months:1},
  {id:'max_yearly',name:'Nara AI Max Tahunan',unit:'/tahun',months:12,premium:true},
];
async function session() {
  const {data,error}=await supabase.auth.getSession();
  if(error||!data.session) throw Error('Silakan masuk untuk melanjutkan pembayaran.');
  return data.session;
}
async function api(path,token,body) {
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
  try {
    const response=await fetch(path,{method:body?'POST':'GET',cache:'no-store',signal:controller.signal,headers:{accept:'application/json',...(token?{authorization:`Bearer ${token}`} : {}),...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
    const data=await response.json().catch(()=>({}));
    if(!response.ok) throw Object.assign(Error(data.error||'Layanan pembayaran belum tersedia.'),{code:data.error,status:response.status});
    return data;
  } finally {clearTimeout(timer);}
}
export default function BillingView({setToast=()=>{}}) {
  const [config,setConfig]=useState(null),[orders,setOrders]=useState([]),[legacy,setLegacy]=useState([]),[profile,setProfile]=useState(null);
  const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const [selected,setSelected]=useState('pro_yearly'),[checkout,setCheckout]=useState(null);
  const locked=useRef(false),mounted=useRef(false),loadingLock=useRef(false);
  async function load() {
    if(loadingLock.current)return; loadingLock.current=true;
    try {
      const cfg=await api('/api/billing/midtrans/config');
      if(mounted.current)setConfig(cfg);
      const s=await session();
      const [current,old,account]=await Promise.allSettled([api('/api/billing/midtrans/orders',s.access_token),api('/api/billing/account',s.access_token),supabase.from('profiles').select('plan,plan_expires_at').eq('id',s.user.id).maybeSingle()]);
      if(!mounted.current)return;
      if(current.status==='fulfilled') {
        const list=current.value.orders||[];setOrders(list);
        for(const o of list) {
          const key=attemptKey(s.user.id,o.plan_id,cfg.environment);
          let saved;try{saved=JSON.parse(sessionStorage.getItem(key)||'null');}catch{}
          if(saved?.orderId===o.order_id&&finished(o.status)) {
            sessionStorage.removeItem(key);
            setCheckout(value=>value?.orderId===o.order_id?null:value);
            if(o.status==='completed')setNotice('Pembayaran terverifikasi server. Muat ulang aplikasi untuk memperbarui akses paket.');
          }
        }
      } else setError('Order Midtrans belum dapat dimuat. Periksa status sebelum membayar ulang.');
      if(old.status==='fulfilled')setLegacy(old.value.orders||[]);
      if(account.status==='fulfilled'&&!account.value.error)setProfile(account.value.data);
    }catch(e){if(mounted.current)setError(e.name==='AbortError'?'Pengecekan pembayaran melewati batas waktu.':e.message);}
    finally{loadingLock.current=false;if(mounted.current)setLoading(false);}
  }
  useEffect(()=>{
    mounted.current=true;load();
    const refresh=()=>{if(document.visibilityState==='visible')load();};
    window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);
    const timer=setInterval(refresh,15000);
    return()=>{mounted.current=false;clearInterval(timer);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};
  },[]);
  useEffect(()=>{
    const url=new URL(window.location.href);
    if(url.searchParams.get('billing')!=='return'||!url.searchParams.get('token'))return;
    (async()=>{try{const s=await session();await api('/api/billing/paypal/capture',s.access_token,{orderId:url.searchParams.get('token')});await load();}catch(e){setError(e.message);}finally{['billing','token','PayerID'].forEach(k=>url.searchParams.delete(k));window.history.replaceState({},'',url.pathname+url.search+url.hash);}})();
  },[]);
  async function pay(planId) {
    if(locked.current||!config?.ready)return;
    locked.current=true;setBusy(true);setError('');
    try {
      const s=await session(),key=attemptKey(s.user.id,planId,config.environment);
      const product=config.plans?.find(p=>p.id===planId);
      if(!product||!Number.isSafeInteger(product.amount)||product.amount<=0)throw Error('Harga paket belum terverifikasi.');
      let attempt;try{attempt=JSON.parse(sessionStorage.getItem(key)||'null');}catch{}
      if(!attempt?.idempotencyKey){attempt={idempotencyKey:crypto.randomUUID()};sessionStorage.setItem(key,JSON.stringify(attempt));}
      const result=await api('/api/billing/midtrans/create',s.access_token,{planId,idempotencyKey:attempt.idempotencyKey});
      const url=checkoutTarget(result.checkoutUrl,config.environment);
      sessionStorage.setItem(key,JSON.stringify({...attempt,orderId:result.orderId}));
      if(!mounted.current)return;
      setCheckout({orderId:result.orderId,token:result.snapToken,url,environment:config.environment,clientKey:config.clientKey,productName:CATALOG.find(p=>p.id===planId)?.name||product.label,amount:product.amount});
      await load();
    }catch(e){const message=e.name==='AbortError'?'Hasil pembuatan order belum diketahui. Periksa status sebelum membayar ulang.':`${e.message} Periksa status order sebelum mencoba lagi.`;if(mounted.current){setError(message);setToast(message);}}
    finally{locked.current=false;if(mounted.current)setBusy(false);}
  }
  async function invoice(order) {
    if(locked.current)return;locked.current=true;setBusy(true);
    try {
      const s=await session(),response=await fetch(`/api/billing/invoice/${encodeURIComponent(order.id)}`,{headers:{authorization:`Bearer ${s.access_token}`}});
      if(!response.ok)throw Error('Invoice lama belum dapat diunduh.');
      const blob=await response.blob(),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='invoice-ngeblogging.html';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
    }catch(e){setError(e.message);}finally{locked.current=false;setBusy(false);}
  }
  const expired=profile?.plan_expires_at&&Date.parse(profile.plan_expires_at)<=Date.now(),plan=expired?'free':profile?.plan;
  const serverPlans=new Map((config?.plans||[]).map(p=>[p.id,p]));
  return <div className="bv-page">
    <header className="bv-hero"><div className="bv-brand"><Sparkles aria-hidden="true"/> Nara AI</div><small>PAKET & PEMBAYARAN</small><h1>Ruang lebih luas untuk berkarya<em>tumbuh bersama Ngeblogging</em></h1><p>Pilih paket dan lanjutkan pembayaran aman melalui Midtrans. Harga final mengikuti katalog server.</p></header>
    {loading&&<p role="status" className="bv-note">Memuat konfigurasi pembayaran…</p>}
    {error&&<p role="alert" className="bv-note bv-error">{error}</p>}
    {notice&&<p role="status" className="bv-note">{notice} <button type="button" onClick={()=>window.location.reload()}>Muat ulang aplikasi</button></p>}
    {config?.environment==='sandbox'&&<p className="bv-note">Mode sandbox — bukan pembayaran produksi.</p>}
    <section className="bv-account"><div><small>PAKET AKUN</small><h2>{plan?plan.toUpperCase():'Belum terverifikasi'}</h2>{profile?.plan_expires_at&&<p>Masa paket tercatat sampai {date(profile.plan_expires_at)}</p>}</div><button type="button" disabled={busy} onClick={()=>{setError('');load();}}><RefreshCw/> Perbarui status</button></section>
    {checkout ? <><PremiumCheckout key={checkout.orderId} {...checkout} onRefresh={load} onBack={()=>setCheckout(null)}/>{(!checkout.token||!checkout.clientKey)&&<p className="bv-note">Order ini belum mendukung checkout tertanam. <a href={checkout.url} rel="noreferrer">Lanjutkan pembayaran di Midtrans</a>. Gunakan order yang sama; jangan membuat tagihan baru.</p>}</> : <section className="bv-plans" aria-label="Pilihan paket">{CATALOG.map(p=>{
      const server=serverPlans.get(p.id),available=Boolean(config?.ready&&server);
      return <article key={p.id} className={`bv-plan${p.premium?' is-premium':''}${selected===p.id?' is-selected':''}`} onClick={()=>setSelected(p.id)}>
        {p.premium&&<span className="bv-ribbon"><Crown aria-hidden="true"/>Max Tahunan</span>}<small>{p.months===12?'Akses tahunan':'Akses bulanan'}</small><h2>{p.name}</h2>
        <div className="bv-price"><b>{server?money(server.amount):'Menunggu katalog'}</b><span>{p.unit}</span></div>
        <p className="bv-per">{server&&p.months===12?`${money(Math.round(server.amount/12))}/bulan, ditagih tahunan`:'Ditagih sesuai periode paket'}</p>
        <ul><li><Check aria-hidden="true"/>Masa akses sesuai paket yang dipilih</li><li><Check aria-hidden="true"/>Pembayaran resmi melalui Midtrans</li><li><Check aria-hidden="true"/>Aktivasi setelah verifikasi server</li></ul>
        <button type="button" disabled={busy||!available} onClick={e=>{e.stopPropagation();setSelected(p.id);pay(p.id);}}>{busy?'Menyiapkan order…':available?'Lanjutkan pembayaran':'Belum tersedia'}</button>
      </article>;})}</section>}
    <section className="bv-methods"><h2>Metode pembayaran</h2><p>QRIS, bank/Virtual Account, e-wallet, dan kartu mengikuti kanal yang aktif pada akun merchant. Pilihan yang benar-benar tersedia ditampilkan oleh checkout resmi Midtrans, bukan logo metode yang belum aktif.</p></section>
    <section className="bv-history"><h2>Order Midtrans</h2>{orders.length===0?<p>Belum ada order yang ditampilkan.</p>:orders.map(o=><article key={o.order_id}><div><b>{o.order_id}</b><p>{o.plan_id} · {money(o.amount)}</p><p>Status server: {o.status}</p><p>Dibuat: {date(o.created_at)}</p>{o.expires_at&&<p>Masa paket sampai {date(o.expires_at)}</p>}{o.review_required&&<p>Transaksi memerlukan pemeriksaan.</p>}</div></article>)}</section>
    {legacy.length>0&&<section className="bv-history"><h2>Riwayat dan invoice sebelumnya</h2>{legacy.map(o=><article key={o.id}><div><b>{o.invoice_number||o.provider_order_id}</b><p>{o.provider} · {o.currency} {o.amount} · {o.status}</p></div><button type="button" disabled={busy} onClick={()=>invoice(o)}><Download/> Invoice</button></article>)}</section>}
    <p className="bv-foot">Paket diaktifkan berdasarkan verifikasi server. Pesan sukses pada browser bukan bukti aktivasi.</p>
  </div>;
}
