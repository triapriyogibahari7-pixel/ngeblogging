import {formatRenewalDate} from './domain-renewal-info.mjs';
export const RENEWAL_ADMIN_ID='91d4b436-6d7a-4e46-93f5-1ecdc6d33fb3';
const BASE='/api/commerce/domains/manage/renewal-admin/';
const money=n=>'Rp'+new Intl.NumberFormat('id-ID').format(n);
const termYears=o=>Number.isInteger(o?.years)&&o.years>0?o.years:1;
const MSG={ADMIN_REQUIRED:'Hanya admin yang dapat membuka antrean ini.',DOMAIN_RENEWAL_DISABLED:'Perpanjangan belum diaktifkan (DOMAIN_RENEWAL_ENABLED belum true).',RENEWAL_NOT_YET_EXTENDED:'Masa berlaku di registrar belum bertambah sesuai lama perpanjangan pesanan ini. Perpanjang dulu di dasbor Cloudflare, lalu coba lagi.',RENEWAL_NOT_COMPLETABLE:'Pesanan ini tidak bisa diselesaikan (status sudah berubah). Muat ulang antrean.',RENEWAL_DOMAIN_UNVERIFIED:'Status domain di registrar belum dapat diverifikasi. Coba lagi nanti.',INVALID_SESSION:'Sesi tidak valid. Masuk kembali.'};
export const renewalAdminErrorMessage=e=>MSG[e?.code]||'Permintaan belum berhasil. Muat ulang antrean.';
export async function renewalAdminApi(path,method,body,token,{signal,fetchImpl=globalThis.fetch}={}){
 const r=await fetchImpl(BASE+path,{method,cache:'no-store',credentials:'same-origin',signal,headers:{accept:'application/json',authorization:'Bearer '+token,...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
 let d=null;try{d=await r.json();}catch{}
 if(!r.ok){const code=typeof d?.code==='string'&&/^[A-Z][A-Z0-9_]{0,79}$/.test(d.code)?d.code:'RENEWAL_REQUEST_FAILED';throw Object.assign(Error(code),{code,status:r.status,data:d});}
 return d;
}
export async function renderRenewalAdminQueue(box,{read,live,node,card,title,signal,fetchImpl,ask=globalThis.confirm}){
 title(box,'Antrean perpanjangan','Khusus admin. Perpanjang domain di dasbor Cloudflare sesuai lama perpanjangan pesanan, lalu tekan Tandai selesai. Tanggal habis baru dibaca langsung dari registrar.');
 const wrap=node('div');box.append(wrap);
 const api=(path,method,body)=>read(a=>renewalAdminApi(path,method,body,a.session.access_token,{signal,fetchImpl}));
 async function draw(note){
  wrap.replaceChildren(node('p','Membaca antrean…'));
  let list;
  try{list=(await api('orders','GET')).orders||[];}
  catch(e){if(live())wrap.replaceChildren(node('p',renewalAdminErrorMessage(e)));return;}
  if(!live())return;
  const out=node('div');
  if(note){const n=node('p',note);n.className='muted';out.append(n);}
  if(!list.length)out.append(node('p','Tidak ada perpanjangan yang menunggu.'));
  for(const o of list){
   const yrs=termYears(o);
   const c=card(node('h3',o.domain),node('code',o.orderId));
   c.append(node('p','Lama perpanjangan: '+yrs+' tahun'),node('p','Dibayar: '+(formatRenewalDate(o.paidAt)||'-')+' · '+money(o.amountIdr)),node('p','Habis sebelum perpanjangan: '+(formatRenewalDate(o.expiresAtBefore)||'-')));
   if(o.renewalState==='awaiting_admin'){
    const st=node('p'),b=node('button','Tandai selesai');st.className='muted';b.type='button';b.className='primary';
    b.addEventListener('click',async()=>{
     if(!ask('Tandai '+o.domain+' selesai? Pastikan registrar sudah diperpanjang '+yrs+' tahun. Sistem memeriksa tanggal habis baru di registrar.'))return;
     b.disabled=true;st.textContent='Memeriksa registrar…';
     try{const r=await api('complete','POST',{orderId:o.orderId});await draw('Selesai: '+o.domain+', habis '+(formatRenewalDate(r.expiresAtAfter)||'-')+'.');}
     catch(e){if(live()){const had=e?.data?.expiresAt?' Tanggal habis di registrar saat ini: '+formatRenewalDate(e.data.expiresAt)+'. Pesanan ini '+yrs+' tahun.':'';st.textContent=renewalAdminErrorMessage(e)+had;b.disabled=false;}}
    });
    c.append(b,st);
   }else c.append(node('p','Perlu ditinjau: '+(o.reviewReason||'-')+'. Jangan diselesaikan sebelum pembayaran diperiksa di Midtrans.'));
   out.append(c);
  }
  wrap.replaceChildren(out);
 }
 await draw();
}
