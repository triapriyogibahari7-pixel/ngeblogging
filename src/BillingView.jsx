import React, { useEffect, useRef, useState } from "react";
import { Building2, CreditCard, QrCode, WalletCards, RefreshCw, Download, X } from "lucide-react";
import { supabase } from "./lib/supabase";
import { checkoutTarget, attemptKey, finished } from "./midtrans-checkout-utils.mjs";
import "./billing-view.css";

const money = value => new Intl.NumberFormat("id-ID", {style:"currency",currency:"IDR"}).format(Number(value));
const date = value => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString("id-ID") : "—";
const methods = [[QrCode,"QRIS"],[Building2,"Bank / Virtual Account"],[WalletCards,"E-wallet"],[CreditCard,"Kartu kredit / debit"]];

async function session() {
  const {data,error} = await supabase.auth.getSession();
  if(error || !data.session) throw Error("Silakan masuk untuk melanjutkan pembayaran.");
  return data.session;
}
async function api(path, token, body) {
  const controller = new AbortController();
  const timer = setTimeout(()=>controller.abort(),20000);
  try {
    const response = await fetch(path,{method:body?"POST":"GET",cache:"no-store",signal:controller.signal,headers:{accept:"application/json",...(token?{authorization:`Bearer ${token}`} : {}),...(body?{"content-type":"application/json"}: {})},...(body?{body:JSON.stringify(body)}:{})});
    const data = await response.json().catch(()=>({}));
    if(!response.ok) throw Object.assign(Error(data.error || "Layanan pembayaran belum tersedia."),{code:data.error,status:response.status,orderId:data.orderId});
    return data;
  } finally {clearTimeout(timer);}
}

