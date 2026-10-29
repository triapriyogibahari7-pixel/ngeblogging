export function checkoutTokenFromUrl(value, environment) {
  try {
    const u=new URL(value),origin=environment==='production'?'https://app.midtrans.com':environment==='sandbox'?'https://app.sandbox.midtrans.com':null;
    if(!origin||u.origin!==origin||u.username||u.password||u.hash||u.search)return null;
    return /^\/snap\/(?:v2\/vtweb|v4\/redirection)\/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i.exec(u.pathname)?.[1]||null;
  }catch{return null;}
}
export function savedOrderToken(storage,environment,orderId) {
  if(!['production','sandbox'].includes(environment)||!/^NARA-[a-f0-9]{40}$/.test(orderId||''))return null;
  try{const t=storage?.getItem(`ngeblogging:snap-token:${environment}:${orderId}`);return typeof t==='string'&&/^[a-zA-Z0-9_-]{10,200}$/.test(t)?t:null;}catch{return null;}
}
async function init() {
  const byId=id=>document.getElementById(id),status=text=>{byId('status').textContent=text;};
  const diagnostics={sdkLoaded:false,midtransMessages:0,csp:[],frame:null};
  const orderId=new URLSearchParams(location.hash.slice(1)).get('order')||'';
  byId('order').textContent=/^NARA-[a-f0-9]{40}$/.test(orderId)?'Order: '+orderId:'Order dapat dibuka menggunakan tautan pembayaran resmi yang sudah ada.';
  const render=()=>{byId('diagnostics').textContent=JSON.stringify(diagnostics,null,2);};render();
  byId('reload').addEventListener('click',()=>location.reload());
  document.addEventListener('securitypolicyviolation',e=>{let origin='';try{origin=new URL(e.blockedURI).origin;}catch{origin=['inline','eval','self'].includes(e.blockedURI)?e.blockedURI:'other';}diagnostics.csp.push({directive:e.violatedDirective,origin});render();});
  window.addEventListener('message',e=>{if(['https://app.midtrans.com','https://app.sandbox.midtrans.com'].includes(e.origin)){diagnostics.midtransMessages++;render();}});
  let cfg;
  try {
    const r=await fetch('/api/billing/midtrans/config',{cache:'no-store',credentials:'same-origin'});
    cfg=await r.json();
    if(!r.ok||!cfg.ready||!['production','sandbox'].includes(cfg.environment)||typeof cfg.clientKey!=='string'||!cfg.clientKey.trim())throw Error();
    status(cfg.environment==='sandbox'?'Mode sandbox. Klik Tampilkan pembayaran untuk menguji tampilan.':'Klik Tampilkan pembayaran untuk membuka order yang sama.');
  }catch{status('Konfigurasi Midtrans belum dapat diverifikasi. Tidak ada tagihan baru yang dibuat.');return;}
  const origin=cfg.environment==='production'?'https://app.midtrans.com':'https://app.sandbox.midtrans.com';
  let used=false;
  byId('open').disabled=false;
  byId('payment-form').addEventListener('submit',async e=>{
    e.preventDefault();if(used)return;
    let storage;try{storage=sessionStorage;}catch{}
    const input=byId('checkout-url').value.trim();
    const token=input?checkoutTokenFromUrl(input,cfg.environment):savedOrderToken(storage,cfg.environment,orderId);
    if(!token){status('Token order belum ditemukan. Tempel tautan resmi untuk order yang sama, bukan membuat order pengganti.');return;}
    used=true;byId('open').disabled=true;status('Memuat SDK pembayaran resmi Midtrans...');
    try {
      await new Promise((resolve,reject)=>{
        const s=document.createElement('script');s.src=origin+'/snap/snap.js';s.dataset.clientKey=cfg.clientKey.trim();
        const timer=setTimeout(()=>{s.remove();reject(Error('SDK_TIMEOUT'));},20000);
        s.onload=()=>{clearTimeout(timer);typeof window.snap?.embed==='function'?resolve():reject(Error('SDK_UNAVAILABLE'));};
        s.onerror=()=>{clearTimeout(timer);s.remove();reject(Error('SDK_LOAD_ERROR'));};document.head.appendChild(s);
      });
      diagnostics.sdkLoaded=true;render();
      let timer,terminal=false;
      const complete=text=>{terminal=true;clearInterval(timer);status(text);render();};
      window.snap.embed(token,{embedId:'payment-frame',onSuccess:()=>complete('Midtrans melaporkan pembayaran. Kembali ke Ngeblogging untuk verifikasi status server.'),onPending:()=>complete('Pembayaran masih pending. Periksa status order sebelum membayar ulang.'),onError:()=>complete('Midtrans melaporkan kendala pada order ini. Periksa status order yang sama.'),onClose:()=>complete('Checkout ditutup. Muat ulang halaman ini untuk order yang sama.')});
      if(terminal)return;
      status('Menunggu bingkai pembayaran tampil di halaman khusus...');
      const started=Date.now();let seen=false;
      timer=setInterval(()=>{
        const f=byId('payment-frame').querySelector('iframe');
        if(f){const r=f.getBoundingClientRect(),s=getComputedStyle(f);diagnostics.frame={width:r.width,height:r.height,display:s.display,visibility:s.visibility,opacity:s.opacity};
          if(!seen&&r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'&&s.opacity!=='0'){seen=true;status('Bingkai terdeteksi terlihat. Pastikan pilihan pembayaran di dalamnya benar-benar termuat.');}}
        render();
        if(Date.now()-started>25000){clearInterval(timer);if(!seen)status('Bingkai tetap belum terlihat pada halaman terisolasi. Buka Diagnostik tampilan untuk melihat hasil, tanpa membuat tagihan baru.');}
      },500);
    }catch{status('SDK atau checkout gagal dibuka. Tidak ada order baru yang dibuat. Muat ulang untuk mencoba order yang sama.');render();}
  });
}
if(typeof document!=='undefined')init();
