import {getVerifiedSession} from './lib/auth-session-v76.js';
const BASE='/api/commerce/domains/manage/import/';
const node=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=String(text);return e;};
const rupiah=n=>'Rp'+Number(n).toLocaleString('id-ID');
const MESSAGES={
 DOMAIN_IMPORT_DISABLED:'Fitur impor domain belum dibuka.',DOMAIN_IMPORT_TRANSFER_DISABLED:'Fitur transfer domain belum dibuka. Gunakan Jalur A.',
 IMPORT_DOMAIN_INVALID:'Nama domain tidak valid. Gunakan domain utama, misalnya contoh.com, tanpa www.',
 IMPORT_ZONE_ALREADY_EXISTS:'Domain ini sudah ada di Cloudflare kami dan tidak dapat diimpor otomatis. Hubungi dukungan.',
 IMPORT_DOMAIN_ALREADY_CLAIMED:'Domain ini sudah dipakai pesanan impor lain.',
 IMPORT_TOO_MANY_OPEN_ORDERS:'Terlalu banyak pesanan yang belum dibayar. Batalkan atau selesaikan salah satunya.',
 IMPORT_TRANSFER_TLD_NOT_AVAILABLE:'Transfer hanya tersedia untuk .com, .net, dan .org. Domain .id belum dapat ditransfer; gunakan Jalur A.',
 IMPORT_TRANSFER_PRICE_NOT_SET:'Harga transfer untuk ekstensi ini belum ditetapkan.',IMPORT_PRICE_NOT_SET:'Harga pesanan ini belum ditetapkan. Tidak ada pembayaran dibuat.',
 IMPORT_PAYMENT_REQUIRED:'Selesaikan pembayaran lebih dulu.',IMPORT_ORDER_UNDER_REVIEW:'Pesanan sedang ditinjau. Jangan bayar atau kirim ulang.',
 IMPORT_ORDER_ALREADY_PAID:'Pesanan ini sudah dibayar.',IMPORT_ORDER_NOT_PAYABLE:'Pesanan ini tidak dapat dibayar lagi.',
 IMPORT_ZONE_NOT_ACTIVE:'Zona Cloudflare belum aktif. Pasang nameserver di registrar lama, tunggu, lalu periksa lagi.',
 IMPORT_TRANSFER_ALREADY_SUBMITTED:'Transfer untuk pesanan ini sudah dikirim. Gunakan Periksa status transfer.',
 IMPORT_TRANSFER_REJECTED:'Cloudflare menolak transfer. Pesanan ditandai untuk ditinjau; jangan kirim ulang.',
 IMPORT_TRANSFER_SUBMIT_UNCLEAR:'Hasil pengiriman belum jelas. Jangan kirim ulang; gunakan Periksa status transfer beberapa menit lagi.',
 INVALID_EPP_CODE:'Kode EPP tidak valid (4 sampai 128 karakter, tanpa spasi).',INVALID_REGISTRANT:'Data pemilik domain belum lengkap atau formatnya salah (telepon harus +62.81234567890).',
 DOMAIN_IMPORT_PAYMENT_REVIEW_REQUIRED:'Pembayaran perlu ditinjau manual. Jangan bayar ulang.',
 IMPORT_CHECKOUT_RECONCILIATION_REQUIRED:'Status pembayaran belum jelas. Jangan bayar ulang; periksa status beberapa menit lagi.',
 DOMAIN_IMPORT_PAYMENT_NOT_READY:'Pembayaran belum siap di server.',DOMAIN_IMPORT_PAYMENT_IDENTITY_MISMATCH:'Data pembayaran tidak cocok. Pesanan perlu ditinjau; jangan bayar ulang.',
 INVALID_SESSION:'Sesi berakhir. Masuk ulang lalu coba lagi.',AUTH_REQUIRED:'Sesi berakhir. Masuk ulang lalu coba lagi.',
 IMPORT_ORDER_NOT_FOUND:'Pesanan tidak ditemukan.',IMPORT_ORDER_NOT_CANCELLABLE:'Pesanan ini tidak dapat dibatalkan.'
};
export const importErrorMessage=e=>MESSAGES[e?.code]||'Permintaan gagal. Tidak ada pembayaran atau perubahan domain yang dipastikan.';
export async function importApi(path,token,{method='POST',body,signal,fetchImpl=globalThis.fetch}={}){
 const r=await fetchImpl(BASE+path,{method,signal,cache:'no-store',credentials:'omit',headers:{authorization:'Bearer '+token,accept:'application/json',...(body!==undefined?{'content-type':'application/json'}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});
 let data={};try{data=await r.json();}catch{}
 if(!r.ok)throw Object.assign(new Error(data.code||'IMPORT_REQUEST_FAILED'),{code:data.code||'IMPORT_REQUEST_FAILED',status:r.status,data});
 return data;
}
export function importStep(o){
 if(o.importState==='cancelled')return 'cancelled';
 if(o.needsReview||o.importState==='needs_review')return 'review';
 if(o.paymentState==='failed'||o.paymentState==='expired')return 'failed';
 if(o.paymentState!=='paid')return o.canPay?'pay':'wait';
 if(o.importState==='completed')return 'done';
 if(o.importState==='transfer_requested'||o.importState==='transfer_pending')return 'transfer_wait';
 if(o.importState==='zone_active')return o.mode==='transfer'?'transfer_form':'zone_active';
 if(o.importState==='awaiting_nameservers')return 'ns';
 return 'zone_create';
}
const CSS=':host{font:14px/1.6 system-ui,sans-serif;display:block}*{box-sizing:border-box}h1{font-size:20px;margin:0 0 4px}h2{font-size:17px;margin:0 0 6px}h3{font-size:15px;margin:14px 0 6px}.wrap{padding:20px 24px;max-width:860px}.card{border:1px solid #dce3ee;border-radius:10px;padding:14px;margin:12px 0}.muted{color:#5b6b82}.warn{color:#8a4b00}.ok{color:#116329}.err{color:#a40e26}button{font:inherit;padding:8px 12px;border:1px solid #ccd6e4;border-radius:8px;background:#f7f9fc;color:#18263d;cursor:pointer;margin:2px 4px 2px 0}button.primary{background:#18263d;color:#fff;border-color:#18263d}button:disabled{opacity:.6;cursor:default}input,select{font:inherit;padding:7px 9px;border:1px solid #ccd6e4;border-radius:8px;max-width:100%;width:100%}label{display:block;font-size:13px;margin:8px 0 2px}label.inline{display:flex;gap:6px;align-items:center}label.inline input{width:auto}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px}code{overflow-wrap:anywhere}.badge{display:inline-block;font-size:12px;padding:1px 8px;border-radius:99px;background:#e9eef6}.row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;justify-content:space-between}ul,ol{padding-left:20px}li{margin:4px 0}';
const INLINE_CSS='.sn-main[data-di-open]>*:not(.sn-top):not(.di-host){display:none!important}.di-host{min-width:0}';
let inline=null;
function closeInline(){if(!inline)return;const i=inline;inline=null;i.dispose?.();i.el.remove();i.main.removeAttribute('data-di-open');document.removeEventListener('click',i.onClick,true);}
export function openAccountDomainImport(){
 const main=document.querySelector('.sn-shell .sn-main,.sn-main');if(!main)throw Error('Studio belum siap.');
 if(inline?.main===main&&inline.el.isConnected)return;closeInline();
 for(const other of main.querySelectorAll('.dm-host'))other.remove();main.removeAttribute('data-dm-open');
 if(!document.getElementById('di-inline-style')){const st=node('style',INLINE_CSS);st.id='di-inline-style';document.head.append(st);}
 const el=node('div');el.className='di-host';main.append(el);main.setAttribute('data-di-open','1');
 const onClick=e=>{const t=e.target.closest?.('#ngeblogging-studio-sidebar button,.sn-workspace,.sn-site-manager button');if(t&&!t.closest('.sn-profile-menu-v298,.sn-profile-menu-v295'))setTimeout(closeInline,0);};
 document.addEventListener('click',onClick,true);
 inline={main,el,onClick,dispose:mountAccountDomainImport(el)};el.scrollIntoView?.({block:'start'});
}
export function mountAccountDomainImport(container,{api=importApi,session=()=>getVerifiedSession({force:true}),open=(u)=>window.open(u,'_blank','noopener,noreferrer'),ask=t=>confirm(t)}={}){
 const host=node('div'),root=host.attachShadow({mode:'open'}),wrap=node('div');wrap.className='wrap';root.append(node('style',CSS),wrap);container.replaceChildren(host);
 const controller=new AbortController();let closed=false,owner=null,orders=[],sel=null,msg=node('p'),busy=false;
 const dispose=()=>{if(closed)return;closed=true;controller.abort();host.remove();};
 async function call(path,opt={}){const a=await session();if(closed||a?.verification!=='verified'||!a.user?.id||!a.session?.access_token||owner&&a.user.id!==owner)throw Object.assign(Error('INVALID_SESSION'),{code:'INVALID_SESSION'});owner=a.user.id;return api(path,a.session.access_token,{...opt,signal:controller.signal});}
 const card=(...k)=>{const c=node('div');c.className='card';c.append(...k);return c;};
 const say=(t,cls)=>{msg.textContent=t;msg.className=cls||'muted';};
 async function act(fn,done){if(busy||closed)return;busy=true;say('Memproses…');render();try{const r=await fn();if(done)say(done(r),'ok');else say('');await reload(false);}catch(e){say(importErrorMessage(e),'err');await reload(false).catch(()=>{});}finally{busy=false;if(!closed)render();}}
 async function reload(first){const d=await call('orders',{method:'GET'});if(closed)return;orders=d.orders||[];if(sel)sel=orders.find(o=>o.orderId===sel.orderId)||null;if(first&&!sel)sel=orders.find(o=>importStep(o)!=='cancelled')||null;render();}
 const btn=(label,fn,{primary=false}={})=>{const b=node('button',label);b.type='button';b.disabled=busy;if(primary)b.className='primary';b.addEventListener('click',fn);return b;};
 function createForm(){
  const domain=node('input'),mode=node('select');domain.placeholder='contoh: namadomain.com';domain.setAttribute('aria-label','Nama domain');domain.autocomplete='off';
  for(const [v,t] of [['nameserver','Jalur A: tetap di registrar lama, arahkan nameserver ke kami (Rp30.000)'],['transfer','Jalur B: pindahkan registrasi ke kami (.com, .net, .org; harga tampil setelah pesanan dibuat)']]){const o=node('option',t);o.value=v;mode.append(o);}
  const form=node('form');form.append(node('label','Nama domain'),domain,node('label','Jalur impor'),mode);
  const go=node('button','Buat pesanan');go.type='submit';go.className='primary';go.disabled=busy;form.append(go);
  form.addEventListener('submit',ev=>{ev.preventDefault();const d=domain.value.trim().toLowerCase();if(!d){say('Masukkan nama domain.','err');return;}
   act(async()=>{const r=await call(mode.value==='transfer'?'transfer/orders':'orders',{body:mode.value==='transfer'?{domain:d}:{domain:d,mode:'nameserver'}});sel={orderId:r.order.orderId};domain.value='';return r;},r=>'Pesanan dibuat untuk '+r.order.domain+' ('+rupiah(r.order.priceIdr)+'). Belum ada pembayaran yang dibuat.');});
  return card(node('h2','Buat pesanan impor'),form,(()=>{const p=node('p','Jalur A hanya memindahkan pengelolaan DNS ke Cloudflare kami. Jalur B memindahkan registrasi (transfer) dan menambah masa berlaku sesuai aturan registry; biaya transfer ke Cloudflare tidak dapat dikembalikan. Domain .id, .co.id, dan .my.id hanya bisa lewat Jalur A.');p.className='muted';return p;})());
 }
 function transferForm(o){
  const f=node('form'),F={};const field=(key,label,ph,type)=>{const i=node('input');i.name=key;if(ph)i.placeholder=ph;if(type)i.type=type;i.autocomplete='off';F[key]=i;const w=node('div');w.append(node('label',label),i);return w;};
  const grid=node('div');grid.className='grid';
  grid.append(field('name','Nama pemilik domain'),field('organization','Organisasi (opsional)'),field('email','Email','nama@contoh.com','email'),field('phone','Telepon','+62.81234567890'),field('street','Alamat'),field('city','Kota'),field('state','Provinsi'),field('postalCode','Kode pos'),field('countryCode','Kode negara (2 huruf)','ID'));
  const epp=node('input');epp.type='password';epp.autocomplete='off';epp.setAttribute('aria-label','Kode EPP');
  const priv=node('input');priv.type='checkbox';priv.checked=true;const pl=node('label');pl.className='inline';pl.append(priv,document.createTextNode(' Sembunyikan data kontak di WHOIS (privasi)'));
  const go=node('button','Kirim transfer');go.type='submit';go.className='primary';go.disabled=busy;
  f.append(grid,node('label','Kode EPP (kode otorisasi dari registrar lama)'),epp,pl,go);
  f.addEventListener('submit',ev=>{ev.preventDefault();const reg={};for(const [k,i] of Object.entries(F)){const v=i.value.trim();if(v)reg[k]=v;}
   if(reg.countryCode)reg.countryCode=reg.countryCode.toUpperCase();
   if(!ask('Kirim transfer '+o.domain+' sekarang? Biaya transfer ke registrar tidak dapat dikembalikan. Kode EPP hanya dikirim sekali dan tidak disimpan di sini.'))return;
   const code=epp.value;epp.value='';
   act(()=>call('transfer/submit',{body:{orderId:o.orderId,eppCode:code,registrant:reg,privacyMode:priv.checked?'redaction':'off'}}),()=>'Transfer dikirim. Proses di registrar lama bisa 1 sampai 10 hari. Gunakan Periksa status transfer.');});
  return f;
 }
 function detail(o){
  const s=importStep(o),c=card(),head=node('div');head.className='row';const bd=node('span',o.importState);bd.className='badge';head.append(node('h2',o.domain),bd);c.append(head);
  c.append(node('p',(o.mode==='transfer'?'Jalur B (transfer)':'Jalur A (nameserver)')+(o.priceIdr?' · '+rupiah(o.priceIdr):'')+' · pembayaran: '+o.paymentState));
  const tx=node('code',o.orderId);c.append(tx);
  const A=(...b)=>{const d=node('div');d.append(...b);c.append(d);};
  const nsList=()=>{const u=node('ul');for(const n of o.nameServers||[])u.append(node('li',n));return u;};
  if(s==='pay'){A(node('h3','Langkah: pembayaran'),btn('Bayar sekarang',()=>act(async()=>{const r=await call('checkout',{body:{orderId:o.orderId}});open(r.checkout.url);return r;},()=>'Halaman pembayaran dibuka di tab baru. Setelah membayar, tekan Periksa status pembayaran.'),{primary:true}),btn('Periksa status pembayaran',()=>act(()=>call('payment-status',{body:{orderId:o.orderId}}),r=>'Status pembayaran: '+r.paymentState+'.')));}
  if(s==='wait')A(node('p','Pesanan ini belum dapat dibayar.'));
  if(s==='failed')A(node('p','Pembayaran gagal atau kedaluwarsa. Buat pesanan baru jika masih ingin melanjutkan.'));
  if(s==='zone_create')A(node('h3','Langkah: buat zona Cloudflare'),node('p','Pembayaran diterima. Buat zona untuk domain ini.'),btn('Buat zona',()=>act(()=>call(o.mode==='transfer'?'transfer/zone':'zone',{body:{orderId:o.orderId}}),r=>r.zone?.active?'Zona sudah aktif.':'Zona dibuat. Pasang nameserver di bawah di registrar Anda.'),{primary:true}));
  if(s==='ns'){A(node('h3','Langkah: pasang nameserver'),node('p','Di registrar lama, ganti nameserver domain ke:'),nsList(),(()=>{const p=node('p','Perubahan bisa memakan waktu hingga 24 jam. Jangan hapus nameserver lama sebelum mencatatnya: '+(o.originalNameServers||[]).join(', '));p.className='muted';return p;})(),btn('Periksa status zona',()=>act(()=>call(o.mode==='transfer'?'transfer/zone':'zone',{body:{orderId:o.orderId}}),r=>r.zone?.active?'Zona aktif.':'Zona belum aktif. Coba lagi nanti.'),{primary:true}));}
  if(s==='zone_active'){const p=node('p','Zona Cloudflare aktif. Domain Anda sudah memakai nameserver kami. Pengelolaan record DNS untuk domain impor belum tersedia di halaman ini.');p.className='ok';A(p);}
  if(s==='transfer_form'){const w=node('p','Persiapan: buka kunci transfer di registrar lama, nonaktifkan DNSSEC, domain berumur lebih dari 60 hari, lalu ambil kode EPP.');w.className='warn';A(node('h3','Langkah: kirim transfer'),w,transferForm(o));}
  if(s==='transfer_wait')A(node('h3','Langkah: menunggu transfer'),node('p','Transfer sedang diproses. Registrar lama dapat meminta persetujuan; biasanya 1 sampai 10 hari.'),btn('Periksa status transfer',()=>act(()=>call('transfer/status',{body:{orderId:o.orderId}}),r=>r.transfer?.completed?'Transfer selesai.':'Status transfer: '+(r.transfer?.state||'menunggu')+'.'),{primary:true}));
  if(s==='done'){const p=node('p','Selesai.');p.className='ok';A(p);}
  if(s==='review'){const p=node('p','Pesanan ditandai untuk ditinjau. Jangan membayar atau mengirim ulang; hubungi dukungan dengan menyebut nomor pesanan di atas.');p.className='warn';A(p);}
  if(s==='cancelled')A(node('p','Pesanan dibatalkan.'));
  if(o.canCancel)A(btn('Batalkan pesanan',()=>{if(ask('Batalkan pesanan '+o.domain+'?'))act(async()=>{await call('orders/cancel',{body:{orderId:o.orderId}});sel=null;},()=>'Pesanan dibatalkan.');}));
  return c;
 }
 function render(){
  if(closed)return;wrap.replaceChildren();wrap.append(node('h1','Impor domain'),(()=>{const p=node('p','Pindahkan domain dari registrar lain. Membuka halaman ini tidak membuat pembayaran atau mengubah DNS.');p.className='muted';return p;})(),createForm());
  const list=card(node('h2','Pesanan impor'));
  const visible=orders.filter(o=>o.importState!=='cancelled');if(!visible.length)list.append(node('p','Belum ada pesanan impor.'));
  for(const o of visible){const r=node('div');r.className='row';const l=node('span',o.domain+' · '+(o.mode==='transfer'?'transfer':'nameserver')+' · '+o.importState);r.append(l,btn('Buka',()=>{sel={orderId:o.orderId};render();}));list.append(r);}
  wrap.append(list);wrap.append(msg);const cur=sel&&orders.find(o=>o.orderId===sel.orderId);if(cur)wrap.append(detail(cur));
 }
 render();say('Memverifikasi sesi akun…');reload(true).then(()=>{if(!msg.className.includes('err'))say('');}).catch(e=>{if(!closed)say(importErrorMessage(e),'err');});
 return dispose;
}