export default function BillingView({setToast=()=>{}, onClose}) {
  const [config,setConfig]=useState(null),[orders,setOrders]=useState([]),[legacy,setLegacy]=useState([]),[profile,setProfile]=useState(null);
  const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(""),[notice,setNotice]=useState("");
  const locked=useRef(false),mounted=useRef(false),loadingLock=useRef(false);
  async function load() {
    if(loadingLock.current)return;
    loadingLock.current=true;
    try {
      const cfg=await api("/api/billing/midtrans/config");
      if(mounted.current)setConfig(cfg);
      const s=await session();
      const [current,old,account]=await Promise.allSettled([
        api("/api/billing/midtrans/orders",s.access_token),
        api("/api/billing/account",s.access_token),
        supabase.from("profiles").select("plan,plan_expires_at").eq("id",s.user.id).maybeSingle(),
      ]);
      if(!mounted.current)return;
      if(current.status==="fulfilled") {
        const list=current.value.orders||[];setOrders(list);
        for(const o of list) {
          const key=attemptKey(s.user.id,o.plan_id,cfg.environment);
          let saved;try{saved=JSON.parse(sessionStorage.getItem(key)||"null");}catch{}
          if(saved?.orderId===o.order_id && finished(o.status)) {
            sessionStorage.removeItem(key);
            if(o.status==="completed")setNotice("Pembayaran terverifikasi. Muat ulang aplikasi untuk memuat akses Nara Pro terbaru.");
          }
        }
      } else setError("Order Midtrans belum dapat dimuat. Periksa konfigurasi dan database sebelum membayar.");
      if(old.status==="fulfilled")setLegacy(old.value.orders||[]);
      if(account.status==="fulfilled"&&!account.value.error)setProfile(account.value.data);
    } catch(e) {if(mounted.current)setError(e.name==="AbortError"?"Pengecekan pembayaran melewati batas waktu.":e.message);}
    finally {loadingLock.current=false;if(mounted.current)setLoading(false);}
  }
  useEffect(()=>{
    mounted.current=true;load();
    const refresh=()=>{if(document.visibilityState==="visible")load();};
    window.addEventListener("focus",refresh);document.addEventListener("visibilitychange",refresh);
    const timer=setInterval(refresh,30000);
    return ()=>{mounted.current=false;clearInterval(timer);window.removeEventListener("focus",refresh);document.removeEventListener("visibilitychange",refresh);};
  },[]);
  useEffect(()=>{
    const url=new URL(window.location.href);
    if(url.searchParams.get("billing")!=="return"||!url.searchParams.get("token"))return;
    (async()=>{try{const s=await session();await api("/api/billing/paypal/capture",s.access_token,{orderId:url.searchParams.get("token")});await load();}catch(e){setError(e.message);}finally{["billing","token","PayerID"].forEach(k=>url.searchParams.delete(k));window.history.replaceState({},"",url.pathname+url.search+url.hash);}})();
  },[]);
  function close() {
    if(typeof onClose==="function")return onClose();
    if(window.history.length>1)window.history.back();
    else window.location.assign("/");
  }
  useEffect(()=>{
    const onKey=e=>{if(e.key==="Escape")close();};
    window.addEventListener("keydown",onKey);
    return ()=>window.removeEventListener("keydown",onKey);
  },[onClose]);
  async function pay(planId) {
    if(locked.current||!config?.ready)return;
    locked.current=true;setBusy(true);setError("");
    try {
      const s=await session(),key=attemptKey(s.user.id,planId,config.environment);
      let attempt;try{attempt=JSON.parse(sessionStorage.getItem(key)||"null");}catch{}
      if(!attempt?.idempotencyKey){attempt={idempotencyKey:crypto.randomUUID()};sessionStorage.setItem(key,JSON.stringify(attempt));}
      const result=await api("/api/billing/midtrans/create",s.access_token,{planId,idempotencyKey:attempt.idempotencyKey});
      const url=checkoutTarget(result.checkoutUrl,config.environment);
      sessionStorage.setItem(key,JSON.stringify({...attempt,orderId:result.orderId}));
      window.location.assign(url);
    } catch(e) {
      const message=e.name==="AbortError"?"Hasil pembuatan order belum diketahui. Jangan membuat tagihan baru; periksa status order.":`${e.message} Periksa status order sebelum mencoba lagi.`;
      setError(message);setToast(message);
    } finally {locked.current=false;setBusy(false);}
  }
  async function invoice(order) {
    if(locked.current)return;locked.current=true;setBusy(true);
    try {
      const s=await session();const response=await fetch(`/api/billing/invoice/${encodeURIComponent(order.id)}`,{headers:{authorization:`Bearer ${s.access_token}`}});
      if(!response.ok)throw Error("Invoice lama belum dapat diunduh.");
      const blob=await response.blob(),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="invoice-ngeblogging.html";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
    }catch(e){setError(e.message);}finally{locked.current=false;setBusy(false);}
  }
  const expired=profile?.plan_expires_at&&Date.parse(profile.plan_expires_at)<=Date.now();
  const plan=expired?"free":profile?.plan;
  return <div className="bv-page">
    <button type="button" className="bv-close" aria-label="Tutup" title="Tutup" onClick={close}><X/></button>
    <header><div><small>N G E B L O G G I N G</small><h1>Pembayaran Nara Pro</h1><p>Pilih paket, lalu selesaikan pembayaran pada checkout resmi Midtrans.</p></div></header>
    {loading&&<p role="status">Memuat konfigurasi pembayaran…</p>}
    {error&&<p role="alert">{error}</p>}
    {notice&&<p role="status">{notice} <button type="button" onClick={()=>window.location.reload()}>Muat ulang aplikasi</button></p>}
    {config?.environment==="sandbox"&&<p role="status">Mode sandbox: tidak ada uang nyata yang diterima. Order uji tidak mengaktifkan Pro produksi.</p>}
    <section className="bv-account"><div><small>PAKET AKUN</small><h2>{plan?plan.toUpperCase():"Belum terverifikasi"}</h2>{profile?.plan_expires_at&&<p>Masa paket tercatat sampai {date(profile.plan_expires_at)}</p>}</div><button type="button" disabled={busy} onClick={()=>{setError("");load();}}><RefreshCw/> Perbarui status</button></section>
    <section className="bv-methods"><header><div><h2>Pilihan metode pembayaran</h2><p>Ketersediaan kanal dikonfirmasi di checkout Midtrans sesuai akun merchant. Kartu tidak dimasukkan pada situs Ngeblogging.</p></div></header><div>{methods.map(([Icon,label])=><article key={label}><span><Icon/></span><div><b>{label}</b><p>Pilih di checkout bila kanal tersedia.</p></div></article>)}</div></section>
    <section className="bv-plans">{(config?.plans||[]).map(p=><article key={p.id}><small>NARA PRO</small><h2>{money(p.amount)}</h2><p>{p.label} · {p.durationDays} hari</p><button type="button" disabled={busy||!config.ready} onClick={()=>pay(p.id)}>{busy?"Menyiapkan order…":"Lanjut ke pembayaran Midtrans"}</button></article>)}</section>
    {!loading&&!config?.ready&&<p role="status">Checkout belum dikonfigurasi lengkap. Tidak ada permintaan transfer manual. Harga dan kredensial harus disiapkan di server.</p>}
    <section className="bv-history"><h2>Order Midtrans</h2>{orders.length===0?<p>Belum ada order yang ditampilkan.</p>:orders.map(o=><article key={o.order_id}><div><b>{o.order_id}</b><p>{o.plan_id} · {money(o.amount)}</p><p>Status server: {o.status}</p><p>Dibuat: {date(o.created_at)}</p>{o.expires_at&&<p>Masa Pro sampai {date(o.expires_at)}</p>}{o.review_required&&<p>Transaksi memerlukan pemeriksaan.</p>}</div></article>)}</section>
    {legacy.length>0&&<section className="bv-history"><h2>Riwayat dan invoice sebelumnya</h2>{legacy.map(o=><article key={o.id}><div><b>{o.invoice_number||o.provider_order_id}</b><p>{o.provider} · {o.currency} {o.amount} · {o.status}</p></div><button type="button" disabled={busy} onClick={()=>invoice(o)}><Download/> Invoice</button></article>)}</section>}
    <p>Paket diaktifkan berdasarkan verifikasi server. Kembali dari halaman bayar bukan bukti pembayaran berhasil.</p>
  </div>;
}
