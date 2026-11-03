import React,{useEffect,useRef,useState} from 'react';
import {getVerifiedSession} from './lib/auth-session-v76.js';
import {fetchLiveRegistrarSearch,currentLiveRegistrarView,normalizeRegistrarSearchInput} from './lib/live-registrar-search.mjs';
import './domain-customer-search.css';
const messages={REGISTRAR_SECRET_MISSING:'Endpoint registrar belum menerima token yang diperlukan.',REGISTRAR_ACCESS_DENIED:'Registrar menolak akses akun atau izin token.',REGISTRAR_RATE_LIMITED:'Batas permintaan registrar tercapai. Tunggu sebelum mencoba lagi.',REGISTRAR_TIMEOUT:'Registrar belum menjawab dalam batas waktu.',REGISTRAR_NETWORK_ERROR:'Sambungan backend ke registrar gagal.',REGISTRAR_SEARCH_ABORTED:'Pencarian dibatalkan atau melewati batas waktu.',AUTH_REQUIRED:'Masuk ke akun pemilik situs untuk mencari domain.',INVALID_SESSION:'Sesi akun belum valid. Masuk kembali sebelum mencari.',SESSION_CHANGED:'Akun berubah selama pencarian. Hasil tidak digunakan.',SITE_OWNER_REQUIRED:'Pencarian hanya untuk pemilik situs aktif.',AUTH_UNAVAILABLE:'Backend belum dapat memverifikasi akun atau kepemilikan situs.',INVALID_SEARCH_QUERY:'Gunakan kata kunci atau domain tanpa protokol dan path.',LOOKUP_RATE_LIMITED:'Batas pencarian tercapai. Tunggu sebelum mencoba lagi.',LOOKUP_BUSY:'Pencarian lain masih berjalan. Coba sesaat lagi.',REGISTRAR_RESPONSE_UNVERIFIED:'Respons registrar belum lolos validasi. Hasil tidak ditampilkan.'};
export default function LiveRegistrarSearch({user,siteId,siteName,onSelect}){
 const [input,setInput]=useState(''),[busy,setBusy]=useState(false),[result,setResult]=useState(null),[notice,setNotice]=useState(''),[tick,setTick]=useState(0);
 const active=useRef(null),scope=JSON.stringify([user?.id,siteId]),scopeRef=useRef(scope);scopeRef.current=scope;
 useEffect(()=>{setInput('');setBusy(false);setResult(null);setNotice('');return ()=>{active.current?.abort();active.current=null;};},[scope]);
 useEffect(()=>{if(!result)return;const timer=setInterval(()=>setTick(performance.now()),1000);return ()=>clearInterval(timer);},[result]);
 useEffect(()=>{if(typeof document==='undefined')return;const suspend=()=>{if(document.visibilityState==='hidden'){active.current?.abort();active.current=null;setBusy(false);setResult(null);}};document.addEventListener('visibilitychange',suspend);return ()=>document.removeEventListener('visibilitychange',suspend);},[scope]);
 const view=result?.scope===scope?currentLiveRegistrarView(result.view,tick):null;
 const cancel=()=>{active.current?.abort();active.current=null;setBusy(false);setResult(null);setNotice('Pencarian dibatalkan. Tidak ada pesanan atau pembayaran dibuat.');};
 async function submit(event){
  event.preventDefault();if(active.current)return;let query;try{query=normalizeRegistrarSearchInput(input);}catch{setNotice(messages.INVALID_SEARCH_QUERY);return;}
  const c=new AbortController();active.current=c;const current=()=>active.current===c&&!c.signal.aborted&&scopeRef.current===scope;
  setBusy(true);setResult(null);setNotice('');
  const timer=setTimeout(()=>{if(current()){c.abort();active.current=null;setBusy(false);setNotice(messages.REGISTRAR_TIMEOUT);}},25000);
  try{
   const auth=await getVerifiedSession({force:true});if(!current())return;
   if(auth?.verification!=='verified'||auth.user?.id!==user?.id||!auth.session?.access_token)throw Object.assign(Error(),{code:'INVALID_SESSION'});
   const found=await fetchLiveRegistrarSearch(query,{siteId,token:auth.session.access_token,signal:c.signal});if(!current())return;
   const next=await getVerifiedSession({force:true});if(!current())return;
   if(next?.verification!=='verified'||next.user?.id!==auth.user.id)throw Object.assign(Error(),{code:'SESSION_CHANGED'});
   setTick(performance.now());setResult({scope,view:found});
  }catch(error){if(current()){const code=typeof error?.code==='string'&&/^[A-Z0-9_]{1,80}$/.test(error.code)?error.code:null;setNotice((messages[code]||'Pencarian langsung belum berhasil. Penyebabnya belum dapat dipastikan.')+(code?' Kode: '+code+'.':'')+' Tidak ada pesanan atau pembayaran dibuat.');}}
  finally{clearTimeout(timer);if(active.current===c){active.current=null;setBusy(false);}}
 }
 function select(domain){if(busy||!result||result.scope!==scope)return;const current=currentLiveRegistrarView(result.view,performance.now());if(!current.candidates?.some(row=>row.domain===domain&&row.canSelect)||current.expired){setTick(performance.now());return;}onSelect?.({domain,siteId,availabilityOnly:true,purchaseAllowed:false});setNotice('Nama dipilih untuk disalin ke formulir. Ketersediaan dan harga final wajib diperiksa ulang; belum ada pesanan.');}
 return <section className="sv124-card dcs-panel" aria-label="Pencarian langsung registrar" data-live-registrar-search="lookup-only">
  <h2>Cari domain dan saran nama</h2><p>Situs yang dikelola: {siteName||'Situs aktif'}.</p>
  <p>Pencarian ini menghubungi registrar tanpa menunggu konfigurasi harga jual. Hasil tidak membuat reservasi, pesanan, atau pembayaran. Harga final dan peninjauan tetap diperiksa terpisah.</p>
  <form className="dcs-form" onSubmit={submit}><label>Nama domain atau kata kunci<input value={input} onChange={event=>{setInput(event.target.value);setResult(null);setNotice('');}} maxLength={100} required autoComplete="off" spellCheck={false} disabled={busy} placeholder="nama-brand atau nama-domain.com"/></label><button type="submit" className="sv124-primary" disabled={busy}>{busy?'Menghubungi registrar…':'Cari domain dan saran'}</button>{busy&&<button type="button" className="sv124-secondary" onClick={cancel}>Batalkan</button>}</form>
  <div role="status" aria-live="polite" aria-busy={busy}>{notice&&<p>{notice}</p>}{view&&<p>{view.message}</p>}</div>
  {view?.candidates?.length>0&&<ul className="dcs-results">{view.candidates.map(row=><li className="dcs-result" key={row.domain}><h3>{row.domain}</h3><p>{row.status}{row.premium?' · Premium':''}</p><p>Harga jual final belum ditetapkan dari hasil pencarian ini.</p>{row.canSelect&&<button type="button" className="sv124-secondary" disabled={busy} onClick={()=>select(row.domain)}>Pilih nama untuk formulir</button>}</li>)}</ul>}
  <p>Maksimal 50 kandidat dari registrar, dapat lebih sedikit. Dukungan ekstensi dan ketersediaan mengikuti respons registrar, bukan data buatan.</p>
 </section>;
}
