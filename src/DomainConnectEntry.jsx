import React,{useEffect,useId,useRef,useState} from 'react';
import {getVerifiedSession} from './lib/auth-session-v76.js';
import {customerHost} from '../shared/customer-domain-connection.mjs';
import {assignedNameservers} from './lib/domain-panel-result.mjs';
import {DOMAIN_CONNECTION_ANNUAL_LABEL,DOMAIN_CONNECTION_ANNUAL_PRICE as PRICE} from '../shared/domain-connection-annual-price.mjs';
import {hostedCheckoutUrl} from './midtrans-hosted-checkout.mjs';
import './domain-connect-entry.css';
const ORDER=/^DCON-[a-f0-9]{32}$/;
const attemptName=(user,site,hostname)=>'ngeblogging:domain-connection:production:v1:'+user+':'+site+':'+hostname+':'+PRICE.amountIdr;
export default function DomainConnectEntry(props){return <FullZoneForm key={String(props.siteId)+'/'+String(props.expectedUserId)} {...props}/>;}
function FullZoneForm({siteId,expectedUserId,onRefresh}){
 const fieldId=useId(),[domain,setDomain]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[result,setResult]=useState(null);
 const active=useRef(null),mounted=useRef(false);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;active.current?.abort();};},[]);
 useEffect(()=>{
  const orderId=new URLSearchParams(window.location.search).get('domain_connection_order');
  if(!siteId||!expectedUserId||!ORDER.test(orderId||'')||active.current)return;
  const c=new AbortController(),timer=setTimeout(()=>c.abort(),20000);active.current=c;setBusy(true);
  void (async()=>{try{
   const auth=await getVerifiedSession({force:true});if(c.signal.aborted)return;
   if(auth?.verification!=='verified'||auth.user?.id!==expectedUserId||!auth.session?.access_token)throw Error();
   const r=await fetch('/api/domains/connection-payment-status',{method:'POST',redirect:'error',cache:'no-store',credentials:'same-origin',signal:c.signal,headers:{authorization:'Bearer '+auth.session.access_token,'content-type':'application/json'},body:JSON.stringify({orderId})});
   const text=await r.text();if(!r.ok||text.length>65536)throw Error();const p=JSON.parse(text);
   if(p.orderId!==orderId||p.userId!==expectedUserId||p.siteId!==siteId||p.paymentProvider!=='midtrans'||p.billingPurpose!=='custom-domain-connection'||p.environment!=='production'||!['pending','paid','failed','review_required'].includes(p.paymentState))throw Error();
   const hostname=customerHost(p.hostname);if(!mounted.current||c.signal.aborted)return;setDomain(hostname);
   if(p.reviewRequired||p.paymentState==='review_required')setNotice('Pembayaran memerlukan pemeriksaan. Jangan membuat pembayaran pengganti.');
   else if(p.paymentState==='paid'&&Number.isFinite(Date.parse(p.grantExpiresAt))){setNotice('Pembayaran tercatat. Hak layanan sampai '+new Date(p.grantExpiresAt).toLocaleDateString('id-ID')+'. Pembayaran bukan bukti DNS, routing, dan HTTPS sudah aktif.');try{sessionStorage.removeItem(attemptName(expectedUserId,siteId,hostname));}catch{}try{onRefresh?.();}catch{}}
   else setNotice('Pembayaran belum terkonfirmasi lunas. Gunakan pesanan yang sama; jangan membayar ulang.');
  }catch{if(mounted.current)setNotice('Status pesanan belum dapat dipastikan. Pilih situs yang sesuai dengan pesanan; jangan membayar ulang.');}
  finally{clearTimeout(timer);if(active.current===c){active.current=null;if(mounted.current)setBusy(false);}}})();
  return()=>{clearTimeout(timer);c.abort();if(active.current===c)active.current=null;};
 },[siteId,expectedUserId]);
 async function submit(event){
  event.preventDefault();if(active.current)return;setNotice('');
  if(!siteId||!expectedUserId){setNotice('Pilih situs dan masuk terlebih dahulu.');return;}
  let hostname;try{hostname=customerHost(domain);if(hostname.startsWith('www.')||hostname.length>249)throw Error();}catch{setNotice('Masukkan domain utama tanpa https://, www, port, atau alamat halaman. Alamat gratis Ngeblogging dikelola terpisah.');return;}
  const c=new AbortController();active.current=c;setBusy(true);setResult(null);let sent=false;
  const stopped=new Promise((_,reject)=>c.signal.addEventListener('abort',()=>reject(Error('OUTCOME_UNKNOWN')),{once:true})),wait=value=>Promise.race([value,stopped]),timer=setTimeout(()=>c.abort(),45000);
  try{
   const auth=await wait(getVerifiedSession({force:true}));if(auth?.verification!=='verified'||auth.user?.id!==expectedUserId||!auth.session?.access_token)throw Error('SESSION_CHANGED');
   if(c.signal.aborted)throw Error('OUTCOME_UNKNOWN');
   const name=attemptName(expectedUserId,siteId,hostname);let idempotencyKey;
   try{idempotencyKey=sessionStorage.getItem(name);if(!idempotencyKey){idempotencyKey=crypto.randomUUID();sessionStorage.setItem(name,idempotencyKey);}if(!/^[a-f0-9-]{36}$/.test(idempotencyKey))throw Error();}catch{throw Object.assign(Error('STORAGE_REQUIRED'),{publicMessage:'Penyimpanan sesi diperlukan agar percobaan ulang memakai pesanan yang sama. Permintaan pembayaran belum dikirim.'});}
   sent=true;const response=await wait(fetch('/api/domains/connection-checkout',{method:'POST',redirect:'error',cache:'no-store',credentials:'same-origin',signal:c.signal,headers:{accept:'application/json',authorization:'Bearer '+auth.session.access_token,'content-type':'application/json'},body:JSON.stringify({siteId,hostname,idempotencyKey,returnPath:window.location.pathname})}));
   if(!response.headers.get('content-type')?.includes('application/json'))throw Error('OUTCOME_UNKNOWN');
   const text=await wait(response.text());if(text.length>65536)throw Error('OUTCOME_UNKNOWN');const payload=JSON.parse(text);
   const bound=payload.userId===expectedUserId&&payload.siteId===siteId&&payload.hostname===hostname&&payload.paymentProvider==='midtrans'&&payload.billingPurpose==='custom-domain-connection'&&payload.environment==='production';
   if(!response.ok){if(bound&&payload.code==='CONNECTION_RENEWAL_KEY_REQUIRED'&&payload.newAttemptAllowed===true)sessionStorage.removeItem(name);throw Object.assign(Error('SERVER_REJECTED'),{publicMessage:typeof payload.error==='string'?payload.error.slice(0,300):'Checkout belum berhasil. Gunakan pesanan yang sama; jangan membayar ulang.'});}
   if(!bound)throw Error('OUTCOME_UNKNOWN');
   if(payload.paymentRequired===false&&Number.isFinite(Date.parse(payload.grantExpiresAt))&&Date.parse(payload.grantExpiresAt)>Date.now()){sessionStorage.removeItem(name);if(mounted.current&&!c.signal.aborted)setNotice('Layanan telah dibayar hingga '+new Date(payload.grantExpiresAt).toLocaleDateString('id-ID')+'. Tidak perlu membayar lagi. Pemasangan DNS dan HTTPS tetap harus terverifikasi.');return;}
   const p=payload.checkout,target=hostedCheckoutUrl(p?.url,'production');
   if(payload.code!=='DOMAIN_CONNECTION_CHECKOUT_PRODUCTION'||payload.checkoutReady!==true||payload.checkoutCreated!==true||payload.registrationStarted!==false||!ORDER.test(p?.orderId||'')||p.currency!=='IDR'||p.amountIdr!==PRICE.amountIdr||!Number.isFinite(Date.parse(p.expiresAt))||Date.parse(p.expiresAt)<=Date.now()||Date.parse(p.expiresAt)>Date.now()+7205000||!target||target.slice(target.lastIndexOf('/')+1)!==p.snapToken)throw Error('OUTCOME_UNKNOWN');
   const latest=await wait(getVerifiedSession({force:true}));if(latest?.verification!=='verified'||latest.user?.id!==expectedUserId||!latest.session?.access_token)throw Error('SESSION_CHANGED');
   if(!mounted.current||c.signal.aborted)throw Error('OUTCOME_UNKNOWN');setNotice('Membuka pembayaran resmi Midtrans. Status lunas mengikuti verifikasi server.');window.location.assign(target);
  }catch(error){if(mounted.current)setNotice(error.message==='SESSION_CHANGED'?'Sesi berubah. Masuk kembali sebelum melanjutkan pesanan yang sama.':error.publicMessage||(sent?'Hasil penyiapan pembayaran belum dapat dipastikan. Jangan membuat pembayaran pengganti.':'Permintaan pembayaran belum dikirim. Silakan masuk dan coba kembali.'));}
  finally{clearTimeout(timer);if(active.current===c)active.current=null;if(mounted.current)setBusy(false);}
 }
 const ns=assignedNameservers(result?.domain?.ownership_verification?.required_name_servers);
 return <section className="sv124-card nd-connect-entry" aria-label="Hubungkan domain pribadi" aria-busy={busy}>
  <h2>Hubungkan domain pribadi</h2>
  <p className="nd-connect-description">Hubungkan domain milik Anda ke situs aktif melalui Cloudflare for SaaS. Alamat gratis tetap tersedia.</p>
  <form className="nd-connect-form" onSubmit={submit} noValidate>
   <label className="nd-connect-field" htmlFor={fieldId}><span>Nama domain utama</span><input id={fieldId} name="custom-domain" type="text" inputMode="url" value={domain} onChange={event=>setDomain(event.target.value)} disabled={busy} placeholder="domainanda.com" autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} maxLength={253}/></label>
   <p>{DOMAIN_CONNECTION_ANNUAL_LABEL}, mencakup domain utama dan www. Dibayar untuk 12 bulan; tidak diperpanjang otomatis. Tidak termasuk pembelian atau perpanjangan nama domain. Pembayaran melalui Midtrans hanya bila layanan siap. DNS dan HTTPS mengikuti verifikasi pemasangan.</p>
   <button type="submit" className="sv124-primary nd-connect-submit" disabled={busy||!siteId||!expectedUserId||!domain.trim()}>{busy?'Menyiapkan pembayaran…':'Hubungkan domain'}</button>
  </form>
  <div className="nd-connect-feedback" role="status" aria-live="polite">{notice&&<p>{notice}</p>}</div>
  {result&&<div className="nd-connect-result"><h3>{result.domain.hostname}</h3>{ns.length>=2?<><p>Nameserver resmi untuk domain ini:</p><ul>{ns.map(value=><li key={value}><code>{value}</code></li>)}</ul><p>Pasang nilai ini di registrar setelah memeriksa record DNS, lalu gunakan Periksa koneksi pada kartu domain.</p></>:<p>Nameserver belum tersedia lengkap. Jangan mengganti DNS menggunakan nilai tebakan. Muat ulang daftar lalu gunakan Periksa koneksi.</p>}</div>}
 </section>;
}
