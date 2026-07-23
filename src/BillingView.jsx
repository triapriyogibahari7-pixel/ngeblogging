import React, { useEffect, useState } from "react";
import { Building2, Check, CreditCard, LoaderCircle, LockKeyhole, QrCode, ShieldCheck, WalletCards } from "lucide-react";
import { supabase } from "./lib/supabase";
import "./billing-view.css";

async function token() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || "";
}

async function api(path, body = null) {
  const accessToken = await token();
  const response = await fetch(path, {
    method: body ? "POST" : "GET",
    headers: { ...(body ? { "content-type":"application/json" } : {}), ...(accessToken ? { authorization:`Bearer ${accessToken}` } : {}) },
    ...(body ? { body:JSON.stringify(body) } : {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data.error || "Permintaan pembayaran belum berhasil."), { code:data.code,status:response.status });
  return data;
}

export default function BillingView({ user, setToast }) {
  const [config,setConfig] = useState(null);
  const [busy,setBusy] = useState("");
  const [result,setResult] = useState(null);

  useEffect(() => {
    api("/api/billing/config").then(setConfig).catch((error) => setToast(error.message));
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("billing") !== "return" || !url.searchParams.get("token") || !url.searchParams.get("plan")) return;
    const orderId = url.searchParams.get("token");
    const planId = url.searchParams.get("plan");
    setBusy("capture");
    api("/api/billing/paypal/capture",{orderId,planId}).then((data) => {
      setResult(data);
      setToast(data.completed ? "Pembayaran selesai dan paket Pro aktif" : `Status pembayaran: ${data.status}`);
      ["billing","token","PayerID","plan"].forEach((key) => url.searchParams.delete(key));
      window.history.replaceState({},document.title,`${url.pathname}${url.search}${url.hash}`);
    }).catch((error) => setToast(error.message)).finally(() => setBusy(""));
  }, []);

  const startPayPal = async (planId) => {
    setBusy(planId);
    try {
      const data = await api("/api/billing/paypal/create",{planId});
      if (!data.approveUrl) throw new Error("Tautan persetujuan PayPal tidak ditemukan.");
      window.location.assign(data.approveUrl);
    } catch(error){ setToast(error.message); setBusy(""); }
  };

  const localCheckout = async (method) => {
    setBusy(method);
    try { await api("/api/billing/local/create",{method}); }
    catch(error){ setToast(error.message); }
    finally { setBusy(""); }
  };

  return <div className="bv-page"><header><div><small>PEMBAYARAN & PAKET</small><h1>Gratis untuk berkarya. Pro untuk layanan berbiaya tinggi.</h1><p>Posts dan Pages tidak dibatasi oleh paket di antarmuka. Fitur berbayar ditujukan untuk biaya nyata seperti model AI premium, gambar resolusi tinggi, dan infrastruktur tambahan.</p></div><span><ShieldCheck/> Server-verified checkout</span></header>
    {busy === "capture" && <div className="bv-processing"><LoaderCircle className="spin"/><div><b>Memverifikasi capture PayPal</b><p>Jangan menutup halaman sampai status transaksi diterima.</p></div></div>}
    {result?.completed && <div className="bv-success"><Check/><div><b>Pembayaran selesai</b><p>Paket Pro aktif sampai {new Intl.DateTimeFormat("id-ID",{dateStyle:"long"}).format(new Date(result.expiresAt))}.</p></div></div>}
    <section className="bv-plans"><article><small>FREE</small><h2>Rp0</h2><p>Fondasi publikasi untuk semua pengguna.</p><ul><li>Posts dan Pages</li><li>Subdomain *.ngeblogging.com</li><li>100 tema dan 25 widget</li><li>Media sesuai batas infrastruktur aktif</li><li>SEO tenant dan Nara Mini</li></ul><button disabled><Check/> Paket dasar</button></article>{(config?.plans || []).map((plan) => <article key={plan.id} className={plan.id.includes("yearly")?"featured":""}><small>{plan.id.replaceAll("_"," ").toUpperCase()}</small><h2>{plan.currency} {plan.amount}</h2><p>{plan.label}</p><ul><li>Model Nara premium</li><li>Generator gambar kualitas lebih tinggi</li><li>Prioritas pemrosesan</li><li>Riwayat dan proyek lebih panjang</li><li>Dukungan pengembangan platform</li></ul><button className="bv-primary" disabled={!config?.paypal || Boolean(busy)} onClick={() => startPayPal(plan.id)}>{busy===plan.id?<><LoaderCircle className="spin"/>Menyiapkan…</>:<><WalletCards/>Bayar dengan PayPal</>}</button></article>)}</section>
    <section className="bv-methods"><header><div><h2>Metode pembayaran</h2><p>Setiap metode memiliki gateway, webhook, dan rekonsiliasi sendiri.</p></div></header><div><article><span><WalletCards/></span><div><b>PayPal</b><p>{config?.paypal ? `Terhubung ke merchant ${config.paypalMerchantEmail || "yang dikonfigurasi pada Cloudflare"}.` : "Belum aktif: PAYPAL_CLIENT_ID dan PAYPAL_CLIENT_SECRET wajib disimpan sebagai Cloudflare secrets."}</p></div><i className={config?.paypal?"ready":"pending"}>{config?.paypal?"Siap":"Perlu konfigurasi"}</i></article><article><span><QrCode/></span><div><b>QRIS</b><p>Memerlukan gateway pembayaran Indonesia berizin. QRIS tidak diproses oleh akun PayPal.</p></div><button disabled={Boolean(busy)} onClick={() => localCheckout("qris")}>Siapkan QRIS</button></article><article><span><Building2/></span><div><b>Transfer bank & virtual account</b><p>Memerlukan gateway lokal dan webhook yang sama amannya dengan checkout PayPal.</p></div><button disabled={Boolean(busy)} onClick={() => localCheckout("bank_transfer")}>Siapkan bank</button></article><article><span><CreditCard/></span><div><b>Kartu & metode alternatif</b><p>Dapat ditambahkan melalui PayPal atau gateway lokal sesuai wilayah dan persetujuan merchant.</p></div><i className="pending">Opsional</i></article></div></section>
    <section className="bv-security"><article><LockKeyhole/><b>Secret hanya di server</b><p>Client ID publik dapat ditampilkan bila diperlukan, tetapi secret, service role, dan webhook credential tidak pernah masuk bundle browser.</p></article><article><ShieldCheck/><b>Capture diverifikasi</b><p>Paket tidak aktif hanya karena pengguna kembali dari halaman pembayaran. Server wajib melakukan capture dan memeriksa status selesai.</p></article><article><WalletCards/><b>Rekonsiliasi transaksi</b><p>Order ID, status, nilai, currency, payer, dan payload minimum dicatat untuk audit pemilik akun.</p></article></section>
    <footer>Tujuan merchant yang diminta: <b>{config?.paypalMerchantEmail || "triapriyogibahari9@gmail.com"}</b>. Akun tujuan sebenarnya tetap mengikuti PayPal client credentials aktif.</footer>
  </div>;
}
