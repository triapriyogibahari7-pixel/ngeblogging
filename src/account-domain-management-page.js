import {getVerifiedSession} from './lib/auth-session-v76.js';
import {supabase} from './lib/supabase.js';
import {loadOrderHistory} from './domain-order-history-client.mjs';
import {loadOrderStatus} from './domain-order-status-model.mjs';
let opened=null;
const node=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=String(text);return e;};
export async function openAccountDomainManagement(){
 if(opened?.isConnected){opened.focus();return;}
 const dialog=node('dialog'),host=node('div'),root=host.attachShadow({mode:'open'}),opener=document.querySelector('.sn-avatar')||document.activeElement;
 dialog.setAttribute('aria-label','Pengelolaan domain & DNS');
 for(const [key,value]of Object.entries({width:'min(1120px, calc(100vw - 24px))',height:'calc(100dvh - 24px)','max-width':'none','max-height':'none',padding:'0',border:'1px solid #dce3ee','border-radius':'16px',background:'white',color:'#18263d',overflow:'auto'}))dialog.style.setProperty(key,value,'important');
 root.append(node('style',':host{font:14px/1.6 system-ui,sans-serif}*{box-sizing:border-box}header{display:flex;justify-content:space-between;gap:16px;padding:20px;border-bottom:1px solid #dce3ee}h1{font-size:23px;margin:0}main{padding:20px}article,details{border:1px solid #dce3ee;border-radius:10px;padding:14px;margin:12px 0}summary{cursor:pointer;font-weight:600}button{font:inherit;padding:9px 12px;border:1px solid #ccd6e4;border-radius:8px;background:#f7f9fc;color:#18263d;cursor:pointer}button:disabled{opacity:.6}code,p{overflow-wrap:anywhere}'));
 const header=node('header'),close=node('button','Tutup'),main=node('main'),notice=node('p','Memverifikasi sesi akun…'),list=node('section'),details=node('section');close.type='button';close.autofocus=true;header.append(node('h1','Pengelolaan domain & DNS'),close);main.append(node('p','Pesanan domain akun ini, lintas situs. Membuka halaman tidak membuat pembayaran, memasang domain, atau mengubah DNS.'),notice,list,details);root.append(header,main);dialog.append(host);
 let owner=null,closed=false,busy=false,subscription=null;const controller=new AbortController();
 function dispose(){if(closed)return;closed=true;controller.abort();subscription?.unsubscribe();if(dialog.open)dialog.close();dialog.remove();if(opened===dialog)opened=null;if(opener?.isConnected)opener.focus();}
 close.addEventListener('click',dispose);dialog.addEventListener('cancel',event=>{event.preventDefault();dispose();});dialog.addEventListener('close',dispose);
 document.body.append(dialog);opened=dialog;try{dialog.showModal();}catch(error){dispose();throw error;}
 async function session(){const a=await getVerifiedSession({force:true});if(closed||a?.verification!=='verified'||!a.user?.id||!a.session?.access_token||owner&&a.user.id!==owner)throw Error('Sesi akun berubah atau belum terverifikasi.');return a;}
 async function read(fn){const a=await session();owner=a.user.id;const data=await fn(a);await session();if(closed)throw Error('Halaman ditutup.');return data;}
 function section(title,text){const box=node('details');box.append(node('summary',title),node('p',text));return box;}
 async function inspect(order){if(busy||closed)return;busy=true;const timer=setTimeout(()=>controller.abort(),20000);details.replaceChildren(node('p','Membaca status domain…'));
  try{const data=await read(a=>loadOrderStatus(order.orderId,a.session.access_token,{signal:controller.signal}));if(closed)return;const r=data.registrar,known=r?.status==='observed';details.replaceChildren(node('h2',data.domain));details.append(section('Ringkasan domain',data.message),section('DNS record / DNS management','Editor record DNS belum terhubung pada integrasi menu ini. Tidak ada record dibuat, diubah, atau dihapus.'),section('Nameserver',known&&Array.isArray(r.nameservers)?r.nameservers.join('\n'):'Nameserver belum dapat diverifikasi dari penyedia.'),section('Pemeriksaan koneksi','Registrasi domain tidak membuktikan DNS publik, routing, HTTPS, dan kecocokan situs telah aktif. Pemeriksaan ini belum dijalankan oleh halaman ini.'),section('Keamanan DNS','Tidak ada pengaturan keamanan yang diubah ketika halaman dibuka.'),section('DNSSEC','Pembacaan dan perubahan DNSSEC belum terhubung pada integrasi menu ini.'),section('Kode EPP','Pengambilan EPP belum terhubung. Jangan mengirim kode EPP ke chat.'));
  }catch(error){if(!closed)details.replaceChildren(node('p','Status domain belum dapat dibaca. Sesi atau layanan perlu diperiksa; tidak ada perubahan dilakukan.'));}
  finally{clearTimeout(timer);busy=false;}
 }
 if(supabase?.auth){subscription=supabase.auth.onAuthStateChange((_event,s)=>{if(owner&&s?.user?.id!==owner)dispose();}).data?.subscription;}
 const timer=setTimeout(()=>controller.abort(),20000);
 try{const data=await read(a=>loadOrderHistory(a.user.id,a.session.access_token,{signal:controller.signal}));if(closed)return;
  for(const order of data.orders){const card=node('article'),button=node('button','Lihat pengelolaan domain');button.type='button';button.addEventListener('click',()=>inspect(order));card.append(node('h2',order.domain),node('p',order.message),node('code',order.orderId),node('p',order.registrationConfirmed?'Registrasi terkonfirmasi; koneksi situs belum diverifikasi.':'Pesanan belum dianggap domain terdaftar dan terpasang.'),button);list.append(card);}
  notice.textContent=data.hasMore?'Daftar belum lengkap: pembaca lama dibatasi 50 pesanan. Pesanan lain tidak dihapus; integrasi pembaca berhalaman masih diperlukan.':data.orders.length?'Daftar dibaca dari pesanan akun, bukan dari catatan checkout browser.':'Belum ada pesanan domain pada akun ini.';
 }catch(error){if(!closed){list.replaceChildren();details.replaceChildren();notice.textContent='Daftar belum dapat dibaca. Periksa sesi akun atau layanan. Tidak ada pesanan, pembayaran, atau DNS yang diubah.';}}
 finally{clearTimeout(timer);}
}
