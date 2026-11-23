import React,{useEffect,useId,useRef,useState} from 'react';
import {getVerifiedSession} from './lib/auth-session-v76.js';
import {customerHost} from '../shared/customer-domain-connection.mjs';
import './domain-connect-entry.css';
export default function DomainConnectEntry(props){return <SimpleDomainForm key={String(props.siteId)+'/'+String(props.expectedUserId)} {...props}/>;}
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
   if(!r.ok){const messages={BYOD_SAAS_NOT_CONFIGURED:'Layanan penghubungan domain belum diaktifkan di server.',APEX_CAPABILITY_NOT_CONFIGURED:'Penghubungan alamat ini belum didukung konfigurasi server. Nama domain tidak diubah menjadi www.',LEGACY_DOMAIN_MIGRATION_REQUIRED:'Domain sudah menggunakan konfigurasi lama. Tidak diubah melalui formulir ini.',DOMAIN_ALREADY_CONNECTED_USE_REFRESH:'Domain sudah terhubung. Gunakan Lihat situs pada kartu domain.'};throw Object.assign(Error('SERVER_REJECTED'),{publicMessage:messages[data?.code]||(typeof data?.error==='string'?data.error.slice(0,300):'Permintaan belum berhasil. Lihat daftar domain sebelum mencoba kembali.')});}
   if(!data?.domain?.id||data.domain.site_id!==siteId||data.domain.hostname!==hostname||!['cloudflare','cloudflare-custom-hostnames'].includes(data.domain.provider)||data.requiresNameserverChange!==false)throw Error('OUTCOME_UNKNOWN');
   if(mounted.current&&!c.signal.aborted){setResult(data);setNotice('Domain tersimpan. Anda dapat membuka situs melalui tombol Lihat situs. DNS dan HTTPS mungkin masih dalam proses.');onRefresh?.();}
  }catch(e){if(mounted.current)setNotice(e.message==='SESSION_CHANGED'?'Sesi berubah. Masuk kembali sebelum menghubungkan domain.':e.publicMessage||(sent?'Hasil penghubungan belum dapat dipastikan. Lihat daftar domain sebelum mengulang.':'Permintaan belum dikirim. Silakan masuk dan coba kembali.'));}
  finally{clearTimeout(timer);if(active.current===c)active.current=null;if(mounted.current)setBusy(false);}
 }
 return <section className="sv124-card nd-connect-entry" aria-label="Hubungkan domain pribadi" aria-busy={busy}>
  <h2>Hubungkan domain pribadi</h2>
  <p className="nd-connect-description">Gunakan domain milik Anda. Alamat situs gratis tetap dikelola terpisah.</p>
  <form className="nd-connect-form" onSubmit={submit} noValidate>
   <label className="nd-connect-field" htmlFor={fieldId}><span>Nama domain</span><input id={fieldId} name="custom-domain" type="text" inputMode="url" value={domain} onChange={e=>setDomain(e.target.value)} disabled={busy} placeholder="domain.com" autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} maxLength={253}/></label>
   <button type="submit" className="sv124-primary nd-connect-submit" disabled={busy||!siteId||!expectedUserId||!domain.trim()}>{busy?'Menghubungkan…':'Hubungkan domain'}</button>
  </form>
  <div className="nd-connect-feedback" role="status" aria-live="polite">{notice&&<p>{notice}</p>}</div>
  {result&&<div className="nd-connect-result"><h3>{result.domain.hostname}</h3><a className="sv124-primary" href={'https://'+result.domain.hostname} target="_blank" rel="noopener noreferrer">Lihat situs</a><details><summary>Petunjuk DNS dan HTTPS</summary><ul>{(result.instructions?.records||[]).map((r,i)=><li key={i}><code>{r.type} {r.name} → {r.value}</code></li>)}</ul><pre>{JSON.stringify({ownership:result.domain.ownership_verification||{},sslValidation:result.domain.ssl_validation||[]},null,2)}</pre></details></div>}
 </section>;
}
