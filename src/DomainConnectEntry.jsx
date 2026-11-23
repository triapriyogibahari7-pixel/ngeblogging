import React,{useEffect,useId,useRef,useState} from 'react';
import {getVerifiedSession} from './lib/auth-session-v76.js';
import {customerHost} from '../shared/customer-domain-connection.mjs';
import {DOMAIN_CONNECTION_ANNUAL_LABEL,DOMAIN_CONNECTION_ANNUAL_PRICE as PRICE} from '../shared/domain-connection-annual-price.mjs';
import {hostedCheckoutUrl} from './midtrans-hosted-checkout.mjs';
import './domain-connect-entry.css';
const ORDER=/^DCON-[a-f0-9]{32}$/;
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const PROVIDER_ID=/^(?:[a-f0-9]{32}|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i;
const attemptName=(user,site,hostname)=>'ngeblogging:domain-connection:production:v1:'+user+':'+site+':'+hostname+':'+PRICE.amountIdr;
function validDomain(d,siteId,hostname){return d&&UUID.test(d.id||'')&&d.site_id===siteId&&d.hostname===hostname&&['cloudflare','cloudflare-custom-hostnames'].includes(d.provider)&&PROVIDER_ID.test(d.provider_hostname_id||'')&&d.is_primary===false&&['pending','verifying','active','failed'].includes(d.status);}
function connectionResult(p,siteId){
 const installation=p.connectionInstallation;
 if(p.paymentState!=='paid'||Date.parse(p.grantExpiresAt)<=Date.now()||installation?.state!=='registry-bound')return null;
 if(!Number.isFinite(Date.parse(p.grantExpiresAt))||p.price?.amountIdr!==PRICE.amountIdr||p.price?.periodMonths!==12||installation.registryBindingCompleted!==true||installation.primaryChanged!==false||!Array.isArray(installation.domains)||installation.domains.length!==2||!Array.isArray(installation.instructions?.records)||installation.instructions.records.length!==2||installation.instructions.requiresCnameFlattening!==true)throw Error('CONNECTION_RESULT_UNVERIFIED');
 const hostname=customerHost(p.hostname),names=[hostname,'www.'+hostname],domains=installation.domains;
 if(hostname.startsWith('www.')||hostname.length>249||names.some(name=>domains.filter(d=>validDomain(d,siteId,name)).length!==1)||new Set(domains.map(d=>d.id)).size!==2||new Set(domains.map(d=>d.provider_hostname_id)).size!==2)throw Error('CONNECTION_PAIR_UNVERIFIED');
 const records=installation.instructions.records;
 if(names.some(name=>records.filter(r=>r?.type==='CNAME'&&r.name===name).length!==1)||records.some(r=>typeof r.value!=='string'||r.value.length>253||!r.value.endsWith('.ngeblogging.com')||/^ns\d+\./.test(r.value)||r.value.split('.').some(label=>!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)))||new Set(records.map(r=>r.value)).size!==1||records.find(r=>r.name===hostname)?.requiresFlattening!==true)throw Error('CONNECTION_DNS_UNVERIFIED');
 return {orderId:p.orderId,userId:p.userId,siteId,hostname,serviceExpiresAt:p.grantExpiresAt,domains,records};
}
function displayRecords(result){
 const records=[],seen=new Set();
 function add(type,name,value,requiresFlattening=false){
  if(typeof name!=='string'||typeof value!=='string'||!value.length||value.length>4096)return;
  const canonical=name.toLowerCase().replace(/\.$/,'');
  if(canonical.length>253||!(canonical===result.hostname||canonical.endsWith('.'+result.hostname))||!/^[a-z0-9_][a-z0-9_.-]*$/.test(canonical))return;
  if(type==='CNAME'&&!/^[a-z0-9_][a-z0-9_.-]*[.]?$/i.test(value))return;
  const key=JSON.stringify([type,name,value]);if(seen.has(key))return;seen.add(key);records.push({type,name,value,requiresFlattening});
 }
 for(const r of result.records)add(r.type,r.name,r.value,r.requiresFlattening===true);
 for(const d of result.domains){
  const ownership=d.ownership_verification,type=String(ownership?.type||'').toUpperCase();
  if(type==='TXT'||type==='CNAME')add(type,ownership.name,ownership.value);
  for(const r of (Array.isArray(d.ssl_validation)?d.ssl_validation:[]).slice(0,20)){add('TXT',r?.txt_name,r?.txt_value);add('CNAME',r?.cname_name,r?.cname_target);}
 }
 return records;
}
export default function DomainConnectEntry(props){return <FullZoneForm key={String(props.siteId)+'/'+String(props.expectedUserId)} {...props}/>;}
function FullZoneForm({siteId,expectedUserId,onRefresh}){
 const fieldId=useId(),[domain,setDomain]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[result,setResult]=useState(null);
 const active=useRef(null),mounted=useRef(false);
 let canCheck=false;try{canCheck=Boolean(result&&result.userId===expectedUserId&&result.siteId===siteId&&result.hostname===customerHost(domain)&&Date.parse(result.serviceExpiresAt)>Date.now());}catch{}
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
   if(p.reviewRequired||p.paymentState==='review_required'||p.connectionInstallation?.state==='review-required'){setResult(null);setNotice('Pembayaran memerlukan pemeriksaan. Jangan membuat pembayaran pengganti.');}
   else if(p.paymentState==='paid'&&Number.isFinite(Date.parse(p.grantExpiresAt))){
    const connected=connectionResult(p,siteId);setResult(connected);
    setNotice(Date.parse(p.grantExpiresAt)<=Date.now()?'Masa layanan pesanan ini sudah berakhir. Perpanjangan memerlukan tagihan baru setelah checkout tersedia.':'Pembayaran tercatat. Hak layanan sampai '+new Date(p.grantExpiresAt).toLocaleDateString('id-ID')+'. '+(connected?'Pasang record DNS di bawah, lalu periksa koneksi.':'Pemasangan belum dikonfirmasi lengkap; muat ulang halaman pesanan yang sama, jangan membayar ulang.')+' Pembayaran bukan bukti DNS, routing, dan HTTPS sudah aktif.');
    try{sessionStorage.removeItem(attemptName(expectedUserId,siteId,hostname));}catch{}try{onRefresh?.();}catch{}
   }else{setResult(null);setNotice('Pembayaran belum terkonfirmasi lunas. Gunakan pesanan yang sama; jangan membayar ulang.');}
  }catch{if(mounted.current)setNotice('Status pesanan belum dapat dipastikan. Muat ulang halaman pesanan yang sama dan pilih situs yang sesuai; jangan membayar ulang.');}
  finally{clearTimeout(timer);if(active.current===c){active.current=null;if(mounted.current)setBusy(false);}}})();
  return()=>{clearTimeout(timer);c.abort();if(active.current===c)active.current=null;};
 },[siteId,expectedUserId]);
 async function submit(event){
  event.preventDefault();if(active.current)return;setNotice('');
  if(!siteId||!expectedUserId){setNotice('Pilih situs dan masuk terlebih dahulu.');return;}
  let hostname;try{hostname=customerHost(domain);if(hostname.startsWith('www.')||hostname.length>249)throw Error();}catch{setNotice('Masukkan domain utama tanpa https://, www, port, atau alamat halaman. Alamat gratis Ngeblogging dikelola terpisah.');return;}
  const c=new AbortController();active.current=c;setBusy(true);if(!canCheck)setResult(null);let sent=false;
  const stopped=new Promise((_,reject)=>c.signal.addEventListener('abort',()=>reject(Error('OUTCOME_UNKNOWN')),{once:true})),wait=value=>Promise.race([value,stopped]),timer=setTimeout(()=>c.abort(),45000);
  try{
   const auth=await wait(getVerifiedSession({force:true}));if(auth?.verification!=='verified'||auth.user?.id!==expectedUserId||!auth.session?.access_token)throw Error('SESSION_CHANGED');
   if(c.signal.aborted)throw Error('OUTCOME_UNKNOWN');
   if(canCheck){
    try{
     const updates=await wait(Promise.all(result.domains.map(async d=>{
      const response=await fetch('/api/domains/connection-refresh',{method:'POST',redirect:'error',cache:'no-store',credentials:'same-origin',signal:c.signal,headers:{authorization:'Bearer '+auth.session.access_token,'content-type':'application/json'},body:JSON.stringify({siteId,domainId:d.id})});
      const text=await response.text();if(!response.ok||text.length>65536)throw Error();const p=JSON.parse(text);
      if(p.primaryChanged!==false||!validDomain(p.domain,siteId,d.hostname)||p.domain.id!==d.id||p.domain.provider_hostname_id!==d.provider_hostname_id||!Number.isFinite(Date.parse(p.serviceExpiresAt))||Date.parse(p.serviceExpiresAt)<=Date.now()||p.domain.status==='active'&&(p.connectionObserved!==true||p.tenantMappingVerified!==true||p.providerActive!==true))throw Error();
      return {domain:p.domain,expiresAt:p.serviceExpiresAt};
     })));
     const latest=await wait(getVerifiedSession({force:true}));if(latest?.verification!=='verified'||latest.user?.id!==expectedUserId||!latest.session?.access_token)throw Error('SESSION_CHANGED');
     if(!mounted.current||c.signal.aborted)throw Error();
     const expiresAt=updates.reduce((a,b)=>Date.parse(a)<Date.parse(b.expiresAt)?a:b.expiresAt,updates[0].expiresAt);
     setResult({...result,domains:updates.map(value=>value.domain),serviceExpiresAt:expiresAt});setNotice('Pemeriksaan kedua hostname selesai. Status koneksi berasal dari server, bukan pemeriksaan isi halaman. Tidak ada pembayaran baru atau perubahan primary.');try{onRefresh?.();}catch{}return;
    }catch(error){if(error.message==='SESSION_CHANGED')throw error;throw Object.assign(Error('CONNECTION_REFRESH_UNVERIFIED'),{publicMessage:'Status koneksi belum dapat dipastikan. Pemeriksaan ini tidak membuat pembayaran baru. Jangan membayar ulang.'});}
   }
   const name=attemptName(expectedUserId,siteId,hostname);let idempotencyKey;
   try{idempotencyKey=sessionStorage.getItem(name);if(!idempotencyKey){idempotencyKey=crypto.randomUUID();sessionStorage.setItem(name,idempotencyKey);}if(!/^[a-f0-9-]{36}$/.test(idempotencyKey))throw Error();}catch{throw Object.assign(Error('STORAGE_REQUIRED'),{publicMessage:'Penyimpanan sesi diperlukan agar percobaan ulang memakai pesanan yang sama. Permintaan pembayaran belum dikirim.'});}
   sent=true;const response=await wait(fetch('/api/domains/connection-checkout',{method:'POST',redirect:'error',cache:'no-store',credentials:'same-origin',signal:c.signal,headers:{accept:'application/json',authorization:'Bearer '+auth.session.access_token,'content-type':'application/json'},body:JSON.stringify({siteId,hostname,idempotencyKey,returnPath:window.location.pathname})}));
   if(!response.headers.get('content-type')?.includes('application/json'))throw Error('OUTCOME_UNKNOWN');
   const text=await wait(response.text());if(text.length>65536)throw Error('OUTCOME_UNKNOWN');const payload=JSON.parse(text);
   const bound=payload.userId===expectedUserId&&payload.siteId===siteId&&payload.hostname===hostname&&payload.paymentProvider==='midtrans'&&payload.billingPurpose==='custom-domain-connection'&&payload.environment==='production';
   if(!response.ok){if(bound&&payload.code==='CONNECTION_RENEWAL_KEY_REQUIRED'&&payload.newAttemptAllowed===true)sessionStorage.removeItem(name);const code=typeof payload.code==='string'&&/^[A-Z][A-Z0-9_]{0,95}$/.test(payload.code)?' Kode: '+payload.code+'.':'';throw Object.assign(Error('SERVER_REJECTED'),{publicMessage:(typeof payload.error==='string'?payload.error.slice(0,300):'Checkout belum berhasil. Gunakan pesanan yang sama; jangan membayar ulang.')+code});}
   if(!bound)throw Error('OUTCOME_UNKNOWN');
   if(payload.paymentRequired===false&&Number.isFinite(Date.parse(payload.grantExpiresAt))&&Date.parse(payload.grantExpiresAt)>Date.now()){sessionStorage.removeItem(name);if(mounted.current&&!c.signal.aborted)setNotice('Layanan telah dibayar hingga '+new Date(payload.grantExpiresAt).toLocaleDateString('id-ID')+'. Tidak perlu membayar lagi. Pemasangan DNS dan HTTPS tetap harus terverifikasi.');return;}
   const p=payload.checkout,target=hostedCheckoutUrl(p?.url,'production');
   if(payload.code!=='DOMAIN_CONNECTION_CHECKOUT_PRODUCTION'||payload.checkoutReady!==true||payload.checkoutCreated!==true||payload.registrationStarted!==false||!ORDER.test(p?.orderId||'')||p.currency!=='IDR'||p.amountIdr!==PRICE.amountIdr||!Number.isFinite(Date.parse(p.expiresAt))||Date.parse(p.expiresAt)<=Date.now()||Date.parse(p.expiresAt)>Date.now()+7205000||!target||target.slice(target.lastIndexOf('/')+1)!==p.snapToken)throw Error('OUTCOME_UNKNOWN');
   const latest=await wait(getVerifiedSession({force:true}));if(latest?.verification!=='verified'||latest.user?.id!==expectedUserId||!latest.session?.access_token)throw Error('SESSION_CHANGED');
   if(!mounted.current||c.signal.aborted)throw Error('OUTCOME_UNKNOWN');
   setNotice(<>Tautan pembayaran resmi untuk {hostname}, pesanan {p.orderId}. <a className="sv124-primary nd-connect-payment-link" href={target} target="_blank" rel="noopener noreferrer" onClick={event=>{if(Date.parse(p.expiresAt)<=Date.now()){event.preventDefault();setNotice('Tautan pembayaran sudah kedaluwarsa. Periksa pesanan yang sama sebelum melanjutkan; jangan membuat pembayaran pengganti.');}}}>Buka pembayaran Midtrans</a> Dibuka di tab baru, tanpa popup. Berlaku sampai {new Date(p.expiresAt).toLocaleString('id-ID')}. Status lunas mengikuti verifikasi server. Kembali ke halaman ini setelah pembayaran; jangan membuat pembayaran pengganti.</>);
  }catch(error){if(mounted.current)setNotice(error.message==='SESSION_CHANGED'?'Sesi berubah. Masuk kembali sebelum melanjutkan pesanan yang sama.':error.publicMessage||(sent?'Hasil penyiapan pembayaran belum dapat dipastikan. Jangan membuat pembayaran pengganti.':'Permintaan pembayaran belum dikirim. Silakan masuk dan coba kembali.'));}
  finally{clearTimeout(timer);if(active.current===c)active.current=null;if(mounted.current)setBusy(false);}
 }
 const records=result?displayRecords(result):[];
 return <section className="sv124-card nd-connect-entry" aria-label="Hubungkan domain pribadi" aria-busy={busy}>
  <h2>Hubungkan domain pribadi</h2>
  <p className="nd-connect-description">Hubungkan domain milik Anda ke situs aktif melalui Cloudflare for SaaS. Alamat gratis tetap tersedia.</p>
  <form className="nd-connect-form" onSubmit={submit} noValidate>
   <label className="nd-connect-field" htmlFor={fieldId}><span>Nama domain utama</span><input id={fieldId} name="custom-domain" type="text" inputMode="url" value={domain} onChange={event=>{setDomain(event.target.value);setNotice('');}} disabled={busy} placeholder="domainanda.com" autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} maxLength={253}/></label>
   <p>{DOMAIN_CONNECTION_ANNUAL_LABEL}, mencakup domain utama dan www. Dibayar untuk 12 bulan; tidak diperpanjang otomatis. Tidak termasuk pembelian atau perpanjangan nama domain. Pembayaran melalui tautan Midtrans di tab baru hanya bila layanan siap. DNS dan HTTPS mengikuti verifikasi pemasangan.</p>
   <button type="submit" className="sv124-primary nd-connect-submit" disabled={busy||!siteId||!expectedUserId||!domain.trim()}>{busy?'Memproses…':canCheck?'Periksa koneksi':'Hubungkan domain'}</button>
  </form>
  <div className="nd-connect-feedback" role="status" aria-live="polite">{notice&&<p>{notice}</p>}</div>
  {result&&<div className="nd-connect-result"><h3>{result.hostname}</h3><p>{result.domains.map(d=>d.hostname+': '+d.status).join('; ')}.</p><p>Record dari hasil pemasangan dan pemeriksaan server:</p><ul>{records.map(r=><li key={JSON.stringify([r.type,r.name,r.value])}><code>{r.type} {r.name} = {r.value}</code>{r.requiresFlattening?' (CNAME flattening wajib untuk domain utama)':''}</li>)}</ul><p>DNS tetap di penyedia yang mendukung CNAME flattening. Jangan mengganti nameserver berdasarkan formulir ini. Pasang record yang ditampilkan, lalu gunakan tombol Periksa koneksi pada formulir ini. Status aktif mengikuti verifikasi server; tidak ada perubahan primary.</p></div>}
 </section>;
}
