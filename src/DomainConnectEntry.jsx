import React,{useEffect,useId,useRef,useState} from 'react';
import {getVerifiedSession} from './lib/auth-session-v76.js';
import {customerHost} from '../shared/customer-domain-connection.mjs';
import './domain-connect-entry.css';
export default function DomainConnectEntry(props){return <SimpleDomainForm key={String(props.siteId)+'/'+String(props.expectedUserId)} {...props}/>;}
function CopyValue({value}){
 const [notice,setNotice]=useState('');
 return <span><code style={{overflowWrap:'anywhere'}}>{value}</code> <button type="button" onClick={async()=>{try{await navigator.clipboard.writeText(String(value));setNotice('Tersalin');}catch{setNotice('Tidak dapat menyalin otomatis. Pilih teks dan salin manual.');}}}>Salin</button><span role="status"> {notice}</span></span>;
}
function DnsGuide({result}){
 const [provider,setProvider]=useState('general'),[zone,setZone]=useState(result.dnsZone||'');
 let root='';try{root=customerHost(zone);}catch{}
 const ownership=result.domain.ownership_verification||{};
 const ssl=Array.isArray(result.domain.ssl_validation)?result.domain.ssl_validation:[];
 const rows=[...(result.instructions?.records||[]).map(r=>({...r,purpose:'Mengarahkan pengunjung ke situs'})),...(ownership.name&&ownership.value?[{type:ownership.type||'TXT',name:ownership.name,value:ownership.value,purpose:'Membuktikan kepemilikan alamat'}]:[]),...ssl.filter(r=>r?.txt_name&&r?.txt_value).map(r=>({type:'TXT',name:r.txt_name,value:r.txt_value,purpose:'Mengaktifkan sertifikat HTTPS'}))];
 const shortName=name=>{const n=String(name||'').replace(/\.$/,'');return root&&(n===root||n.endsWith('.'+root))?(n===root?'@':n.slice(0,-root.length-1)):n;};
 const ready=result.domain.status==='active'&&result.domain.provider_status==='active'&&result.domain.ssl_status==='active'&&result.publicSiteVerified===true&&result.siteContentVerified===true;
 return <div className="nd-connect-result">
  <h3>Pasang DNS untuk {result.domain.hostname}</h3>
  <p>Pengaturan dilakukan di penyedia DNS domain Anda, bukan di server hosting Ngeblogging. Untuk alur ini, tidak perlu mengganti nameserver atau membuat akun Cloudflare.</p>
  <label>Panduan penyedia DNS <select value={provider} onChange={e=>setProvider(e.target.value)}><option value="general">Penyedia lain / belum tahu</option><option value="domainesia">DomaiNesia</option></select></label>
  <ol>
   <li>{provider==='domainesia'?'Masuk ke MyDomaiNesia → Domains → pilih domain → DNS Management. Jangan isi record pada menu Nameserver.':'Masuk ke panel penyedia DNS aktif domain, lalu buka DNS Management, DNS Records, atau Zone Editor. Jangan mengganti nameserver untuk mengikuti panduan ini.'}</li>
   <li>Tambahkan record pada tabel satu per satu. Jika record pengarah sudah ada, edit record yang sesuai; jangan membuat CNAME lain pada nama yang sama. Jangan menghapus record email.</li>
   <li>Simpan perubahan. Gunakan TTL bawaan; Priority tidak diperlukan untuk CNAME atau TXT.</li>
   <li>Periksa status melalui kartu domain setelah DNS tersimpan. DNS dan HTTPS diperiksa terpisah; domain tersimpan belum berarti situs siap.</li>
  </ol>
  <label>Domain utama pada panel DNS <input value={zone} onChange={e=>setZone(e.target.value)} autoCapitalize="none" autoCorrect="off" spellCheck={false}/></label>
  <p>Contoh: contoh.com, bukan www.contoh.com. Kolom Host Name di bawah menggunakan nama pendek bila record berada di bawah domain utama ini. Jika panel meminta nama lengkap, gunakan kolom Nama lengkap. Pastikan akhiran domain tidak ditambahkan dua kali.</p>
  <div style={{overflowX:'auto'}}><table><caption>Record DNS yang harus dipasang</caption><thead><tr><th>Jenis</th><th>Host Name / Nama</th><th>Nama lengkap</th><th>Value / Address / Target</th><th>Kegunaan</th></tr></thead><tbody>{rows.map((r,i)=><tr key={i}><td>{String(r.type).toUpperCase()}</td><td><CopyValue value={shortName(r.name)}/></td><td><CopyValue value={r.name}/></td><td><CopyValue value={r.value}/></td><td>{r.purpose}</td></tr>)}</tbody></table></div>
  <h4>Status HTTPS</h4>
  <p>{result.domain.ssl_status==='active'?'Sertifikat dilaporkan aktif oleh provider.':'Sertifikat HTTPS belum dilaporkan aktif.'}</p>
  {result.domain.ssl_status!=='active'&&!ssl.some(r=>r?.txt_name&&r?.txt_value)&&<p>Petunjuk validasi HTTPS belum tersedia pada respons ini. Ini bukan tanda HTTPS sudah siap. Periksa status terbaru melalui kartu domain; jangan membuat token sendiri atau menghapus lalu mendaftarkan ulang domain.</p>}
  {ssl.some(r=>r?.txt_name&&r?.txt_value)&&<p>Jika beberapa TXT memiliki nama sama, tambahkan semua nilainya sebagai record terpisah. TXT kepemilikan berbeda dari TXT sertifikat HTTPS.</p>}
  <p>Alamat yang didaftarkan dikelola sebagai Custom Hostname pada layanan Cloudflare Ngeblogging. Pelanggan tidak perlu memasangnya sebagai domain Worker. Nama pemilik situs dikelola di Ngeblogging, bukan melalui nilai DNS.</p>
  {ready?<a className="sv124-primary" href={'https://'+result.domain.hostname} target="_blank" rel="noopener noreferrer">Lihat situs</a>:<p>Tombol Lihat situs tersedia setelah HTTPS dan situs tujuan terverifikasi.</p>}
 </div>;
}
function SimpleDomainForm({siteId,expectedUserId,onRefresh}){
 const fieldId=useId(),[domain,setDomain]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[result,setResult]=useState(null);
 const active=useRef(null),mounted=useRef(false);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;active.current?.abort();};},[]);
 async function submit(event){
  event.preventDefault();if(active.current)return;setNotice('');
  if(!siteId||!expectedUserId){setNotice('Pilih situs dan masuk terlebih dahulu.');return;}
  let request,hostname;try{hostname=customerHost(domain);const www=hostname.startsWith('www.');request={siteId,domain:www?hostname.slice(4):hostname,mode:www?'subdomain':'apex',...(www?{label:'www'}:{})};}catch{setNotice('Masukkan nama domain tanpa https://, port, atau alamat halaman. Alamat gratis *.ngeblogging.com dikelola terpisah.');return;}
  const c=new AbortController();active.current=c;setBusy(true);setResult(null);let sent=false;
  const stopped=new Promise((_,reject)=>c.signal.addEventListener('abort',()=>reject(Error('OUTCOME_UNKNOWN')),{once:true})),wait=value=>Promise.race([value,stopped]),timer=setTimeout(()=>c.abort(),45000);
  try{
   const auth=await wait(getVerifiedSession({force:true}));
   if(auth?.verification!=='verified'||auth.user?.id!==expectedUserId||!auth.session?.access_token)throw Error('SESSION_CHANGED');
   if(c.signal.aborted)throw Error('OUTCOME_UNKNOWN');
   sent=true;const r=await wait(fetch('/api/domains/connect-existing',{method:'POST',redirect:'error',cache:'no-store',credentials:'same-origin',signal:c.signal,headers:{accept:'application/json',authorization:'Bearer '+auth.session.access_token,'content-type':'application/json'},body:JSON.stringify(request)}));
   if(!r.headers.get('content-type')?.includes('application/json'))throw Error('OUTCOME_UNKNOWN');
   const text=await wait(r.text());if(text.length>65536)throw Error('OUTCOME_UNKNOWN');const data=JSON.parse(text);
   if(!r.ok){const messages={BYOD_SAAS_NOT_CONFIGURED:'Layanan penghubungan domain belum diaktifkan di server.',APEX_CAPABILITY_NOT_CONFIGURED:'Penghubungan alamat ini belum didukung konfigurasi server. Nama domain tidak diubah menjadi www.',LEGACY_DOMAIN_MIGRATION_REQUIRED:'Domain sudah menggunakan konfigurasi lama. Tidak diubah melalui formulir ini.',DOMAIN_ALREADY_CONNECTED_USE_REFRESH:'Domain sudah tercatat. Periksa status DNS dan SSL pada kartu domain; jangan menghubungkan ulang.'};throw Object.assign(Error('SERVER_REJECTED'),{publicMessage:messages[data?.code]||(typeof data?.error==='string'?data.error.slice(0,300):'Permintaan belum berhasil. Lihat daftar domain sebelum mencoba kembali.')});}
   if(!data?.domain?.id||data.domain.site_id!==siteId||data.domain.hostname!==hostname||!['cloudflare','cloudflare-custom-hostnames'].includes(data.domain.provider)||data.requiresNameserverChange!==false)throw Error('OUTCOME_UNKNOWN');
   if(mounted.current&&!c.signal.aborted){setResult({...data,dnsZone:request.domain});setNotice('Domain tersimpan. Ikuti panduan DNS di bawah; belum berarti HTTPS dan situs siap.');onRefresh?.();}
  }catch(e){if(mounted.current)setNotice(e.message==='SESSION_CHANGED'?'Sesi berubah. Masuk kembali sebelum menghubungkan domain.':e.publicMessage||(sent?'Hasil penghubungan belum dapat dipastikan. Lihat daftar domain sebelum mengulang.':'Permintaan belum dikirim. Silakan masuk dan coba kembali.'));}
  finally{clearTimeout(timer);if(active.current===c)active.current=null;if(mounted.current)setBusy(false);}
 }
 return <section className="sv124-card nd-connect-entry" aria-label="Hubungkan domain pribadi" aria-busy={busy}>
  <h2>Hubungkan domain pribadi</h2><p className="nd-connect-description">Gunakan domain milik Anda. DNS tetap di penyedia Anda; tidak perlu pindah nameserver.</p>
  <form className="nd-connect-form" onSubmit={submit} noValidate><label className="nd-connect-field" htmlFor={fieldId}><span>Nama domain</span><input id={fieldId} name="custom-domain" type="text" inputMode="url" value={domain} onChange={e=>setDomain(e.target.value)} disabled={busy} placeholder="www.domain.com" autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} maxLength={253}/></label><button type="submit" className="sv124-primary nd-connect-submit" disabled={busy||!siteId||!expectedUserId||!domain.trim()}>{busy?'Menghubungkan…':'Hubungkan domain'}</button></form>
  <div className="nd-connect-feedback" role="status" aria-live="polite">{notice&&<p>{notice}</p>}</div>
  {result&&<DnsGuide key={result.domain.id} result={result}/>}
 </section>;
}
