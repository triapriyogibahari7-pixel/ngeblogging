import {getVerifiedSession} from './lib/auth-session-v76.js';
import {supabase} from './lib/supabase.js';
import {loadOrderHistoryPage} from './domain-order-history-page-client.mjs';
import {loadOrderStatus} from './domain-order-status-model.mjs';
import {dnsApi,dnsErrorMessage} from './domain-dns-management-client.mjs';
let opened=null;
const node=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=String(text);return e;};
export async function openAccountDomainManagement(){
 if(opened?.isConnected){opened.focus();return;}
 const dialog=node('dialog'),host=node('div'),root=host.attachShadow({mode:'open'}),opener=document.querySelector('.sn-avatar')||document.activeElement;
 dialog.setAttribute('aria-label','Pengelolaan domain & DNS');
 for(const [key,value]of Object.entries({width:'min(1120px, calc(100vw - 24px))',height:'calc(100dvh - 24px)','max-width':'none','max-height':'none',padding:'0',border:'1px solid #dce3ee','border-radius':'16px',background:'white',color:'#18263d',overflow:'auto'}))dialog.style.setProperty(key,value,'important');
 root.append(node('style',':host{font:14px/1.6 system-ui,sans-serif}*{box-sizing:border-box}header{display:flex;justify-content:space-between;gap:16px;padding:20px;border-bottom:1px solid #dce3ee}h1{font-size:23px;margin:0}main{padding:20px}article,details{border:1px solid #dce3ee;border-radius:10px;padding:14px;margin:12px 0}summary{cursor:pointer;font-weight:600}button{font:inherit;padding:9px 12px;border:1px solid #ccd6e4;border-radius:8px;background:#f7f9fc;color:#18263d;cursor:pointer}button:disabled{opacity:.6}code,p{overflow-wrap:anywhere}input,select{font:inherit;padding:7px 9px;border:1px solid #ccd6e4;border-radius:8px;max-width:100%}form.dns{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin:10px 0}.rec{display:flex;gap:8px;flex-wrap:wrap;align-items:center;border-top:1px solid #eef2f7;padding:8px 0}.rec code{flex:1 1 280px}.warn{color:#8a4b00}'));
 const header=node('header'),close=node('button','Tutup'),main=node('main'),notice=node('p','Memverifikasi sesi akun…'),list=node('section'),details=node('section'),registered=node('section'),pending=node('section'),more=node('button','Muat pesanan berikutnya');more.type='button';more.hidden=true;list.append(node('h2','Domain registrasi terkonfirmasi'),registered,node('h2','Pesanan belum terkonfirmasi'),pending);close.type='button';close.autofocus=true;header.append(node('h1','Pengelolaan domain & DNS'),close);main.append(node('p','Pesanan domain akun ini, lintas situs. Membuka halaman tidak membuat pembayaran, memasang domain, atau mengubah DNS.'),notice,list,more,details);root.append(header,main);dialog.append(host);
 let owner=null,closed=false,busy=false,subscription=null;const controller=new AbortController();
 function dispose(){if(closed)return;closed=true;controller.abort();subscription?.unsubscribe();if(dialog.open)dialog.close();dialog.remove();if(opened===dialog)opened=null;if(opener?.isConnected)opener.focus();}
 close.addEventListener('click',dispose);dialog.addEventListener('cancel',event=>{event.preventDefault();dispose();});dialog.addEventListener('close',dispose);
 document.body.append(dialog);opened=dialog;try{dialog.showModal();}catch(error){dispose();throw error;}
 async function session(){const a=await getVerifiedSession({force:true});if(closed||a?.verification!=='verified'||!a.user?.id||!a.session?.access_token||owner&&a.user.id!==owner)throw Error('Sesi akun berubah atau belum terverifikasi.');return a;}
 async function read(fn){const a=await session();owner=a.user.id;const data=await fn(a);await session();if(closed)throw Error('Halaman ditutup.');return data;}
 function dnsPanelSlot(order){return order.registrationConfirmed?dnsPanel(order):section('DNS record / DNS management','Pengelolaan DNS tersedia setelah domain terkonfirmasi terdaftar.');}
 function section(title,text){const box=node('details');box.append(node('summary',title),node('p',text));return box;}

 function dnsPanel(order){
  const box=node('details'),body=node('div'),status=node('p'),list=node('div'),form=node('form'),tools=node('div'),dnssec=node('div');box.open=true;form.className='dns';
  const call=(path,opt)=>read(a=>dnsApi(order.orderId,a.session.access_token,path,{...opt,signal:controller.signal}));
  const field=(tag,name,ph)=>{const e=node(tag);e.name=name;if(ph)e.placeholder=ph;return e;};
  const type=field('select','type'),name=field('input','name','Nama (@ = domain utama)'),content=field('input','content','Isi / tujuan'),prio=field('input','priority','Prioritas MX'),ttl=field('input','ttl','TTL (1 = Auto)'),prox=field('input','proxied'),proxLabel=node('label'),save=node('button','Tambah record'),cancel=node('button','Batal edit');
  for(const t of ['A','AAAA','CNAME','TXT','MX']){const o=node('option',t);o.value=t;type.append(o);}
  prox.type='checkbox';proxLabel.append(prox,document.createTextNode(' Proxy'));save.type='submit';cancel.type='button';cancel.hidden=true;let editing=null;
  form.append(type,name,content,prio,ttl,proxLabel,save,cancel);
  function reset(){editing=null;form.reset();save.textContent='Tambah record';cancel.hidden=true;}
  cancel.addEventListener('click',reset);
  async function refresh(){status.textContent='Membaca record DNS…';try{const d=await call('dns');list.replaceChildren();if(!d.records.length)list.append(node('p','Belum ada record yang dapat diedit.'));
   for(const r of d.records){const row=node('div'),text=node('code',r.type+' '+r.name+' → '+r.content+(r.priority!==undefined?' (prioritas '+r.priority+')':'')+' · TTL '+(r.ttl===1?'Auto':r.ttl)+(r.proxied?' · proxy':'')),edit=node('button','Edit'),del=node('button','Hapus');row.className='rec';edit.type=del.type='button';
    edit.addEventListener('click',()=>{editing=r.id;type.value=r.type;name.value=r.name;content.value=r.content;prio.value=r.priority??'';ttl.value=r.ttl;prox.checked=r.proxied;save.textContent='Simpan perubahan';cancel.hidden=false;form.scrollIntoView?.({block:'nearest'});});
    del.addEventListener('click',async()=>{if(!confirm('Hapus record '+r.type+' '+r.name+'? Unduh cadangan lebih dulu bila perlu.'))return;del.disabled=true;try{await call('dns/'+r.id,{method:'DELETE'});status.textContent='Record dihapus.';await refresh();}catch(e){del.disabled=false;status.textContent=dnsErrorMessage(e);}});
    row.append(text,edit,del);list.append(row);}
   status.textContent=d.records.length+' record dibaca dari penyedia.';}catch(e){status.textContent=dnsErrorMessage(e);}}
  form.addEventListener('submit',async event=>{event.preventDefault();save.disabled=true;const rec={type:type.value,name:name.value,content:content.value,ttl:ttl.value,proxied:prox.checked};if(type.value==='MX')rec.priority=prio.value;
   try{await call(editing?'dns/'+editing:'dns',{method:editing?'PATCH':'POST',body:rec});status.textContent=editing?'Record diperbarui.':'Record ditambahkan.';reset();await refresh();}catch(e){status.textContent=dnsErrorMessage(e);}finally{save.disabled=false;}});
  const dl=node('button','Unduh cadangan DNS'),file=node('input'),extra=node('input'),extraLabel=node('label'),apply=node('button','Terapkan pemulihan'),plan=node('p');dl.type=apply.type='button';file.type='file';file.accept='application/json,.json';extra.type='checkbox';extraLabel.append(extra,document.createTextNode(' Hapus juga record yang tidak ada di cadangan'));apply.hidden=true;let backup=null,planHash='';
  dl.addEventListener('click',async()=>{try{const d=await call('backup'),blob=new Blob([JSON.stringify(d.backup,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='dns-'+d.domain+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);status.textContent='Cadangan diunduh.';}catch(e){status.textContent=dnsErrorMessage(e);}});
  function saveSafety(b){const blob=new Blob([JSON.stringify(b,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='dns-sebelum-pemulihan.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
  async function preview(){apply.hidden=true;if(!backup)return;try{const d=await call('restore',{method:'POST',body:{backup,removeExtra:extra.checked}});planHash=d.planHash;plan.textContent='Pratinjau: tambah '+d.summary.create+', ubah '+d.summary.update+', hapus '+d.summary.remove+', tetap '+d.summary.unchanged+'. Belum ada yang diterapkan.';apply.hidden=!(d.summary.create+d.summary.update+d.summary.remove);}catch(e){plan.textContent=dnsErrorMessage(e);}}
  file.addEventListener('change',async()=>{backup=null;const f=file.files?.[0];if(!f)return;if(f.size>262144){plan.textContent='Berkas terlalu besar.';return;}try{backup=JSON.parse(await f.text());}catch{plan.textContent='Berkas bukan JSON yang valid.';return;}await preview();});extra.addEventListener('change',preview);
  apply.addEventListener('click',async()=>{if(!backup||!confirm('Terapkan pemulihan DNS dari cadangan ini? Cadangan pengaman kondisi saat ini akan diunduh lebih dulu.'))return;apply.disabled=true;try{const d=await call('restore',{method:'POST',body:{backup,removeExtra:extra.checked,apply:true,planHash}});saveSafety(d.safetyBackup);plan.textContent='Pemulihan selesai: tambah '+d.done.create+', ubah '+d.done.update+', hapus '+d.done.remove+'.';apply.hidden=true;await refresh();}catch(e){if(e?.data?.safetyBackup)saveSafety(e.data.safetyBackup);if(e?.code==='DOMAIN_DNS_PLAN_CHANGED')await preview();plan.textContent=dnsErrorMessage(e)+(e?.data?.safetyBackup?' Cadangan pengaman telah diunduh.':'');}finally{apply.disabled=false;}});
  tools.append(dl,node('p','Pulihkan dari berkas cadangan (pratinjau dulu, tidak otomatis diterapkan):'),file,extraLabel,plan,apply);
  const dsWrap=node('p'),dsBtn=node('button');dsBtn.type='button';dsBtn.hidden=true;let dsOn=false;dnssec.append(node('h3','DNSSEC'),dsWrap,dsBtn);
  async function loadDs(){try{const d=await call('dnssec');dsOn=d.dnssec.status==='active';dsWrap.textContent='Status DNSSEC: '+d.dnssec.status+(d.dnssec.ds?' · DS: '+d.dnssec.ds:'')+(dsOn?' · Penonaktifan tidak tersedia dari halaman ini.':'');dsBtn.textContent='Aktifkan DNSSEC';dsBtn.hidden=dsOn;}catch(e){dsWrap.textContent=dnsErrorMessage(e);}}
  dsBtn.addEventListener('click',async()=>{if(!confirm(dsOn?'Menonaktifkan DNSSEC tanpa menghapus DS di registrar dapat membuat domain tidak dapat diakses. Lanjutkan?':'Aktifkan DNSSEC untuk domain ini?'))return;dsBtn.disabled=true;try{await call('dnssec',{method:'POST',body:{enabled:!dsOn,confirm:true}});await loadDs();}catch(e){dsWrap.textContent=dnsErrorMessage(e);}finally{dsBtn.disabled=false;}});
  body.append(status,list,form,node('h3','Cadangan & pemulihan'),tools,dnssec);box.append(node('summary','DNS record, cadangan, pemulihan & DNSSEC'),body);refresh();loadDs();return box;
 }
 async function inspect(order){if(busy||closed)return;busy=true;const timer=setTimeout(()=>controller.abort(),20000);details.replaceChildren(node('p','Membaca status domain…'));
  try{const data=await read(a=>loadOrderStatus(order.orderId,a.session.access_token,{signal:controller.signal}));if(closed)return;const r=data.registrar,known=r?.status==='observed';details.replaceChildren(node('h2',data.domain));details.append(section('Ringkasan domain',data.message),dnsPanelSlot(order),section('Nameserver',known&&Array.isArray(r.nameservers)?r.nameservers.join('\n'):'Nameserver belum dapat diverifikasi dari penyedia.'),section('Pemeriksaan koneksi','Registrasi domain tidak membuktikan DNS publik, routing, HTTPS, dan kecocokan situs telah aktif. Pemeriksaan ini belum dijalankan oleh halaman ini.'),section('Keamanan DNS','Tidak ada pengaturan keamanan yang diubah ketika halaman dibuka.'),section('Kode EPP','Kode EPP tidak dapat ditampilkan di halaman ini: Cloudflare Registrar mengeluarkannya lewat dasbor pemegang akun registrar, dan pengambilan otomatis belum tersedia. Jangan mengirim kode EPP ke chat.'));
  }catch(error){if(!closed)details.replaceChildren(node('p','Status domain belum dapat dibaca. Sesi atau layanan perlu diperiksa; tidak ada perubahan dilakukan.'));}
  finally{clearTimeout(timer);busy=false;}
 }
 if(supabase?.auth){subscription=supabase.auth.onAuthStateChange((_event,s)=>{if(owner&&s?.user?.id!==owner)dispose();}).data?.subscription;}
 let cursor='',loaded=0;const seenOrders=new Set();
 async function loadPage(){
  if(busy||closed)return;busy=true;more.disabled=true;const timer=setTimeout(()=>controller.abort(),20000);
  try{const data=await read(a=>loadOrderHistoryPage(a.user.id,a.session.access_token,{cursor,signal:controller.signal}));if(closed)return;
   if(data.orders.some(order=>seenOrders.has(order.orderId)))throw Error('HISTORY_PAGE_OVERLAP');
   const cards=[];for(const order of [...data.orders].reverse()){const card=node('article'),button=node('button','Lihat pengelolaan domain');button.type='button';button.addEventListener('click',()=>inspect(order));card.append(node('h3',order.domain),node('p',order.message),node('code',order.orderId),node('p',order.registrationConfirmed?'Registrasi terkonfirmasi; koneksi situs belum diverifikasi.':'Pesanan belum dianggap domain terdaftar dan terpasang.'),button);cards.push({order,card});}
   for(const {order,card} of cards){(order.registrationConfirmed?registered:pending).append(card);seenOrders.add(order.orderId);}
   loaded=seenOrders.size;cursor=data.nextCursor;more.hidden=!data.hasMore;
   notice.textContent=loaded?loaded+' pesanan akun sudah dimuat. '+(data.hasMore?'Masih ada pesanan; gunakan tombol muat berikutnya. Kelompok domain hanya mencakup pesanan yang sudah dimuat.':'Tidak ada halaman lanjutan pada pembacaan ini. Buka ulang untuk pesanan baru. Registrasi tidak berarti domain sudah terhubung ke situs.'):'Belum ada pesanan domain pada akun ini.';
  }catch(error){if(!closed){notice.textContent=loaded?'Halaman berikutnya belum dapat dibaca. '+loaded+' pesanan sebelumnya tetap ditampilkan; daftar belum dinyatakan lengkap.':'Daftar belum dapat dibaca. Periksa sesi akun atau layanan. Tidak ada pesanan, pembayaran, atau DNS yang diubah.';}}
  finally{clearTimeout(timer);busy=false;more.disabled=false;}
 }
 more.addEventListener('click',loadPage);await loadPage();
}
