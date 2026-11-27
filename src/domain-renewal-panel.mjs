import {renewalSummary,renderRenewalInfo,formatRenewalDate} from './domain-renewal-info.mjs';
const BASE='/api/commerce/domains/manage/renewal/';
const money=n=>'Rp'+new Intl.NumberFormat('id-ID').format(n);
const MESSAGES={DOMAIN_RENEWAL_DISABLED:'Perpanjangan lewat Ngeblogging belum dibuka. Tanggal masa berlaku tetap ditampilkan di atas.',DOMAIN_NOT_RENEWABLE:'Domain ini belum bisa diperpanjang.',RENEWAL_DOMAIN_UNVERIFIED:'Status domain belum dapat diverifikasi dari registrar. Coba lagi nanti.',RENEWAL_PRICE_UNAVAILABLE:'Harga perpanjangan belum tersedia.',DOMAIN_RENEWAL_PAYMENT_NOT_READY:'Pembayaran perpanjangan belum siap.',RENEWAL_ORDER_NOT_PAYABLE:'Pesanan ini tidak dapat dibayar lagi. Muat ulang halaman.',RENEWAL_ORDER_ALREADY_PAID:'Pesanan ini sudah dibayar.',CHECKOUT_UNVERIFIED:'Tautan pembayaran belum terverifikasi. Coba lagi.',RENEWAL_CHECKOUT_RECONCILIATION_REQUIRED:'Pembuatan pembayaran belum pasti. Jangan membayar ulang; hubungi dukungan dengan menyebut nomor pesanan.',DOMAIN_RENEWAL_PAYMENT_REVIEW_REQUIRED:'Pembayaran perlu ditinjau. Hubungi dukungan dengan menyebut nomor pesanan.',INVALID_SESSION:'Sesi tidak valid. Masuk kembali.',AUTH_REQUIRED:'Sesi tidak valid. Masuk kembali.'};
export const renewalErrorMessage=e=>MESSAGES[e?.code]||'Permintaan perpanjangan belum berhasil. Periksa status pesanan sebelum mengulang.';
export async function renewalApi(path,method,body,token,{signal,fetchImpl=globalThis.fetch}={}){
 const r=await fetchImpl(BASE+path,{method,cache:'no-store',credentials:'same-origin',signal,headers:{accept:'application/json',authorization:'Bearer '+token,...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
 let d=null;try{d=await r.json();}catch{}
 if(!r.ok){const code=typeof d?.code==='string'&&/^[A-Z][A-Z0-9_]{0,79}$/.test(d.code)?d.code:'RENEWAL_REQUEST_FAILED';throw Object.assign(Error(code),{code,status:r.status});}
 return d;
}
const YEAR_CHOICES=[1,2,3,10];
const yearOptions=q=>YEAR_CHOICES.map(y=>(Array.isArray(q?.options)?q.options:[]).find(o=>o?.years===y&&Number.isSafeInteger(o.amountIdr)&&o.amountIdr>0)).filter(Boolean);
export async function renderRenewalPanel(box,{sel,registrar,paidAt,read,live,node,card,signal,fetchImpl}){
 box.append(renderRenewalInfo(renewalSummary({registrar,paidAt,imported:Boolean(sel.imported)}),{node,card}));
 if(sel.imported)return;
 const wrap=node('div');box.append(wrap);
 const api=(path,method,body)=>read(a=>renewalApi(path,method,body,a.session.access_token,{signal,fetchImpl}));
 async function draw(opts={}){
  wrap.replaceChildren(node('p','Membaca status perpanjangan…'));
  let orders;
  try{orders=(await api('orders','GET')).orders||[];}
  catch(e){if(live())wrap.replaceChildren(card(node('h3','Perpanjangan domain'),node('p',renewalErrorMessage(e))));return;}
  if(!live())return;
  const mine=orders.filter(o=>o.domainOrderId===sel.orderId),open=mine.find(o=>['created','awaiting_admin','review_required'].includes(o.renewalState)),last=mine.find(o=>o.renewalState==='completed');
  const c=card(node('h3','Perpanjangan domain')),status=node('p');status.className='muted';status.textContent=opts.note||'';
  const act=(label,fn,primary)=>{const b=node('button',label);b.type='button';if(primary)b.className='primary';b.addEventListener('click',async()=>{b.disabled=true;status.textContent='Memproses…';try{await fn();}catch(e){if(live()){status.textContent=renewalErrorMessage(e);b.disabled=false;}}});return b;};
  if(!open){
   const choices=yearOptions(opts.quote);
   if(choices.length){
    c.append(node('p','Pilih lama perpanjangan. Harga di bawah adalah total untuk seluruh masa perpanjangan. Setelah pembayaran diterima, perpanjangan diproses di registrar oleh tim Ngeblogging.'));
    for(const o of choices)c.append(act(o.years+' tahun - '+money(o.amountIdr),async()=>{await api('orders','POST',{orderId:sel.orderId,years:o.years});await draw();},true));
   }else{
    c.append(node('p','Perpanjang masa berlaku domain untuk 1, 2, 3, atau 10 tahun. Harga dihitung dari biaya registrar. Setelah pembayaran diterima, perpanjangan diproses di registrar oleh tim Ngeblogging.'),act('Perpanjang domain',async()=>{const q=await api('quote','POST',{orderId:sel.orderId});if(!yearOptions(q).length)throw Object.assign(Error('RENEWAL_PRICE_UNAVAILABLE'),{code:'RENEWAL_PRICE_UNAVAILABLE'});await draw({quote:q});},true));
   }
   const done=last&&formatRenewalDate(last.completedAt);if(done)c.append(node('p','Perpanjangan terakhir selesai: '+done+'.'));
  }else if(open.renewalState==='created'){
   const yrs=Number.isInteger(open.years)&&open.years>0?open.years:1;
   c.append(node('p','Pesanan perpanjangan '+yrs+' tahun, total '+money(open.amountIdr)+' untuk '+open.domain+'.'),node('code',open.orderId));
   c.append(act(open.paymentState==='pending'?'Lanjutkan pembayaran':'Bayar perpanjangan',async()=>{const r=await api('checkout','POST',{orderId:open.orderId});const u=r?.checkout?.url;if(typeof u!=='string'||!/^https:\/\/app\.midtrans\.com\//.test(u))throw Object.assign(Error('CHECKOUT_UNVERIFIED'),{code:'CHECKOUT_UNVERIFIED'});await draw({link:u,orderId:open.orderId,note:'Halaman pembayaran siap. Buka lewat tautan di bawah, lalu kembali dan tekan Periksa status pembayaran.'});},true),act('Periksa status pembayaran',async()=>{await api('payment-status','POST',{orderId:open.orderId});await draw({note:'Status pembayaran diperbarui.'});}));
   if(opts.link&&opts.orderId===open.orderId){const a=node('a','Buka halaman pembayaran');a.href=opts.link;a.target='_blank';a.rel='noopener noreferrer';c.append(a);}
  }else if(open.renewalState==='awaiting_admin'){
   c.append(node('p','Pembayaran diterima. Perpanjangan sedang diproses di registrar. Tanggal habis masa berlaku diperbarui setelah selesai.'),node('code',open.orderId));
  }else{
   c.append(node('p','Pesanan perpanjangan ini perlu ditinjau. Jangan membayar ulang; hubungi dukungan dengan menyebut nomor pesanan.'),node('code',open.orderId));
  }
  c.append(status);wrap.replaceChildren(c);
 }
 await draw();
}
