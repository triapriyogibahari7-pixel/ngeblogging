import React, { useEffect, useId, useRef, useState } from 'react';
import { checkoutTarget } from './midtrans-checkout-utils.mjs';
import { recoverSnapToken } from './midtrans-token-recovery.mjs';
import { embedFrameState } from './midtrans-embed-watchdog.mjs';
import './premium-checkout.css';
const scripts = new Map();
export function loadSnap(environment, clientKey) {
  if (!['production', 'sandbox'].includes(environment) || typeof clientKey !== 'string' || !clientKey.trim()) return Promise.reject(new Error('Konfigurasi checkout embedded belum lengkap.'));
  const src = environment === 'production' ? 'https://app.midtrans.com/snap/snap.js' : 'https://app.sandbox.midtrans.com/snap/snap.js';
  const existing = document.querySelector('script[data-ngeblogging-snap]');
  if (existing && (existing.src !== src || existing.dataset.clientKey !== clientKey)) return Promise.reject(new Error('Konfigurasi pembayaran berubah. Muat ulang halaman.'));
  if (scripts.has(src)) return scripts.get(src);
  const promise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src; script.async = true; script.dataset.clientKey = clientKey; script.dataset.ngebloggingSnap = 'true';
    const fail = () => { clearTimeout(timer); script.remove(); scripts.delete(src); reject(new Error('Checkout Midtrans gagal dimuat. Gunakan muat ulang pembayaran untuk order yang sama.')); };
    const timer = setTimeout(fail, 20000);
    script.onerror = fail;
    script.onload = () => { clearTimeout(timer); if (typeof window.snap?.embed !== 'function') { fail(); return; } resolve(window.snap); };
    document.head.appendChild(script);
  });
  scripts.set(src, promise); return promise;
}
export default function PremiumCheckout({ orderId, token, clientKey, environment, productName, amount, url, onRefresh, onBack }) {
  const baseId = 'nb-snap-' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const callbacks = useRef({ onRefresh }); callbacks.current = { onRefresh };
  const [message, setMessage] = useState('Menyiapkan pembayaran aman…');
  const [mode, setMode] = useState('loading');
  const [attempt, setAttempt] = useState(0);
  const id = `${baseId}-${attempt}`;
  let hostedUrl = null;
  try { hostedUrl = checkoutTarget(url, environment); } catch {}
  useEffect(() => {
    let live = true, instance, monitor, seen = false, missingSince = null, terminal = false;
    setMode('loading'); setMessage('Menyiapkan pembayaran aman…');
    let storage; try { storage = window.sessionStorage; } catch {}
    const resolved = recoverSnapToken({ token, orderId, environment, storage });
    const fail = text => { if (!live) return; clearInterval(monitor); setMode('error'); setMessage(text); };
    if (!resolved) {
      setMode('hosted');
      setMessage('Token embedded tidak tersedia untuk order ini. Periksa status order yang sama; jangan membuat tagihan baru.');
      return () => { live = false; };
    }
    const update = text => { if (!live) return; setMessage(text); Promise.resolve().then(() => callbacks.current.onRefresh?.()).catch(() => { if (live) setMessage('Status server belum dapat diperbarui. Periksa kembali sebelum membayar ulang.'); }); };
    loadSnap(environment, clientKey).then(snap => {
      if (!live) return; instance = snap;
      const startedAt = Date.now();
      snap.embed(resolved, { embedId: id, uiMode: 'qr',
        onSuccess: () => { terminal = true; clearInterval(monitor); if (live) setMode('completed'); update('Pembayaran diproses. Menunggu verifikasi server untuk aktivasi paket.'); },
        onPending: () => update('Menunggu pembayaran. Ikuti instruksi metode yang Anda pilih.'),
        onError: () => { terminal = true; fail('Checkout melaporkan kendala. Muat ulang pembayaran order ini atau periksa status sebelum membayar ulang.'); },
        onClose: () => { terminal = true; fail('Checkout ditutup. Muat ulang pembayaran untuk membuka order yang sama.'); }
      });
      if (!live || terminal) return;
      setMessage('Menunggu bingkai pembayaran Midtrans tampil…');
      const inspect = () => {
        if (!live || terminal) return;
        const frame = document.getElementById(id)?.querySelector('iframe');
        const rect = frame?.getBoundingClientRect();
        const style = frame ? window.getComputedStyle(frame) : null;
        const visible = Boolean(rect && rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0');
        const now = Date.now();
        if (visible) missingSince = null;
        else if (missingSince === null) missingSince = now;
        const state = embedFrameState({ visible, seen, elapsed: now - startedAt, missingFor: missingSince === null ? 0 : now - missingSince });
        if (state === 'visible' && !seen) {
          seen = true; setMode('embedded'); setMessage('Bingkai pembayaran ditampilkan. Jika isinya kosong, gunakan Muat ulang pembayaran untuk order yang sama.');
        } else if (state === 'timeout' || state === 'missing') {
          fail('Bingkai pembayaran tidak tampil atau menghilang. Klik Muat ulang pembayaran; order dan tagihan tetap sama.');
        }
      };
      monitor = setInterval(inspect, 500); inspect();
    }).catch(error => fail(error.message));
    return () => { live = false; clearInterval(monitor); if (instance) instance.hide?.(); };
  }, [token, orderId, clientKey, environment, id]);
  const price = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
  return <section className="pc-shell" aria-label="Checkout Ngeblogging">
    <aside className="pc-summary"><span className="pc-eyebrow">NGEBLOGGING · CHECKOUT</span><h2>Satu langkah menuju lebih banyak kemungkinan.</h2><p>Ringkasan pesanan</p><h3>{productName}</h3><strong className="pc-price">{price}</strong><p className="pc-order">ID pesanan: {orderId}</p><p>Harga dan aktivasi diverifikasi server. Jangan membayar ulang sebelum memeriksa status.</p>{environment === 'sandbox' && <p role="status">Mode uji sandbox — bukan pembayaran produksi.</p>}<button type="button" onClick={onBack}>Kembali ke pilihan paket</button></aside>
    <div className="pc-payment"><span className="pc-eyebrow">PEMBAYARAN AMAN OLEH MIDTRANS</span><h2>Pilih cara bayar Anda</h2><p>QRIS, bank/Virtual Account, dan metode lain hanya ditampilkan jika tersedia pada akun merchant.</p><p role="status" aria-live="polite" className="pc-status">{message}</p><button type="button" disabled={mode === 'loading'} onClick={() => { setMode('loading'); setAttempt(value => value + 1); }}>Muat ulang pembayaran</button><div key={id} id={id} className={mode === 'hosted' ? undefined : 'pc-snap'} />{(mode === 'hosted' || mode === 'error') && (hostedUrl ? <p><a href={hostedUrl} rel="noreferrer">Lanjutkan pembayaran order ini di Midtrans</a></p> : <p role="alert">Tautan pembayaran tidak dapat diverifikasi. Periksa status order; jangan membuat pembayaran pengganti.</p>)}<p>Konfirmasi pada layar pembayaran bukan bukti aktivasi. Status paket mengikuti hasil verifikasi server.</p></div>
  </section>;
}
