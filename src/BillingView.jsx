import React, { useEffect, useMemo, useState } from "react";
import {
  Building2, Check, Clock3, CreditCard, Download, LoaderCircle,
  LockKeyhole, QrCode, ReceiptText, RefreshCw, ShieldCheck, WalletCards, XCircle,
} from "lucide-react";
import { supabase } from "./lib/supabase";
import "./billing-view.css";

async function accessToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || "";
}

async function request(path, body = null, options = {}) {
  const token = await accessToken();
  const response = await fetch(path, {
    method: body ? "POST" : "GET",
    headers: { ...(body ? { "content-type":"application/json" } : {}), ...(token ? { authorization:`Bearer ${token}` } : {}) },
    ...(body ? { body:JSON.stringify(body) } : {}),
  });
  if (options.blob) {
    if (!response.ok) throw new Error("Invoice belum dapat diunduh.");
    return response.blob();
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data.error || "Permintaan pembayaran belum berhasil."),{code:data.code,status:response.status});
  return data;
}

function money(currency,amount) {
  try { return new Intl.NumberFormat("id-ID",{style:"currency",currency}).format(Number(amount)); }
  catch { return `${currency} ${amount}`; }
}

function statusLabel(status) {
  const labels = { created:"Dibuat",approved:"Disetujui",pending:"Menunggu",processing_activation:"Mengaktifkan",activation_pending:"Aktivasi tertunda",completed:"Selesai",failed:"Gagal",expired:"Kedaluwarsa",cancelled:"Dibatalkan",refunded:"Dikembalikan" };
  return labels[String(status || "").toLowerCase()] || status || "Tidak diketahui";
}

function downloadBlob(blob,filename) {
  const url=URL.createObjectURL(blob),anchor=document.createElement("a");
  anchor.href=url;anchor.download=filename;document.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
}

