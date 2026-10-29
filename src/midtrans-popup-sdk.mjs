const cache = new WeakMap();
export function paymentScriptUrl(environment) {
  if (environment === 'production') return 'https://app.midtrans.com/snap/snap.js';
  if (environment === 'sandbox') return 'https://app.sandbox.midtrans.com/snap/snap.js';
  throw Error('Lingkungan pembayaran tidak valid.');
}
export function ensurePaymentPopupLayer(doc) {
  const id = 'ngeblogging-midtrans-popup-layer';
  if (doc.getElementById(id)) return;
  const style = doc.createElement('style');
  style.id = id;
  style.textContent = `html body iframe#snap-midtrans,
html body iframe[src^="https://app.midtrans.com/snap/"],
html body iframe[src^="https://app.sandbox.midtrans.com/snap/"] {
  position: fixed !important;
  z-index: 2147483647 !important;
  isolation: isolate !important;
  pointer-events: auto !important;
}`;
  doc.head.appendChild(style);
}
export function loadPaymentSdk(environment, clientKey, {doc = document, win = window, timeoutMs = 20000} = {}) {
  const src = paymentScriptUrl(environment);
  const key = typeof clientKey === 'string' ? clientKey.trim() : '';
  if (!key || key.startsWith('SB-') !== (environment === 'sandbox')) return Promise.reject(Error('Client key pembayaran tidak sesuai lingkungan.'));
  ensurePaymentPopupLayer(doc);
  const previous = cache.get(doc);
  if (previous) {
    if (previous.src !== src || previous.key !== key) return Promise.reject(Error('Konfigurasi pembayaran berubah. Muat ulang halaman.'));
    return previous.promise;
  }
  const existing = doc.querySelector('script[data-ngeblogging-snap], script[src="'+src+'"]');
  if (existing && (existing.src !== src || existing.dataset.clientKey !== key)) return Promise.reject(Error('SDK pembayaran lain sedang aktif. Muat ulang halaman.'));
  if (existing && typeof win.snap?.pay === 'function') return Promise.resolve(win.snap);
  const script = existing || doc.createElement('script');
  let resolvePromise, rejectPromise, timer;
  const promise = new Promise((resolve,reject) => { resolvePromise=resolve; rejectPromise=reject; });
  const clean = () => { clearTimeout(timer); script.removeEventListener('load', loaded); script.removeEventListener('error', failed); };
  const failed = () => { clean(); if (!existing) script.remove(); cache.delete(doc); rejectPromise(Error('SDK Midtrans belum berhasil dimuat. Coba lagi untuk order yang sama.')); };
  const loaded = () => { if (typeof win.snap?.pay !== 'function') return failed(); clean(); resolvePromise(win.snap); };
  cache.set(doc,{src,key,promise});
  script.addEventListener('load',loaded);script.addEventListener('error',failed);
  timer=setTimeout(failed,timeoutMs);
  if (!existing) { script.src=src;script.async=true;script.dataset.clientKey=key;script.dataset.ngebloggingSnap='popup';doc.head.appendChild(script); }
  return promise;
}
export function openPaymentPopup(sdk, token, callbacks) {
  if (typeof token !== 'string' || !/^[a-zA-Z0-9_-]{10,200}$/.test(token)) throw Error('Token pembayaran order ini tidak tersedia.');
  if (typeof sdk?.pay !== 'function') throw Error('SDK pembayaran belum siap.');
  sdk.hide?.();
  sdk.pay(token,callbacks);
}
export function paymentPopupVisible(doc, win, environment) {
  const origin = new URL(paymentScriptUrl(environment)).origin;
  return Array.from(doc.querySelectorAll('iframe')).some(frame => {
    try {
      const source = new URL(frame.src);
      if (source.origin !== origin || !source.pathname.startsWith('/snap/')) return false;
      const rect=frame.getBoundingClientRect(),style=win.getComputedStyle(frame);
      if (!(rect.width>0 && rect.height>0) || style.display==='none' || style.visibility==='hidden' || style.opacity==='0') return false;
      if (typeof doc.elementFromPoint !== 'function') return false;
      const left=Math.max(0,rect.left),top=Math.max(0,rect.top);
      const right=Math.min(win.innerWidth,rect.right),bottom=Math.min(win.innerHeight,rect.bottom);
      if (right<=left || bottom<=top) return false;
      return doc.elementFromPoint((left+right)/2,(top+bottom)/2)===frame;
    } catch { return false; }
  });
}
