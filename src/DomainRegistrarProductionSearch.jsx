import React,{useEffect,useRef,useState} from 'react';
import {getVerifiedSession} from './lib/auth-session-v76.js';
import {expiredRegistrarOfferView} from './lib/registrar-offer-view.mjs';
import {readTimedRegistrarOfferView,registrarOfferClockNow} from './lib/registrar-offer-clock.mjs';
import {normalizeRegistrarSearchInput,readRegistrarSearchView} from './lib/registrar-search-view.mjs';
import {watchRegistrarOfferExpiry} from './lib/registrar-offer-expiry.mjs';
import DomainCatalogStage6 from './DomainCatalogStage6.jsx';
import {prepareCatalogDomain} from './lib/domain-catalog-stage6.mjs';
import './domain-registrar-check-stage6.css';
const HOSTS=new Set(['https://ngeblogging.com','https://www.ngeblogging.com']);
const expired=result=>result?.candidates?{domain:result.domain,message:'Hasil pencarian sudah kedaluwarsa. Cari ulang untuk hasil terbaru.'}:expiredRegistrarOfferView(result.domain);
export default function DomainRegistrarProductionSearch({user,siteId}){
 const [input,setInput]=useState(''),[busy,setBusy]=useState(false),[result,setResult]=useState(null),active=useRef(null);
 useEffect(()=>()=>{active.current?.abort();active.current=null;},[]);
 useEffect(()=>{if(result?.expiresAt)return watchRegistrarOfferExpiry(result.expiresAt,{clock:()=>registrarOfferClockNow(result,performance.now()),onExpire:()=>setResult(current=>current===result?expired(result):current)});},[result]);
 if(typeof window==='undefined'||!HOSTS.has(window.location.origin))return null;
 const now=result?.expiresAt?registrarOfferClockNow(result,performance.now()):null;
 const shown=result?.expiresAt&&(!Number.isFinite(now)||Date.parse(result.expiresAt)<=now)?expired(result):result;
 async function submit(event,{value=input,search=false}={}){
  event.preventDefault();if(active.current)return;
  let domain;
  try{
   if(search)domain=normalizeRegistrarSearchInput(value);
   else{const raw=value.trim().replace(/\.$/,'');if(!raw||/[\s\u0000-\u001f\u007f/\\:@?#%]/u.test(raw))throw Error();domain=new URL('https://'+raw).hostname.toLowerCase();if(domain.length>253||!domain.includes('.'))throw Error();}
  }catch{setResult({message:search?'Masukkan kata kunci tanpa protokol atau path, maksimal 100 karakter.':'Masukkan nama domain lengkap, misalnya nama-domain.com.'});return;}
  const controller=new AbortController();active.current=controller;setBusy(true);setResult({domain,message:search?'Mencari kandidat dari registrar…':'Memeriksa ketersediaan dan harga…'});
  const current=()=>active.current===controller&&!controller.signal.aborted;
  const timer=setTimeout(()=>{if(current()){controller.abort();active.current=null;setBusy(false);setResult({domain,message:'Pemeriksaan kehabisan waktu. Belum ada hasil terkonfirmasi.'});}},20000);
  try{
   const auth=await getVerifiedSession({force:true});if(!current())return;
   if(auth?.verification!=='verified'||auth?.user?.id!==user?.id||!auth?.session?.access_token||!siteId)throw Error();
   const started=performance.now();
   const response=await fetch('/api/domains/registrar/'+(search?'search/':'check/')+encodeURIComponent(domain),{method:'POST',redirect:'error',cache:'no-store',credentials:'omit',signal:controller.signal,headers:{Authorization:'Bearer '+auth.session.access_token,'x-site-id':siteId}});
   if(!current())return;
   const data=await response.json();const next=await getVerifiedSession({force:true});if(!current())return;
   if(next?.verification!=='verified'||next?.user?.id!==auth.user.id)throw Error();
   if(response.status===401){setResult({domain,message:'Sesi tidak valid. Silakan masuk kembali.'});return;}
   if(response.status===403){setResult({domain,message:'Pemeriksaan hanya tersedia untuk pemilik situs aktif dengan sesi terverifikasi.'});return;}
   if(response.status===429){setResult({domain,message:'Batas pemeriksaan tercapai atau permintaan lain masih berjalan. Coba kembali nanti.'});return;}
   if(data?.code==='INVALID_DOMAIN'||data?.code==='INVALID_SEARCH_QUERY'){setResult({domain,message:'Nama domain atau kata kunci belum valid. Gunakan nama domain utama tanpa protokol atau path.'});return;}
   if(!response.ok){setResult({domain,message:data?.status==='secret_missing'?'Konfigurasi registrar produksi belum tersedia.':data?.status==='access_denied'?'Akses registrar produksi ditolak.':data?.status==='rate_limited'?'Batas permintaan registrar tercapai. Coba kembali nanti.':'Pemeriksaan produksi belum berhasil. Ketersediaan dan harga belum terkonfirmasi.'});return;}
   if(data?.providerId!=='cloudflare'||data?.lookupOnly!==true||data?.purchaseAllowed!==false||data.code!==(search?'REGISTRAR_SEARCH':'REGISTRAR_CHECK'))throw Error();
   if(search){if(data.query!==domain)throw Error();setResult(readRegistrarSearchView(data,{query:domain,requestStartedAt:started,receivedAt:performance.now()}));return;}
   if(data.domain!==domain)throw Error();
   if(data.status==='not_registrable'&&data.registrable===false){setResult({domain,message:data.reason==='domain_unavailable'?'Domain tidak tersedia menurut pemeriksaan registrar saat ini.':'Pendaftaran ekstensi ini belum didukung atau masih dibatasi registrar. Ini bukan bukti domain sudah terdaftar.'});return;}
   if(data.status==='premium_not_supported'){setResult({domain,message:'Domain premium terdeteksi; penawaran standar belum didukung.'});return;}
   setResult(readTimedRegistrarOfferView(data,{domain,requestStartedAt:started,receivedAt:performance.now()}));
  }catch{if(current())setResult({domain,message:'Sesi, jaringan, atau masa berlaku hasil belum dapat diverifikasi. Tidak ada pembelian dilakukan.'});}
  finally{clearTimeout(timer);if(active.current===controller){active.current=null;setBusy(false);}}
 }
 return <section className="sv124-card sv124-registrar-search" aria-label="Periksa domain" data-stage6-registrar-check="lookup-only" data-domain-production-registrar-search="lookup-only"><form onSubmit={submit}><label>Nama domain atau kata kunci <input type="text" value={input} onChange={e=>{setInput(e.target.value);setResult(null);}} maxLength={253} placeholder="nama-domain.com atau nama blog" autoComplete="off" spellCheck={false} disabled={busy} required/></label><button type="submit" className="sv124-primary" disabled={busy}>{busy?'Memproses…':'Periksa ketersediaan dan harga'}</button><button type="button" className="sv124-primary" disabled={busy||!input.trim()} onClick={event=>submit(event,{search:true})}>Cari alternatif (maks. 50)</button></form><DomainCatalogStage6 disabled={busy} onSelect={extension=>{const value=prepareCatalogDomain(input,extension);if(value)setInput(value);setResult({message:'Ekstensi .'+extension+' dipilih. Periksa kembali nama domain untuk hasil terbaru.'});}}/><div role="status" aria-live="polite" aria-busy={busy}>{shown?<><p>{shown.domain?<strong>{shown.domain}: </strong>:null}{shown.message}</p>{shown.candidates?<ul>{shown.candidates.map(candidate=><li key={candidate.domain}><p><strong>{candidate.domain}</strong> — {candidate.status}{candidate.premium?' · Premium':''}</p>{candidate.prices?<p>Harga pencarian sementara · Pendaftaran 1 tahun: {candidate.prices.currency} {candidate.prices.registration} · Perpanjangan 1 tahun: {candidate.prices.currency} {candidate.prices.renewal}. Pajak belum diketahui.</p>:null}{candidate.canCheck?<button type="button" className="sv124-primary" disabled={busy} onClick={event=>{setInput(candidate.domain);submit(event,{value:candidate.domain});}}>Periksa harga</button>:null}</li>)}</ul>:null}{shown.currency?<><dl><dt>Pendaftaran · 1 tahun</dt><dd>{shown.currency} {shown.registration}</dd><dt>Perpanjangan · 1 tahun</dt><dd>{shown.currency} {shown.renewal}</dd></dl><p>Diperiksa: <time dateTime={shown.checkedAt}>{new Date(shown.checkedAt).toLocaleString('id-ID')}</time>. Berlaku sampai <time dateTime={shown.expiresAt}>{new Date(shown.expiresAt).toLocaleString('id-ID')}</time>.</p></>:null}</>:null}</div><details><summary>Informasi harga dan batas layanan</summary><p>Periksa satu nama domain lengkap atau cari alternatif dari kata kunci, maksimal 50 kandidat sesuai dukungan registrar. Hasil pencarian dan harga bersifat sementara, harus diperiksa ulang, dan bukan tagihan final. Pemeriksaan ini tidak melakukan pembelian atau menghubungkan domain ke situs. Checkout dan status pesanan tetap menggunakan alur terpisah di halaman ini.</p></details></section>;
}