export default function BillingView({ setToast }) {
  const [config,setConfig]=useState(null);
  const [account,setAccount]=useState({profile:{plan:"free"},orders:[]});
  const [busy,setBusy]=useState("");
  const [result,setResult]=useState(null);
  const [localResult,setLocalResult]=useState(null);
  const [loading,setLoading]=useState(true);

  const load=async()=>{
    setLoading(true);
    try {
      const configuration=await request("/api/billing/config");
      setConfig(configuration);
      try { setAccount(await request("/api/billing/account")); }
      catch(error) { console.warn("Billing account unavailable",error); setAccount((current)=>current?.profile?current:{profile:{plan:"free"},orders:[]}); }
    } catch(error) {
      setConfig({paypal:false,paypalWebhook:false,paypalEnvironment:"disabled",localGateway:false,plans:[]});
      setToast("Pembayaran belum dibuka. Paket gratis tetap aktif.");
    } finally { setLoading(false); }
  };

  useEffect(()=>{load();},[]);

  useEffect(()=>{
    const url=new URL(window.location.href),mode=url.searchParams.get("billing");
    if(mode==="cancel"){setToast("Pembayaran dibatalkan. Tidak ada paket yang diaktifkan.");url.searchParams.delete("billing");window.history.replaceState({},document.title,`${url.pathname}${url.search}${url.hash}`);return;}
    if(mode!=="return"||!url.searchParams.get("token"))return;
    const orderId=url.searchParams.get("token");setBusy("capture");
    request("/api/billing/paypal/capture",{orderId}).then(async(data)=>{setResult(data);setToast(data.completed?"Pembayaran selesai dan paket aktif":`Status pembayaran: ${data.status}`);await load();}).catch((error)=>setToast(error.message)).finally(()=>{["billing","token","PayerID"].forEach((key)=>url.searchParams.delete(key));window.history.replaceState({},document.title,`${url.pathname}${url.search}${url.hash}`);setBusy("");});
  },[]);

  const paypalReady=Boolean(config?.paypal&&config?.paypalWebhook&&String(config?.paypalEnvironment).toLowerCase()==="live");
  const localReady=Boolean(config?.localGateway);
  const checkoutReady=paypalReady||localReady;

  const startPayPal=async(planId)=>{
    if(!paypalReady)return;
    setBusy(`paypal:${planId}`);setLocalResult(null);
    try { const data=await request("/api/billing/paypal/create",{planId,idempotencyKey:crypto.randomUUID()});if(!data.approveUrl)throw new Error("Tautan persetujuan PayPal tidak ditemukan.");window.location.assign(data.approveUrl); }
    catch(error){setToast(error.message);setBusy("");}
  };

  const startLocal=async(method,planId)=>{
    if(!localReady)return;
    setBusy(`${method}:${planId}`);setLocalResult(null);
    try { const data=await request("/api/billing/local/create",{method,planId,idempotencyKey:crypto.randomUUID()});setLocalResult({...data,method,planId});if(data.checkoutUrl)window.location.assign(data.checkoutUrl);else setToast("Instruksi pembayaran berhasil dibuat."); }
    catch(error){setToast(error.message);}finally{setBusy("");}
  };

  const downloadInvoice=async(order)=>{
    setBusy(`invoice:${order.id}`);
    try { const blob=await request(`/api/billing/invoice/${encodeURIComponent(order.id)}`,null,{blob:true});downloadBlob(blob,`${order.invoice_number||"invoice-ngeblogging"}.html`); }
    catch(error){setToast(error.message);}finally{setBusy("");}
  };

  const currentPlan=account.profile?.plan||"free";
  const expiresAt=account.profile?.plan_expires_at;
  const orders=account.orders||[];
  const completedCount=useMemo(()=>orders.filter((order)=>order.status==="completed").length,[orders]);

  if(loading)return <div className="bv-page"><div className="bv-loading"><LoaderCircle className="spin"/>Memeriksa kesiapan pembayaran produksi…</div></div>;

  return <div className="bv-page"><header><div><small>PAKET AKUN</small><h1>Paket yang benar-benar aktif saja.</h1><p>Ngeblogging tidak menampilkan checkout, QR, rekening, atau tombol bayar sebelum merchant, webhook, nominal, dan aktivasi paket lolos konfigurasi produksi.</p></div><span><ShieldCheck/> {checkoutReady?"Checkout produksi siap":"Paket gratis aktif"}</span></header>
    <section className="bv-account"><div><small>PAKET AKTIF</small><h2>{currentPlan.toUpperCase()}</h2><p>{expiresAt?`Aktif sampai ${new Intl.DateTimeFormat("id-ID",{dateStyle:"long"}).format(new Date(expiresAt))}`:"Paket gratis tidak memiliki tanggal kedaluwarsa."}</p></div><div className="bv-account-stats"><article><b>{orders.length}</b><span>Transaksi</span></article><article><b>{completedCount}</b><span>Selesai</span></article><button onClick={load}><RefreshCw/> Perbarui</button></div></section>
    {busy==="capture"&&<div className="bv-processing"><LoaderCircle className="spin"/><div><b>Memverifikasi capture PayPal</b><p>Server memeriksa pemilik, currency, nominal, capture ID, webhook, dan status final.</p></div></div>}
    {result?.completed&&<div className="bv-success"><Check/><div><b>Pembayaran selesai</b><p>Paket aktif sampai {new Intl.DateTimeFormat("id-ID",{dateStyle:"long"}).format(new Date(result.expiresAt))}.</p></div></div>}
    {localResult&&!localResult.checkoutUrl&&<section className="bv-local-result"><header><div><small>INSTRUKSI PEMBAYARAN</small><h2>{localResult.invoiceNumber}</h2></div><i>{statusLabel(localResult.status)}</i></header>{localResult.qrImageUrl&&<img src={localResult.qrImageUrl} alt="QR pembayaran"/>}{localResult.qrString&&<label>Data QRIS<textarea readOnly value={localResult.qrString}/></label>}{localResult.virtualAccount&&<label>Nomor virtual account<div><code>{localResult.virtualAccount}</code><button onClick={()=>navigator.clipboard.writeText(localResult.virtualAccount)}>Salin</button></div></label>}{localResult.expiresAt&&<p><Clock3/> Berlaku sampai {new Intl.DateTimeFormat("id-ID",{dateStyle:"medium",timeStyle:"short"}).format(new Date(localResult.expiresAt))}</p>}</section>}

    <section className="bv-plans"><article><small>FREE</small><h2>Rp0</h2><p>Fondasi publikasi yang aktif untuk setiap akun.</p><ul><li>5 situs gratis per akun</li><li>Subdomain *.ngeblogging.com</li><li>Posts, Pages, media, tema, dan cadangan</li><li>SEO tenant di Cloudflare edge</li><li>Maksimum 12 situs setelah peningkatan paket</li></ul><button disabled><Check/> Paket aktif</button></article>{checkoutReady&&(config?.plans||[]).map((plan)=><article key={plan.id} className={plan.id.includes("yearly")?"featured":""}><small>{plan.id.replaceAll("_"," ").toUpperCase()}</small><h2>{money(plan.currency,plan.amount)}</h2><p>{plan.label} · {plan.durationDays} hari</p><ul><li>Model Nara premium</li><li>Generator gambar kualitas lebih tinggi</li><li>Prioritas pemrosesan</li><li>Riwayat dan proyek lebih panjang</li><li>Invoice dan histori transaksi</li></ul>{paypalReady&&<button className="bv-primary" disabled={Boolean(busy)} onClick={()=>startPayPal(plan.id)}>{busy===`paypal:${plan.id}`?<><LoaderCircle className="spin"/>Menyiapkan…</>:<><WalletCards/>PayPal Checkout</>}</button>}{localReady&&plan.local&&<div className="bv-local-buttons"><button disabled={Boolean(busy)} onClick={()=>startLocal("qris",plan.id)}><QrCode/> QRIS {money(plan.local.currency,plan.local.amount)}</button><button disabled={Boolean(busy)} onClick={()=>startLocal("bank_transfer",plan.id)}><Building2/> Bank/VA</button></div>}</article>)}</section>

    {!checkoutReady&&<section className="bv-methods"><header><div><h2>Pembayaran belum dibuka</h2><p>Tidak ada tombol checkout palsu atau metode setengah jadi. Fitur berbayar baru akan muncul setelah merchant live, webhook terverifikasi, penyimpanan transaksi, dan aktivasi paket siap.</p></div></header><div><article><span><LockKeyhole/></span><div><b>Tidak menerima dana</b><p>Saat ini pengguna tetap memakai paket gratis. Tidak ada permintaan pembayaran yang dibuat dari halaman ini.</p></div><i className="ready">Aman</i></article><article><span><ShieldCheck/></span><div><b>Peluncuran terkendali</b><p>PayPal, QRIS, bank, kartu, dan e-wallet hanya ditampilkan ketika jalur terkait benar-benar aktif.</p></div><i className="pending">Belum dibuka</i></article></div></section>}

    {checkoutReady&&<section className="bv-methods"><header><div><h2>Metode pembayaran aktif</h2><p>Hanya jalur produksi yang lolos pemeriksaan konfigurasi yang ditampilkan.</p></div></header><div>{paypalReady&&<article><span><WalletCards/></span><div><b>PayPal Orders v2</b><p>Merchant live dan webhook tersedia.</p></div><i className="ready">Aktif</i></article>}{localReady&&<article><span><QrCode/></span><div><b>Gateway Indonesia</b><p>QRIS, transfer bank, atau virtual account aktif melalui adapter terverifikasi.</p></div><i className="ready">Aktif</i></article>}<article><span><CreditCard/></span><div><b>Nominal dikunci server</b><p>Browser tidak menentukan harga final dan tidak menyimpan nomor kartu.</p></div><i className="ready">Terverifikasi</i></article></div></section>}

    {orders.length>0&&<section className="bv-history"><header><div><h2>Riwayat transaksi & invoice</h2><p>Data berasal dari catatan server.</p></div><span>{orders.length} transaksi</span></header><div className="bv-order-list">{orders.map((order)=><article key={order.id}><span className={`status ${order.status}`}>{["failed","cancelled","refunded"].includes(order.status)?<XCircle/>:order.status==="completed"?<Check/>:<Clock3/>}</span><div><b>{order.invoice_number||order.provider_order_id}</b><small>{order.plan.replaceAll("_"," ")} · {order.payment_method||order.provider} · {new Intl.DateTimeFormat("id-ID",{dateStyle:"medium",timeStyle:"short"}).format(new Date(order.created_at))}</small></div><strong>{money(order.currency,order.amount)}</strong><i className={order.status}>{statusLabel(order.status)}</i><button disabled={busy===`invoice:${order.id}`} onClick={()=>downloadInvoice(order)}>{busy===`invoice:${order.id}`?<LoaderCircle className="spin"/>:<Download/>} Invoice</button></article>)}</div></section>}

    <section className="bv-security"><article><LockKeyhole/><b>Secret hanya di server</b><p>Client secret, service role, webhook ID, dan HMAC gateway tidak masuk bundle browser.</p></article><article><ShieldCheck/><b>Nominal dikunci server</b><p>Capture dibandingkan dengan plan, amount, currency, pemilik order, dan invoice.</p></article><article><ReceiptText/><b>Aktivasi dapat diaudit</b><p>Order, capture, webhook, kegagalan, refund, masa aktif, dan invoice dicatat.</p></article></section>
  </div>;
}
