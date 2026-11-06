import React,{useEffect,useRef,useState} from 'react';
import {getVerifiedSession} from './lib/auth-session-v76.js';
import {fetchLiveRegistrarSearch,currentLiveRegistrarView,normalizeRegistrarSearchInput} from './lib/live-registrar-search.mjs';
import {readCheckoutSelectionState,inspectCheckoutDomain} from './domain-checkout-selection.mjs';
import DomainLiveSalePrice from './DomainLiveSalePrice.jsx';
import DomainDirectCheckout from './DomainDirectCheckout.jsx';
import DomainSavedOrderPanel from './DomainSavedOrderPanel.jsx';
import DomainOrderHistory from './DomainOrderHistory.mjs';
import './domain-customer-search.css';
const messages={REGISTRAR_SECRET_MISSING:'Endpoint registrar belum menerima token yang diperlukan.',REGISTRAR_ACCESS_DENIED:'Registrar menolak akses akun atau izin token.',REGISTRAR_RATE_LIMITED:'Batas permintaan registrar tercapai. Tunggu sebelum mencoba lagi.',REGISTRAR_TIMEOUT:'Registrar belum menjawab dalam batas waktu.',REGISTRAR_NETWORK_ERROR:'Sambungan backend ke registrar gagal.',REGISTRAR_SEARCH_ABORTED:'Pencarian dibatalkan atau melewati batas waktu.',AUTH_REQUIRED:'Masuk ke akun pemilik situs untuk mencari domain.',INVALID_SESSION:'Sesi akun belum valid. Masuk kembali sebelum mencari.',SESSION_CHANGED:'Akun berubah selama pencarian. Hasil tidak digunakan.',SITE_OWNER_REQUIRED:'Pencarian hanya untuk pemilik situs aktif.',AUTH_UNAVAILABLE:'Backend belum dapat memverifikasi akun atau kepemilikan situs.',INVALID_SEARCH_QUERY:'Gunakan kata kunci atau domain tanpa protokol dan path.',LOOKUP_RATE_LIMITED:'Batas pencarian tercapai. Tunggu sebelum mencoba lagi.',LOOKUP_BUSY:'Pencarian lain masih berjalan. Coba sesaat lagi.',REGISTRAR_RESPONSE_UNVERIFIED:'Respons registrar belum lolos validasi. Hasil tidak ditampilkan.'};
export default function LiveRegistrarSearch({user,siteId,siteName,onSelect,initialDomain='',fullDomain=false,showOrders=true}){
 const [input,setInput]=useState(initialDomain),[busy,setBusy]=useState(false),[result,setResult]=useState(null),[notice,setNotice]=useState(''),[tick,setTick]=useState(0),[checkoutDomain,setCheckoutDomain]=useState(null),[saved,setSaved]=useState(null);
 const [historyCoverage,setHistoryCoverage]=useState(null);
 const active=useRef(null),inputRef=useRef(initialDomain),scope=JSON.stringify([user?.id,siteId]),scopeRef=useRef(scope);scopeRef.current=scope;inputRef.current=input;
 useEffect(()=>{active.current?.abort();active.current=null;setInput(initialDomain);setBusy(false);setResult(null);setNotice('');setCheckoutDomain(null);return ()=>{active.current?.abort();active.current=null;};},[scope]);
 useEffect(()=>{if(!fullDomain||inputRef.current===initialDomain)return;active.current?.abort();active.current=null;setInput(initialDomain);setBusy(false);setResult(null);setNotice('');setCheckoutDomain(null);},[initialDomain,fullDomain]);
 useEffect(()=>{
  let live=true;
  const refresh=()=>{if(!live)return;let attempt=null,unreadable=false,signature=JSON.stringify([null,false]);try{if(user?.id){const snapshot=readCheckoutSelectionState(user.id,localStorage);attempt=snapshot.attempt;signature=snapshot.signature;}}catch{unreadable=true;signature=JSON.stringify([null,true]);}setSaved(previous=>previous?.scope===scope&&previous.signature===signature?previous:{scope,attempt,unreadable,signature});};
  refresh();const timer=setInterval(refresh,1000);window.addEventListener('storage',refresh);window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);
  return()=>{live=false;clearInterval(timer);window.removeEventListener('storage',refresh);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};
 },[scope]);
 useEffect(()=>{if(!result)return;const timer=setInterval(()=>setTick(performance.now()),1000);return ()=>clearInterval(timer);},[result]);
 useEffect(()=>{if(typeof document==='undefined')return;const suspend=()=>{if(document.visibilityState==='hidden'){active.current?.abort();active.current=null;setBusy(false);setResult(null);}};document.addEventListener('visibilitychange',suspend);return ()=>document.removeEventListener('visibilitychange',suspend);},[scope]);
 const view=result?.scope===scope?currentLiveRegistrarView(result.view,tick):null;
 const currentSaved=saved?.scope===scope?saved:null,checkoutBlocked=!currentSaved||currentSaved.unreadable;
 const covered=Boolean(currentSaved?.attempt&&!currentSaved.unreadable&&currentSaved.attempt.siteId===siteId&&historyCoverage?.scope===scope&&historyCoverage.rows.some(o=>o.orderId===currentSaved.attempt.orderId&&o.domain===currentSaved.attempt.quote.domain));
 const cancel=()=>{active.current?.abort();active.current=null;setBusy(false);setResult(null);setNotice('Pencarian dibatalkan. Tidak ada pesanan atau pembayaran dibuat.');};
 async function submit(event){
  event.preventDefault();if(active.current)return;let query;try{query=normalizeRegistrarSearchInput(input);if(fullDomain&&!query.includes('.'))throw Error();}catch{setNotice(fullDomain?'Masukkan nama domain lengkap tanpa protokol atau path, misalnya nama-domain.com.':messages.INVALID_SEARCH_QUERY);return;}
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
 function startCheckout(domain){if(busy||checkoutDomain||!result||result.scope!==scope||checkoutBlocked)return;try{inspectCheckoutDomain(user?.id,domain,localStorage);}catch{setSaved({scope,attempt:null,unreadable:true,signature:JSON.stringify([null,true])});setNotice('Catatan pesanan belum dapat dibaca. Checkout baru tidak dibuka.');return;}const current=currentLiveRegistrarView(result.view,performance.now());if(current.expired||!current.candidates?.some(row=>row.domain===domain&&row.canSelect)){setTick(performance.now());return;}setCheckoutDomain(domain);setNotice('Formulir checkout dibuka untuk domain terpilih. Harga final diperiksa otomatis; membuka formulir belum membuat pesanan atau pembayaran.');}
 return <section className={fullDomain?'dcs-panel':'sv124-card dcs-panel'} style={fullDomain?{marginTop:0}:undefined} aria-label={fullDomain?'Nama domain lengkap dan harga':'Pencarian langsung registrar'} data-live-registrar-search="lookup-only" data-domain-search-mode={fullDomain?'full-domain':'keyword'}>
  {!fullDomain&&<h2>Cari domain dan saran nama</h2>}<p>Situs yang dikelola: {siteName||'Situs aktif'}.</p>
  <p>Temukan domain dari registrar. Estimasi bukan tagihan. Klik Checkout untuk meminta harga final dan mengisi data pemilik domain tanpa menyalin nama. Pembayaran hanya dilanjutkan setelah harga final tersedia dan disetujui.</p>
  <form className="dcs-form" onSubmit={submit}><label style={fullDomain?{minWidth:0,textAlign:'left'}:undefined}>{fullDomain?'Nama domain lengkap':'Nama domain atau kata kunci'}<input value={input} style={fullDomain?{width:'100%',minWidth:0,textAlign:'left'}:undefined} onChange={event=>{setInput(event.target.value);setResult(null);setNotice('');}} maxLength={100} required autoComplete="off" spellCheck={false} disabled={busy} placeholder={fullDomain?'nama-domain.com':'nama-brand atau nama-domain.com'}/></label><button type="submit" className="sv124-primary" disabled={busy}>{busy?'Menghubungi registrar…':fullDomain?'Periksa ketersediaan dan harga':'Cari domain dan saran'}</button>{busy&&<button type="button" className="sv124-secondary" onClick={cancel}>Batalkan</button>}</form>
  {showOrders&&<>{currentSaved?(!covered&&<DomainSavedOrderPanel key={scope+':'+(currentSaved.attempt?.orderId||'none')} owner={user?.id} siteId={siteId} attempt={currentSaved.attempt} unreadable={currentSaved.unreadable}/>):<p role="status">Memeriksa catatan pesanan...</p>}
  <DomainOrderHistory key={scope} owner={user?.id} refreshKey={currentSaved?.signature||''} onCoverage={rows=>{if(scopeRef.current===scope)setHistoryCoverage({scope,rows});}}/></>}
  <div role="status" aria-live="polite" aria-busy={busy}>{notice&&<p>{notice}</p>}{view&&<p>{view.message}</p>}</div>
  {view?.candidates?.length>0&&<ul className="dcs-results">{view.candidates.map(row=><li className="dcs-result" key={row.domain}><h3>{row.domain}</h3><p>{row.status}{row.premium?' · Premium':''}</p>{row.canSelect?<><DomainLiveSalePrice key={scope+':'+row.domain} domain={row.domain} userId={user?.id} disabled={busy}/><button type="button" className="sv124-primary" disabled={busy||Boolean(checkoutDomain)||checkoutBlocked} onClick={()=>startCheckout(row.domain)}>{checkoutBlocked?'Catatan checkout belum dapat dibaca':'Checkout'}</button><button type="button" className="sv124-secondary" disabled={busy} onClick={()=>select(row.domain)}>Pilih nama untuk formulir lama</button></>:<p>Domain ini tidak dapat dipilih untuk pembelian berdasarkan hasil registrar.</p>}</li>)}</ul>}
  {checkoutDomain&&<DomainDirectCheckout key={scope+':checkout:'+checkoutDomain} domain={checkoutDomain} siteId={siteId} siteName={siteName} userId={user?.id} onClose={()=>setCheckoutDomain(null)}/>}
  <p>Dukungan ekstensi dan ketersediaan mengikuti respons registrar, bukan data buatan.</p>
 </section>;
}
