import React,{useEffect,useRef,useState} from 'react';
import {getVerifiedSession} from './lib/auth-session-v76.js';
import {normalizePurchaseDomain} from './domain-purchase-model.mjs';
import {applyDomainInstructions,assignedNameservers} from './lib/domain-panel-result.mjs';
import './domain-connect-entry.css';
export default function DomainConnectEntry({siteId,expectedUserId,onRefresh}){
 const [open,setOpen]=useState(false),[hostname,setHostname]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[result,setResult]=useState(null);
 const active=useRef(null),mounted=useRef(false);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;active.current?.abort();};},[]);
 async function submit(event){
  event.preventDefault();if(active.current)return;setNotice('');setResult(null);
  if(!siteId||!expectedUserId){setNotice('Pilih situs dan masuk dengan akun pengelolanya terlebih dahulu.');return;}
  let domain;try{domain=normalizePurchaseDomain(hostname.trim().replace(/^www\./i,''));if(domain==='ngeblogging.com'||domain.endsWith('.ngeblogging.com'))throw Error();}catch{setNotice('Masukkan domain pribadi tanpa https://, www, port, atau path.');return;}
  const controller=new AbortController();active.current=controller;setBusy(true);
  const stopped=new Promise((_,reject)=>controller.signal.addEventListener('abort',()=>reject(Error('CONNECT_UNCONFIRMED')),{once:true}));
  const wait=value=>Promise.race([value,stopped]),timer=setTimeout(()=>controller.abort(),45000);
  try{
   const auth=await wait(getVerifiedSession({force:true}));
   if(auth?.verification!=='verified'||auth.user?.id!==expectedUserId||!auth.session?.access_token)throw Error('SESSION_CHANGED');
   const response=await wait(fetch('/api/domains/register',{method:'POST',redirect:'error',cache:'no-store',credentials:'same-origin',signal:controller.signal,headers:{accept:'application/json','content-type':'application/json',authorization:'Bearer '+auth.session.access_token},body:JSON.stringify({siteId,hostname:domain})}));
   if(!/^application\/json(?:\s*;.*)?$/i.test(response.headers.get('content-type')||''))throw Error('CONNECT_UNCONFIRMED');
   const text=await wait(response.text());if(text.length>65536)throw Error('CONNECT_UNCONFIRMED');
   let payload;try{payload=JSON.parse(text);}catch{throw Error('CONNECT_UNCONFIRMED');}
   if(!response.ok){const code=typeof payload?.code==='string'&&/^[A-Z][A-Z0-9_]{0,79}$/.test(payload.code)?payload.code:'CONNECT_REJECTED';throw Object.assign(Error(code),{publicMessage:typeof payload?.error==='string'?payload.error.slice(0,300):''});}
   const value=applyDomainInstructions(payload,siteId),row=value?.domain;
   if(!row?.id||row.site_id!==siteId||row.hostname!==domain)throw Error('CONNECT_UNCONFIRMED');
   if(!mounted.current||controller.signal.aborted)return;
   setResult(row);setNotice('Permintaan penghubungan domain diterima server. DNS, routing, dan HTTPS belum dinyatakan aktif oleh aksi ini.');onRefresh?.();
  }catch(error){if(mounted.current){const code=/^[A-Z][A-Z0-9_]{0,79}$/.test(error?.message||'')?error.message:'CONNECT_UNCONFIRMED';setNotice(code==='SESSION_CHANGED'?'Sesi atau akun berubah. Tidak ada permintaan pemasangan yang dikirim.':code==='CONNECT_UNCONFIRMED'?'Hasil belum dapat diverifikasi. Periksa daftar domain yang sama sebelum mengulang; jangan menganggap pemasangan gagal atau sudah aktif.':(error.publicMessage||'Server belum menerima penghubungan domain.')+' Kode: '+code+'.');}}
  finally{clearTimeout(timer);if(active.current===controller)active.current=null;if(mounted.current)setBusy(false);}
 }
 const ns=assignedNameservers(result?.ownership_verification?.required_name_servers);
 return <section className="sv124-card nd-connect-entry" aria-label="Hubungkan domain pribadi" aria-busy={busy}>
  <h2>Hubungkan domain pribadi</h2><p>Hubungkan domain yang sudah Anda miliki ke situs aktif. Aksi ini bukan pembelian domain atau pembayaran.</p>
  <button type="button" className="sv124-primary" disabled={busy||!siteId} aria-expanded={open} onClick={()=>setOpen(value=>!value)}>{open?'Tutup formulir domain':'Hubungkan domain pribadi'}</button>
  {!siteId&&<p role="status">Pilih situs aktif terlebih dahulu.</p>}
  {open&&<form onSubmit={submit} noValidate><label>Nama domain<input value={hostname} onChange={event=>setHostname(event.target.value)} disabled={busy} inputMode="url" autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder="domainanda.com" maxLength={253}/></label><p>Tanpa https://, www, port, atau path. Server memeriksa hak pengelolaan situs.</p><button type="submit" className="sv124-primary" disabled={busy}>{busy?'Menghubungkan…':'Kirim penghubungan domain'}</button></form>}
  <p role="status" aria-live="polite">{notice}</p>
  {result&&<div><h3>{result.hostname}</h3>{ns.length>=2?<><p>Nameserver dari respons server untuk domain ini:</p><ul>{ns.map(value=><li key={value}><code>{value}</code></li>)}</ul></>:<p>Nameserver belum tersedia lengkap. Periksa daftar domain sebelum mengubah DNS.</p>}</div>}
  <button type="button" className="sv124-secondary" disabled={busy||!siteId} onClick={()=>onRefresh?.()}>Periksa daftar domain</button>
 </section>;
}
