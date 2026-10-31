import React,{useEffect,useRef,useState} from 'react';
import {getVerifiedSession} from './lib/auth-session-v76.js';
import './domain-registrar-check-stage6.css';
const PREVIEW='https://feature-domain-stages5-10-integration-20261030-ngeblogging.triapriyogibahari7.workers.dev';
const messages={secret_missing:'Konfigurasi registrar belum tersedia.',access_denied:'Akses registrar ditolak.',rate_limited:'Batas permintaan tercapai. Coba lagi nanti.',timeout:'Pemeriksaan kehabisan waktu.',network_error:'Koneksi registrar gagal.',invalid_response:'Respons registrar belum dapat divalidasi.',provider_error:'Registrar sedang mengalami gangguan.',redirect_rejected:'Respons pengalihan registrar ditolak.',invalid_clock:'Waktu pemeriksaan belum valid.'};
const restrictions={domain_unavailable:'Domain tidak tersedia.',domain_premium:'Domain premium belum didukung untuk pembelian.',extension_not_supported_via_api:'Ekstensi belum didukung melalui API.',extension_not_supported:'Ekstensi belum didukung.',extension_disallows_registration:'Ekstensi tidak mengizinkan pendaftaran.'};
export default function DomainRegistrarCheckStage6(){
 const [input,setInput]=useState(''),[busy,setBusy]=useState(false),[result,setResult]=useState(null);
 const active=useRef(null);
 useEffect(()=>()=>{active.current?.abort();active.current=null;},[]);
 if(typeof window==='undefined'||window.location.origin!==PREVIEW)return null;
 async function submit(event){
  event.preventDefault();if(active.current)return;
  let domain;
  try{const raw=input.trim().replace(/\.$/,'');if(!raw||/[\s\u0000-\u001f\u007f/\\:@?#%]/u.test(raw))throw Error();domain=new URL('https://'+raw).hostname.toLowerCase();if(domain.length>253||!domain.includes('.'))throw Error();}catch{setResult({message:'Masukkan nama domain lengkap tanpa protokol atau path.'});return;}
  const controller=new AbortController();active.current=controller;setBusy(true);setResult(null);
  const current=()=>active.current===controller&&!controller.signal.aborted;
  const timer=setTimeout(()=>{if(current()){controller.abort();active.current=null;setBusy(false);setResult({message:'Pemeriksaan kehabisan waktu. Belum ada hasil terkonfirmasi.'});}},20000);
  try{
   const auth=await getVerifiedSession({force:true});
   if(!current())return;
   if(auth?.verification!=='verified'||!auth?.user?.id||!auth?.session?.access_token)throw Error();
   const response=await fetch('/api/admin/registrar/check/'+encodeURIComponent(domain),{method:'POST',redirect:'error',cache:'no-store',credentials:'omit',signal:controller.signal,headers:{Authorization:'Bearer '+auth.session.access_token}});
   if(!current())return;
   if(response.status===401){setResult({message:'Sesi tidak valid. Silakan login kembali.'});return;}
   const data=await response.json();
   const next=await getVerifiedSession({force:true});
   if(!current())return;
   if(next?.verification!=='verified'||next?.user?.id!==auth.user.id)throw Error();
   if(response.status===403){setResult({message:'Pemeriksaan preview ini hanya tersedia untuk admin yang diizinkan.'});return;}
   if(data?.code==='INVALID_DOMAIN'){setResult({message:'Nama domain tidak valid atau merupakan subdomain.'});return;}
   if(data?.code!=='REGISTRAR_CHECK'||data?.domain!==domain)throw Error();
   if(data.lookupOnly!==true||data.purchaseAllowed!==false)throw Error();
   if(!response.ok){setResult({domain,message:messages[data.status]||'Pemeriksaan belum berhasil. Belum ada hasil terkonfirmasi.'});return;}
   if(typeof data.checkedAt!=='string'||!Number.isFinite(Date.parse(data.checkedAt)))throw Error();
   if(data.status==='not_registrable'&&data.registrable===false){setResult({domain,message:restrictions[data.reason]||'Domain belum dapat didaftarkan. Ketersediaan tidak dapat disimpulkan.'});return;}
   if(!['checked','premium_not_supported'].includes(data.status)||data.registrable!==true)throw Error();
   if((data.status==='checked'&&data.tier!=='standard')||(data.status==='premium_not_supported'&&data.tier!=='premium')||data.mustRecheckBeforePurchase!==true)throw Error();
   const p=data.prices,valid=v=>typeof v==='string'&&/^(?:0|[1-9]\d{0,11})(?:\.\d{1,6})?$/.test(v);
   if(!/^[A-Z]{3}$/.test(p?.currency||'')||!valid(p?.registration?.amount)||!valid(p?.renewal?.amount)||p.registration.termYears!==1||p.renewal.termYears!==1)throw Error();
   setResult({domain,message:data.status==='checked'?'Domain dapat didaftarkan menurut pemeriksaan saat ini.':'Domain premium terdeteksi. Pembelian belum didukung.',currency:p.currency,registration:p.registration.amount,renewal:p.renewal.amount});
  }catch{if(current())setResult({message:'Sesi atau respons pemeriksaan belum dapat diverifikasi. Tidak ada pembelian dilakukan.'});}
  finally{clearTimeout(timer);if(active.current===controller){active.current=null;setBusy(false);}}
 }
 return <section className="sv124-page sv124-domain-page" aria-label="Pencarian domain preview" data-stage6-registrar-check="lookup-only"><article className="sv124-card"><header><small>PREVIEW ADMIN · PEMERIKSAAN SAJA</small><h2>Cari domain untuk situsmu</h2><p>Periksa ketersediaan dan harga indikatif. Situs gratis di atas tetap dapat digunakan.</p></header><form onSubmit={submit}><label>Nama domain <input type="text" value={input} onChange={e=>{setInput(e.target.value);setResult(null);}} maxLength={253} placeholder="nama-domain.com" autoComplete="off" spellCheck={false} disabled={busy} required/></label><button type="submit" className="sv124-secondary" disabled={busy}>{busy?'Memeriksa…':'Periksa ketersediaan dan harga'}</button></form><div role="status" aria-live="polite" aria-busy={busy}>{result?<><p>{result.domain?<strong>{result.domain}: </strong>:null}{result.message}</p>{result.currency?<dl><dt>Pendaftaran · 1 tahun</dt><dd>{result.currency} {result.registration}</dd><dt>Perpanjangan · 1 tahun</dt><dd>{result.currency} {result.renewal}</dd></dl>:null}</>:null}</div><p>Harga bukan tagihan final dan harus diperiksa ulang sebelum transaksi. Pajak, biaya transfer, dan kelayakan pendaftar belum diperiksa. Hasil ini tidak mereservasi atau menghubungkan domain.</p><p>Pembelian, pembayaran, perpanjangan, dan transfer registrar belum diaktifkan pada kartu ini. Pengaturan domain yang sudah ada tetap berada pada panel sebelumnya.</p></article></section>;
}
