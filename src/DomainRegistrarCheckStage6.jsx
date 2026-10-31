import React,{useEffect,useRef,useState} from 'react';
import {getVerifiedSession} from './lib/auth-session-v76.js';
import {expiredRegistrarOfferView} from './lib/registrar-offer-view.mjs';
import {readTimedRegistrarOfferView,registrarOfferClockNow} from './lib/registrar-offer-clock.mjs';
import {watchRegistrarOfferExpiry} from './lib/registrar-offer-expiry.mjs';
import './domain-registrar-check-stage6.css';
const PREVIEW='https://feature-domain-stages5-10-integration-20261030-ngeblogging.triapriyogibahari7.workers.dev';
const messages={secret_missing:'Konfigurasi registrar belum tersedia.',access_denied:'Akses registrar ditolak.',rate_limited:'Batas permintaan tercapai. Coba lagi nanti.',timeout:'Pemeriksaan kehabisan waktu.',network_error:'Koneksi registrar gagal.',invalid_response:'Respons registrar belum dapat divalidasi.',provider_error:'Registrar sedang mengalami gangguan.',redirect_rejected:'Respons pengalihan registrar ditolak.',invalid_clock:'Waktu pemeriksaan belum valid.'};
const restrictions={domain_unavailable:'Domain tidak tersedia.',domain_premium:'Domain premium belum didukung untuk pembelian.',extension_not_supported_via_api:'Ekstensi belum didukung melalui API.',extension_not_supported:'Ekstensi belum didukung.',extension_disallows_registration:'Ekstensi tidak mengizinkan pendaftaran.'};
export default function DomainRegistrarCheckStage6(){
 const [input,setInput]=useState(''),[busy,setBusy]=useState(false),[result,setResult]=useState(null);
 const active=useRef(null);
 useEffect(()=>()=>{active.current?.abort();active.current=null;},[]);
 useEffect(()=>{
  if(!result?.expiresAt)return;
  return watchRegistrarOfferExpiry(result.expiresAt,{clock:()=>registrarOfferClockNow(result,performance.now()),onExpire:()=>setResult(current=>current===result?expiredRegistrarOfferView(result.domain):current)});
 },[result]);
 if(typeof window==='undefined'||window.location.origin!==PREVIEW)return null;
 const offerNow=result?.expiresAt?registrarOfferClockNow(result,performance.now()):null;
 const displayResult=result?.expiresAt&&(!Number.isFinite(offerNow)||Date.parse(result.expiresAt)<=offerNow)?expiredRegistrarOfferView(result.domain):result;
 async function submit(event){
  event.preventDefault();if(active.current)return;
  let domain;
  try{const raw=input.trim().replace(/\.$/,'');if(!raw||/[\s\u0000-\u001f\u007f/\\:@?#%]/u.test(raw))throw Error();domain=new URL('https://'+raw).hostname.toLowerCase();if(domain.length>253||!domain.includes('.'))throw Error();}catch{setResult({message:'Masukkan nama domain lengkap, misalnya nama-domain.com, tanpa protokol atau path.'});return;}
  const controller=new AbortController();active.current=controller;setBusy(true);setResult({domain,message:'Memeriksa ketersediaan dan harga…'});
  const current=()=>active.current===controller&&!controller.signal.aborted;
  const timer=setTimeout(()=>{if(current()){controller.abort();active.current=null;setBusy(false);setResult({domain,message:'Pemeriksaan kehabisan waktu. Belum ada hasil terkonfirmasi.'});}},20000);
  try{
   const auth=await getVerifiedSession({force:true});
   if(!current())return;
   if(auth?.verification!=='verified'||!auth?.user?.id||!auth?.session?.access_token)throw Error();
   const requestStartedAt=performance.now();
   const response=await fetch('/api/admin/registrar/check/'+encodeURIComponent(domain),{method:'POST',redirect:'error',cache:'no-store',credentials:'omit',signal:controller.signal,headers:{Authorization:'Bearer '+auth.session.access_token}});
   if(!current())return;
   if(response.status===401){setResult({domain,message:'Sesi tidak valid. Silakan login kembali.'});return;}
   const data=await response.json();
   if(!current())return;
   const next=await getVerifiedSession({force:true});
   if(!current())return;
   if(next?.verification!=='verified'||next?.user?.id!==auth.user.id)throw Error();
   if(response.status===403){setResult({domain,message:'Pemeriksaan saat ini hanya tersedia untuk admin yang diizinkan.'});return;}
   if(data?.code==='INVALID_DOMAIN'){setResult({domain,message:'Nama domain tidak valid atau merupakan subdomain. Gunakan nama domain utama, misalnya nama-domain.com.'});return;}
   if(data?.code==='AUTH_UNAVAILABLE'){setResult({domain,message:'Layanan verifikasi sesi belum tersedia. Ketersediaan domain belum dapat diperiksa.'});return;}
   if(data?.code==='DIAGNOSTIC_DISABLED'){setResult({domain,message:'Layanan pemeriksaan domain belum dikonfigurasi.'});return;}
   if(data?.code!=='REGISTRAR_CHECK'||data?.domain!==domain||data?.providerId!=='cloudflare')throw Error();
   if(data.lookupOnly!==true||data.purchaseAllowed!==false)throw Error();
   if(!response.ok){setResult({domain,message:messages[data.status]||'Pemeriksaan belum berhasil. Belum ada hasil terkonfirmasi.'});return;}
   if(typeof data.checkedAt!=='string'||!Number.isFinite(Date.parse(data.checkedAt)))throw Error();
   if(data.status==='not_registrable'&&data.registrable===false){setResult({domain,message:restrictions[data.reason]||'Domain belum dapat didaftarkan. Ketersediaan tidak dapat disimpulkan.'});return;}
   if(data.status==='premium_not_supported'&&data.registrable===true&&data.tier==='premium'){setResult({domain,message:'Domain premium terdeteksi. Penawaran standar dan pembelian belum didukung.'});return;}
   setResult(readTimedRegistrarOfferView(data,{domain,requestStartedAt,receivedAt:performance.now()}));
  }catch(error){if(current())setResult({domain,message:['INVALID_INDICATIVE_OFFER_VIEW','INVALID_OFFER_CLOCK'].includes(error?.message)?'Harga belum dapat ditampilkan karena penawaran atau masa berlakunya belum valid. Silakan periksa ulang.':'Sesi, jaringan, atau respons pemeriksaan belum dapat diverifikasi. Tidak ada pembelian dilakukan.'});}
  finally{clearTimeout(timer);if(active.current===controller){active.current=null;setBusy(false);}}
 }
 return <section className="sv124-card sv124-registrar-search" aria-label="Periksa domain" data-stage6-registrar-check="lookup-only"><form onSubmit={submit}><label>Nama domain <input type="text" value={input} onChange={e=>{setInput(e.target.value);setResult(null);}} maxLength={253} placeholder="nama-domain.com" autoComplete="off" spellCheck={false} disabled={busy} required/></label><button type="submit" className="sv124-primary" disabled={busy}>{busy?'Memeriksa…':'Periksa ketersediaan dan harga'}</button></form><div role="status" aria-live="polite" aria-busy={busy}>{displayResult?<><p>{displayResult.domain?<strong>{displayResult.domain}: </strong>:null}{displayResult.message}</p>{displayResult.currency?<><dl><dt>Pendaftaran · 1 tahun</dt><dd>{displayResult.currency} {displayResult.registration}</dd><dt>Perpanjangan · 1 tahun</dt><dd>{displayResult.currency} {displayResult.renewal}</dd></dl><p>Diperiksa: <time dateTime={displayResult.checkedAt}>{new Date(displayResult.checkedAt).toLocaleString('id-ID')}</time>. Berlaku sampai <time dateTime={displayResult.expiresAt}>{new Date(displayResult.expiresAt).toLocaleString('id-ID')}</time>.</p></>:null}</>:null}</div><details><summary>Informasi harga dan batas layanan</summary><p>Periksa satu nama domain lengkap. Daftar saran domain belum tersedia di formulir ini. Harga sementara bukan tagihan final; pajak, transfer, dan kelayakan pendaftar belum diperiksa. Pembelian belum diaktifkan dan hasil pemeriksaan tidak menghubungkan domain ke situs.</p></details></section>;
}
