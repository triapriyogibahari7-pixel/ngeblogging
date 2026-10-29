import React, { useEffect, useRef, useState } from 'react';
import { hostedCheckoutUrl } from './midtrans-hosted-checkout.mjs';
import './premium-checkout.css';
export default function PremiumCheckout({ orderId, environment, productName, amount, url, onRefresh, onBack }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('Pembayaran dibuka di halaman resmi Midtrans, tanpa bingkai tertanam.');
  const live = useRef(false);
  const refreshLock = useRef(false);
  useEffect(() => { live.current = true; return () => { live.current = false; }; }, []);
  const target = hostedCheckoutUrl(url, environment);
  const validOrder = /^NARA-[a-f0-9]{40}$/.test(orderId || '');
  const validAmount = Number.isSafeInteger(amount) && amount > 0;
  const ready = Boolean(target && validOrder && validAmount);
  const price = validAmount ? new Intl.NumberFormat('id-ID', { style:'currency', currency:'IDR', maximumFractionDigits:0 }).format(amount) : 'Harga belum terverifikasi';
  async function refresh() {
    if (refreshLock.current) return;
    refreshLock.current = true;
    setBusy(true);
    setMessage('Memeriksa catatan pembayaran pada server Ngeblogging...');
    try {
      await onRefresh?.();
      if (live.current) setMessage('Pemeriksaan selesai. Lihat status server pada riwayat order. Jangan membayar ulang jika hasilnya belum jelas.');
    } catch {
      if (live.current) setMessage('Status belum dapat diperiksa. Jangan membuat tagihan atau pembayaran pengganti.');
    } finally {
      refreshLock.current = false;
      if (live.current) setBusy(false);
    }
  }
  return <section className="pc-shell" aria-label="Checkout Ngeblogging">
    <aside className="pc-summary">
      <span className="pc-eyebrow">NGEBLOGGING · CHECKOUT</span>
      <h2>Ringkasan pembayaran</h2><h3>{productName}</h3>
      <strong className="pc-price">{price}</strong><p className="pc-order">ID pesanan: {orderId}</p>
      <p>Harga dan aktivasi paket diverifikasi server.</p>
      {environment === 'sandbox' && <p role="status">Mode sandbox — bukan pembayaran produksi.</p>}
      <button type="button" onClick={onBack}>Kembali ke pilihan paket</button>
    </aside>
    <div className="pc-payment">
      <span className="pc-eyebrow">PEMBAYARAN DIPROSES MIDTRANS</span>
      <h2>Lanjutkan pembayaran order ini</h2>
      <p>Pilihan bank/Virtual Account, GoPay, dan QRIS mengikuti metode yang ditawarkan Midtrans untuk transaksi ini. Ketersediaan GoPay Later belum diverifikasi.</p>
      <p role="status" aria-live="polite" className="pc-status">{message}</p>
      {ready ? <p><a href={target} rel="noreferrer">Buka pembayaran resmi Midtrans</a></p> : <p role="alert">Data atau tautan pembayaran tidak valid. Jangan membayar sebelum status order diperiksa.</p>}
      <ol><li>Buka pembayaran resmi dengan tombol di atas.</li><li>Pilih salah satu metode yang tersedia di Midtrans dan ikuti instruksinya.</li><li>Setelah membayar, kembali ke Ngeblogging dan periksa status order.</li></ol>
      <button type="button" disabled={busy} onClick={refresh}>{busy ? 'Memeriksa...' : 'Periksa status order yang sama'}</button>
      <p>Tombol ini tidak membuat order baru. Klik tombol atau bukti tangkapan layar tidak mengaktifkan paket; aktivasi menunggu verifikasi pembayaran pada server.</p>
    </div>
  </section>;
}
