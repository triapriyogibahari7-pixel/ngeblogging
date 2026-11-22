import React,{useEffect,useId,useRef,useState} from 'react';
import {getVerifiedSession} from './lib/auth-session-v76.js';
import {customerHost} from '../shared/customer-domain-connection.mjs';
import {assignedNameservers} from './lib/domain-panel-result.mjs';
import {DOMAIN_CONNECTION_ANNUAL_LABEL} from '../shared/domain-connection-annual-price.mjs';
import './domain-connect-entry.css';
export default function DomainConnectEntry(props){return <FullZoneForm key={String(props.siteId)+'/'+String(props.expectedUserId)} {...props}/>;}
function FullZoneForm({siteId,expectedUserId,onRefresh}){
 const fieldId=useId(),[domain,setDomain]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[result,setResult]=useState(null);
 const active=useRef(null),mounted=useRef(false);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;active.current?.abort();};},[]);
 async function submit(event){
  event.preventDefault();if(active.current)return;setNotice('');
  if(!siteId||!expectedUserId){setNotice('Pilih situs dan masuk terlebih dahulu.');return;}
  let hostname;try{hostname=customerHost(domain);if(hostname.startsWith('www.'))throw Error();}catch{setNotice('Masukkan domain utama tanpa https://, www, port, atau alamat halaman. Alamat gratis Ngeblogging dikelola terpisah.');return;}
  const c=new AbortController();active.current=c;setBusy(true);setResult(null);let sent=false;
  const stopped=new Promise((_,reject)=>c.signal.addEventListener('abort',()=>reject(Error('OUTCOME_UNKNOWN')),{once:true})),wait=value=>Promise.race([value,stopped]),timer=setTimeout(()=>c.abort(),45000);
  try{
   const auth=await wait(getVerifiedSession({force:true}));
   if(auth?.verification!=='verified'||auth.user?.id!==expectedUserId||!auth.session?.access_token)throw Error('SESSION_CHANGED');
   if(c.signal.aborted)throw Error('OUTCOME_UNKNOWN');
   sent=true;const response=await wait(fetch('/api/domains/connection-checkout',{method:'POST',redirect:'error',cache:'no-store',credentials:'same-origin',signal:c.signal,headers:{accept:'application/json',authorization:'Bearer '+auth.session.access_token,'content-type':'application/json'},body:JSON.stringify({siteId,hostname})}));
   if(!response.headers.get('content-type')?.includes('application/json'))throw Error('OUTCOME_UNKNOWN');
   const text=await wait(response.text());if(text.length>65536)throw Error('OUTCOME_UNKNOWN');const payload=JSON.parse(text);
   if(!response.ok)throw Object.assign(Error('SERVER_REJECTED'),{publicMessage:typeof payload.error==='string'?payload.error.slice(0,300):'Penghubungan belum berhasil. Periksa daftar domain sebelum mencoba kembali.'});
   // Live checkout is deliberately unavailable until verified billing is integrated.
   throw Object.assign(Error('CHECKOUT_NOT_READY'),{publicMessage:'Checkout tahunan belum tersedia. Tidak ada pembayaran yang diproses.'});
  }catch(error){if(mounted.current)setNotice(error.message==='SESSION_CHANGED'?'Sesi berubah. Masuk kembali sebelum menghubungkan domain.':error.publicMessage||(sent?'Hasil penghubungan belum dapat dipastikan. Muat ulang daftar domain sebelum mengulang.':'Permintaan belum dikirim. Silakan masuk dan coba kembali.'));}
  finally{clearTimeout(timer);if(active.current===c)active.current=null;if(mounted.current)setBusy(false);}
 }
 const ns=assignedNameservers(result?.domain?.ownership_verification?.required_name_servers);
 return <section className="sv124-card nd-connect-entry" aria-label="Hubungkan domain pribadi" aria-busy={busy}>
  <h2>Hubungkan domain pribadi</h2>
  <p className="nd-connect-description">Hubungkan domain milik Anda ke situs aktif melalui Cloudflare for SaaS. Alamat gratis tetap tersedia.</p>
  <form className="nd-connect-form" onSubmit={submit} noValidate>
   <label className="nd-connect-field" htmlFor={fieldId}><span>Nama domain utama</span><input id={fieldId} name="custom-domain" type="text" inputMode="url" value={domain} onChange={event=>setDomain(event.target.value)} disabled={busy} placeholder="domainanda.com" autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} maxLength={253}/></label>
   <p>{DOMAIN_CONNECTION_ANNUAL_LABEL}, mencakup domain utama dan www. Dibayar untuk 12 bulan; tidak diperpanjang otomatis. Tidak termasuk pembelian atau perpanjangan nama domain. Pembayaran melalui Midtrans; checkout belum tersedia.</p>
   <button type="submit" className="sv124-primary nd-connect-submit" disabled={busy||!siteId||!expectedUserId||!domain.trim()}>{busy?'Menghubungkan…':'Hubungkan domain'}</button>
  </form>
  <div className="nd-connect-feedback" role="status" aria-live="polite">{notice&&<p>{notice}</p>}</div>
  {result&&<div className="nd-connect-result"><h3>{result.domain.hostname}</h3>{ns.length>=2?<><p>Nameserver resmi untuk domain ini:</p><ul>{ns.map(value=><li key={value}><code>{value}</code></li>)}</ul><p>Pasang nilai ini di registrar setelah memeriksa record DNS, lalu gunakan Periksa koneksi pada kartu domain.</p></>:<p>Nameserver belum tersedia lengkap. Jangan mengganti DNS menggunakan nilai tebakan. Muat ulang daftar lalu gunakan Periksa koneksi.</p>}</div>}
 </section>;
}
