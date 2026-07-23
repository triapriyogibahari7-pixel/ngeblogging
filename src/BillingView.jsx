import React, { useEffect, useMemo, useState } from "react";
import {
  Building2, Check, Clock3, CreditCard, Download, ExternalLink, LoaderCircle,
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

export default function BillingView({ user, setToast }) {
  const [config,setConfig]=useState(null);
  const [account,setAccount]=useState({profile:{},orders:[]});
  const [busy,setBusy]=useState("");
  const [result,setResult]=useState(null);
  const [localResult,setLocalResult]=useState(null);
  const [loading,setLoading]=useState(true);

  const load=async()=>{
    setLoading(true);
    try { const [configuration,accountData]=await Promise.all([request("/api/billing/config"),request("/api/billing/account")]);setConfig(configuration);setAccount(accountData); }
    catch(error){setToast(error.message);}finally{setLoading(false);}
  };

  useEffect(()=>{load();},[]);

  useEffect(()=>{
    const url=new URL(window.location.href),mode=url.searchParams.get("billing");
    if(mode==="cancel"){setToast("Pembayaran dibatalkan. Tidak ada paket yang diaktifkan.");url.searchParams.delete("billing");window.history.replaceState({},document.title,`${url.pathname}${url.search}${url.hash}`);return;}
    if(mode!=="return"||!url.searchParams.get("token"))return;
    const orderId=url.searchParams.get("token");setBusy("capture");
    request("/api/billing/paypal/capture",{orderId}).then(async(data)=>{setResult(data);setToast(data.completed?"Pembayaran selesai dan paket aktif":`Status pembayaran: ${data.status}`);await load();}).catch((error)=>setToast(error.message)).finally(()=>{["billing","token","PayerID"].forEach((key)=>url.searchParams.delete(key));window.history.replaceState({},document.title,`${url.pathname}${url.search}${url.hash}`);setBusy("");});
  },[]);

  const startPayPal=async(planId)=>{
    setBusy(`paypal:${planId}`);setLocalResult(null);
    try { const data=await request("/api/billing/paypal/create",{planId,idempotencyKey:crypto.randomUUID()});if(!data.approveUrl)throw new Error("Tautan persetujuan PayPal tidak ditemukan.");window.location.assign(data.approveUrl); }
    catch(error){setToast(error.message);setBusy("");}
  };

  const startLocal=async(method,planId)=>{
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

  return <div className="bv-page"><header><div><small>PEMBAYARAN & PAKET</small><h1>Checkout modern, terverifikasi server, dan dapat diaudit.</h1><p>Posts dan Pages tetap bebas dibuat. Paket berbayar membiayai model AI premium, generasi gambar, prioritas pemrosesan, dan infrastruktur tambahan.</p></div><span><ShieldCheck/> Server verified</span></header>
    <section className="bv-account"><div><small>PAKET AKTIF</small><h2>{currentPlan.toUpperCase()}</h2><p>{expiresAt?`Aktif sampai ${new Intl.DateTimeFormat("id-ID",{dateStyle:"long"}).format(new Date(expiresAt))}`:"Paket gratis tidak memiliki tanggal kedaluwarsa."}</p></div><div className="bv-account-stats"><article><b>{orders.length}</b><span>Transaksi</span></article><article><b>{completedCount}</b><span>Selesai</span></article><button disabled={loading} onClick={load}>{loading?<LoaderCircle className="spin"/>:<RefreshCw/>} Perbarui</button></div></section>
    {busy==="capture"&&<div className="bv-processing"><LoaderCircle className="spin"/><div><b>Memverifikasi capture PayPal</b><p>Server memeriksa order, pemilik, currency, nominal, capture ID, dan status final.</p></div></div>}
    {result?.completed&&<div className="bv-success"><Check/><div><b>Pembayaran selesai</b><p>Paket aktif sampai {new Intl.DateTimeFormat("id-ID",{dateStyle:"long"}).format(new Date(result.expiresAt))}. Invoice tersedia pada riwayat transaksi.</p></div></div>}
    {localResult&&!localResult.checkoutUrl&&<section className="bv-local-result"><header><div><small>INSTRUKSI PEMBAYARAN</small><h2>{localResult.invoiceNumber}</h2></div><i>{statusLabel(localResult.status)}</i></header>{localResult.qrImageUrl&&<img src={localResult.qrImageUrl} alt="QR pembayaran"/>}{localResult.qrString&&<label>Data QRIS<textarea readOnly value={localResult.qrString}/></label>}{localResult.virtualAccount&&<label>Nomor virtual account<div><code>{localResult.virtualAccount}</code><button onClick={()=>navigator.clipboard.writeText(localResult.virtualAccount)}>Salin</button></div></label>}{localResult.expiresAt&&<p><Clock3/> Berlaku sampai {new Intl.DateTimeFormat("id-ID",{dateStyle:"medium",timeStyle:"short"}).format(new Date(localResult.expiresAt))}</p>}</section>}
    <section className="bv-plans"><article><small>FREE</small><h2>Rp0</h2><p>Fondasi publikasi untuk semua pengguna.</p><ul><li>Posts dan Pages</li><li>Subdomain *.ngeblogging.com</li><li>100 tema dan 25 widget</li><li>Cadangan serta pemulihan konten</li><li>SEO tenant dan Nara Mini</li></ul><button disabled><Check/> Paket dasar</button></article>{(config?.plans||[]).map((plan)=><article key={plan.id} className={plan.id.includes("yearly")?"featured":""}><small>{plan.id.replaceAll("_"," ").toUpperCase()}</small><h2>{money(plan.currency,plan.amount)}</h2><p>{plan.label} · {plan.durationDays} hari</p><ul><li>Model Nara premium</li><li>Generator gambar kualitas lebih tinggi</li><li>Prioritas pemrosesan</li><li>Riwayat dan proyek lebih panjang</li><li>Invoice dan histori transaksi</li></ul><button className="bv-primary" disabled={!config?.paypal||Boolean(busy)} onClick={()=>startPayPal(plan.id)}>{busy===`paypal:${plan.id}`?<><LoaderCircle className="spin"/>Menyiapkan…</>:<><WalletCards/>PayPal Checkout</>}</button>{plan.local&&<div className="bv-local-buttons"><button disabled={!config?.localGateway||Boolean(busy)} onClick={()=>startLocal("qris",plan.id)}><QrCode/> QRIS {money(plan.local.currency,plan.local.amount)}</button><button disabled={!config?.localGateway||Boolean(busy)} onClick={()=>startLocal("bank_transfer",plan.id)}><Building2/> Bank/VA</button></div>}</article>)}</section>
    <section className="bv-methods"><header><div><h2>Metode pembayaran</h2><p>Setiap jalur memakai idempotency key, signature, webhook deduplication, rekonsiliasi nominal, dan aktivasi paket yang dapat dipulihkan.</p></div></header><div><article><span><WalletCards/></span><div><b>PayPal Orders v2</b><p>{config?.paypal?`Merchant ${config.paypalMerchantEmail||"terkonfigurasi"} · ${config.paypalEnvironment}`:"PAYPAL_CLIENT_ID dan PAYPAL_CLIENT_SECRET belum dipasang."}</p></div><i className={config?.paypal&&config?.paypalWebhook?"ready":"pending"}>{config?.paypal&&config?.paypalWebhook?"Checkout + webhook siap":"Perlu secret/webhook"}</i></article><article><span><QrCode/></span><div><b>QRIS</b><p>Aktif melalui adapter gateway Indonesia ketika URL, HMAC secret, dan harga IDR telah dikonfigurasi.</p></div><i className={config?.localGateway?"ready":"pending"}>{config?.localGateway?"Adapter siap":"Belum dikonfigurasi"}</i></article><article><span><Building2/></span><div><b>Transfer bank & virtual account</b><p>Instruksi, kedaluwarsa, callback, dan status akhir berasal dari gateway lokal terverifikasi.</p></div><i className={config?.localGateway?"ready":"pending"}>{config?.localGateway?"Adapter siap":"Belum dikonfigurasi"}</i></article><article><span><CreditCard/></span><div><b>Kartu & e-wallet</b><p>Dapat diproses PayPal atau adapter lokal tanpa menyimpan nomor kartu pada server Ngeblogging.</p></div><i className="pending">Bergantung merchant</i></article></div></section>
    <section className="bv-history"><header><div><h2>Riwayat transaksi & invoice</h2><p>Data berasal dari catatan server, bukan state browser.</p></div><span>{orders.length} transaksi</span></header>{loading?<div className="bv-loading"><LoaderCircle className="spin"/>Memuat transaksi…</div>:orders.length?<div className="bv-order-list">{orders.map((order)=><article key={order.id}><span className={`status ${order.status}`}>{["failed","cancelled","refunded"].includes(order.status)?<XCircle/>:order.status==="completed"?<Check/>:<Clock3/>}</span><div><b>{order.invoice_number||order.provider_order_id}</b><small>{order.plan.replaceAll("_"," ")} · {order.payment_method||order.provider} · {new Intl.DateTimeFormat("id-ID",{dateStyle:"medium",timeStyle:"short"}).format(new Date(order.created_at))}</small></div><strong>{money(order.currency,order.amount)}</strong><i className={order.status}>{statusLabel(order.status)}</i><button disabled={busy===`invoice:${order.id}`} onClick={()=>downloadInvoice(order)}>{busy===`invoice:${order.id}`?<LoaderCircle className="spin"/>:<Download/>} Invoice</button></article>)}</div>:<div className="bv-empty"><ReceiptText/><h3>Belum ada transaksi</h3><p>Invoice akan muncul setelah checkout dibuat.</p></div>}</section>
    <section className="bv-security"><article><LockKeyhole/><b>Secret hanya di server</b><p>Client secret, service role, webhook ID, dan HMAC gateway tidak pernah masuk bundle browser.</p></article><article><ShieldCheck/><b>Nominal dikunci server</b><p>Capture dibandingkan dengan plan, amount, currency, pemilik order, dan invoice yang tersimpan.</p></article><article><ReceiptText/><b>Audit dan invoice</b><p>Order, capture, event webhook, kegagalan, refund, masa aktif, dan invoice dicatat untuk rekonsiliasi.</p></article></section>
    <footer>Tujuan merchant yang diminta: <b>{config?.paypalMerchantEmail||"triapriyogibahari9@gmail.com"}</b>. Penerima dana sebenarnya mengikuti kredensial merchant PayPal atau gateway lokal yang aktif.</footer>
  </div>;
}
