const cache = new WeakMap();
export function paymentScriptUrl(environment) {
  if(environment==='production')return 'https://app.midtrans.com/snap/snap.js';
  if(environment==='sandbox')return 'https://app.sandbox.midtrans.com/snap/snap.js';
  throw Error('Lingkungan pembayaran tidak valid.');
}
export function ensurePaymentPopupLayer(doc) {
  const id='ngeblogging-midtrans-popup-layer';
  if(doc.getElementById(id))return;
  const style=doc.createElement('style');style.id=id;
  style.textContent=`html body #snap-midtrans,
html body iframe[src^="https://app.midtrans.com/snap/"],
html body iframe[src^="https://app.sandbox.midtrans.com/snap/"] {
position:fixed!important;z-index:2147483647!important;isolation:isolate!important;pointer-events:auto!important;
}
html body #snap-midtrans {top:0!important;left:0!important;width:100%!important;height:100%!important;max-width:100%!important;max-height:100%!important;}`;
  doc.head.appendChild(style);
}
export function loadPaymentSdk(environment,clientKey,{doc=document,win=window,timeoutMs=30000}={}) {
  const src=paymentScriptUrl(environment),key=typeof clientKey==='string'?clientKey.trim():'';
  if(!key||key.startsWith('SB-')!==(environment==='sandbox'))return Promise.reject(Error('Client key pembayaran tidak sesuai lingkungan.'));
  ensurePaymentPopupLayer(doc);
  const previous=cache.get(doc);
  if(previous){if(previous.src!==src||previous.key!==key)return Promise.reject(Error('Konfigurasi pembayaran berubah. Muat ulang halaman.'));return previous.promise;}
  const existing=doc.querySelector('script[data-ngeblogging-snap], script[src="'+src+'"]');
  if(existing&&(existing.src!==src||existing.dataset.clientKey!==key))return Promise.reject(Error('SDK pembayaran lain sedang aktif. Muat ulang halaman.'));
  if(existing&&typeof win.snap?.pay==='function')return Promise.resolve(win.snap);
  const script=existing||doc.createElement('script');
  let resolve,reject,timer,poll,settled=false;
  const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});
  const entry={src,key,promise};cache.set(doc,entry);
  const clean=()=>{clearTimeout(timer);clearInterval(poll);script.removeEventListener('load',ready);script.removeEventListener('error',failed);};
  const failed=()=>{if(settled)return;settled=true;clean();script.remove();if(cache.get(doc)===entry)cache.delete(doc);reject(Error('SDK Midtrans belum berhasil dimuat. Periksa koneksi atau pemblokir konten, lalu coba lagi untuk order yang sama atau gunakan tautan pembayaran resmi.'));};
  const ready=()=>{if(settled||typeof win.snap?.pay!=='function')return;settled=true;clean();resolve(win.snap);};
  script.addEventListener('load',ready);script.addEventListener('error',failed);
  timer=setTimeout(failed,Math.max(1,Number(timeoutMs)||30000));poll=setInterval(ready,100);
  try{if(!existing){script.src=src;script.async=true;script.dataset.clientKey=key;script.dataset.ngebloggingSnap='popup';doc.head.appendChild(script);}ready();}catch{failed();}
  return promise;
}
export function openPaymentPopup(sdk,token,callbacks) {
  if(typeof token!=='string'||!/^[a-zA-Z0-9_-]{10,200}$/.test(token))throw Error('Token pembayaran order ini tidak tersedia.');
  if(typeof sdk?.pay!=='function')throw Error('SDK pembayaran belum siap.');
  sdk.hide?.();sdk.pay(token,callbacks);
}
export function paymentPopupVisible(doc,win,environment) {
  const origin=new URL(paymentScriptUrl(environment)).origin;
  return Array.from(doc.querySelectorAll('iframe')).some(frame=>{try{
    const source=new URL(frame.src);if(source.origin!==origin||!source.pathname.startsWith('/snap/'))return false;
    const rect=frame.getBoundingClientRect(),style=win.getComputedStyle(frame);
    if(!(rect.width>0&&rect.height>0)||style.display==='none'||style.visibility==='hidden'||style.opacity==='0'||typeof doc.elementFromPoint!=='function')return false;
    const left=Math.max(0,rect.left),top=Math.max(0,rect.top),right=Math.min(win.innerWidth,rect.right),bottom=Math.min(win.innerHeight,rect.bottom);
    return right>left&&bottom>top&&doc.elementFromPoint((left+right)/2,(top+bottom)/2)===frame;
  }catch{return false;}});
}
