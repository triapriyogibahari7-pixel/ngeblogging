import React,{useEffect,useRef,useState} from 'react';
import {ExternalLink} from 'lucide-react';
import {customerHost} from '../shared/customer-domain-connection.mjs';
import {getVerifiedSession} from './lib/auth-session-v76.js';
import {abortable,httpsEvidence,startActivationMonitor} from './lib/domain-activation-monitor.mjs';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const saas=d=>['cloudflare','cloudflare-custom-hostnames'].includes(d?.provider);
export default function DomainCardConnection({site,domain,disabled=false,beginOperation,onDomain}){
 let href=null;
 try{if(site?.id&&domain?.site_id===site.id)href='https://'+customerHost(domain.hostname);}catch{}
 const scope=JSON.stringify([site?.id,domain?.id,domain?.hostname]),latest=useRef(null),[status,setStatus]=useState(null);
 latest.current={site,domain,disabled,beginOperation,onDomain,scope};
 const enabled=Boolean(href)&&UUID.test(site?.id||'')&&UUID.test(domain?.id||'')&&saas(domain)&&!['pending_deletion','deleted','blocked','failed'].includes(domain?.status);
 useEffect(()=>{
  setStatus(null);if(!enabled)return;
  const snapshot=latest.current,siteId=snapshot.site.id,domainId=snapshot.domain.id,hostname=snapshot.domain.hostname;
  return startActivationMonitor({
   run:async signal=>{
    const before=latest.current;
    if(signal.aborted||before.scope!==scope)return {done:true};
    if(before.disabled||document.visibilityState==='hidden')return {done:false,notice:'Pemantauan menunggu halaman aktif dan operasi lain selesai.'};
    if(typeof before.beginOperation!=='function')return {done:false,notice:'Pemantau belum mendapat pengunci operasi.'};
    const task=before.beginOperation('activation:'+domainId);if(!task)return {done:false};
    const current=()=>!signal.aborted&&latest.current.scope===scope&&task.current();
    try{
     const auth=await abortable(getVerifiedSession({force:true}),signal);
     if(!current())return {done:true};
     if(auth?.verification!=='verified'||!auth.user?.id||!auth.session?.access_token)throw Error('SESSION_REQUIRED');
     const post=async(path,body)=>{
      if(!current())throw Error('MONITOR_SCOPE_CHANGED');
      const r=await fetch(path,{method:'POST',redirect:'error',cache:'no-store',credentials:'same-origin',signal,headers:{accept:'application/json','content-type':'application/json',authorization:'Bearer '+auth.session.access_token},body:JSON.stringify(body)});
      if(!r.ok||!r.headers.get('content-type')?.includes('application/json'))throw Error('MONITOR_ENDPOINT_UNAVAILABLE');
      const text=await r.text();if(text.length>1048576)throw Error('MONITOR_RESPONSE_TOO_LARGE');return JSON.parse(text);
     };
     const payload=await post('/api/domains/refresh',{domainId}),next=payload?.domain;
     if(!next||next.id!==domainId||next.site_id!==siteId||next.hostname!==hostname||!saas(next))throw Error('MONITOR_DOMAIN_MISMATCH');
     let evidence=null;
     if(next.provider_status==='active'&&next.ssl_status==='active')evidence=httpsEvidence(await post('/api/domains/audit',{siteId}),{siteId,hostname});
     const after=await abortable(getVerifiedSession({force:true}),signal);
     if(!current())return {done:true};
     if(after?.verification!=='verified'||after.user?.id!==auth.user.id)throw Error('SESSION_CHANGED');
     latest.current.onDomain?.(next);
     if(evidence?.httpsVerified)return {done:true,notice:'HTTPS 200 terverifikasi pada '+evidence.checkedAt+'. Identitas isi situs belum disertifikasi.',checkedAt:evidence.checkedAt};
     return {done:false,notice:next.ssl_status!=='active'?'Menunggu sertifikat HTTPS. Status diperbarui otomatis; jangan menghubungkan ulang domain.':next.provider_status!=='active'?'Hostname belum dilaporkan aktif. Status diperbarui otomatis.':'Sertifikat dilaporkan aktif, tetapi respons HTTPS 200 belum terverifikasi.'};
    }finally{task.finish();}
   },
   onResult:result=>{if(result?.notice)setStatus({scope,notice:result.notice});},
   onError:error=>setStatus({scope,notice:['SESSION_REQUIRED','SESSION_CHANGED'].includes(error?.message)?'Sesi akun perlu diverifikasi. Belum ada bukti HTTPS terbaru.':'Pemantauan belum berhasil mendapatkan bukti terbaru. Hasil ini bukan pernyataan bahwa domain sudah live.'}),
   onExhausted:()=>setStatus(previous=>({scope,notice:(previous?.scope===scope?previous.notice+' ':'')+'Batas pemantauan halaman ini tercapai. Muat ulang halaman untuk mengambil status terbaru.'}))
  });
 },[scope,enabled]);
 return <section data-domain-card-connection="domain-card-direct-visit-v1">
  {enabled&&<p role="status" aria-live="polite">{status?.scope===scope?status.notice:'Status hostname dan HTTPS akan diperbarui otomatis saat halaman aktif.'}</p>}
  {href&&<a className="sv124-primary" href={href} target="_blank" rel="noopener noreferrer"><ExternalLink size={16} aria-hidden="true"/>Lihat situs</a>}
 </section>;
}
