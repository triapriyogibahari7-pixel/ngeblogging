import React,{useEffect,useRef,useState} from 'react';
import {ExternalLink,RefreshCw} from 'lucide-react';
import {getVerifiedSession} from './lib/auth-session-v76.js';
import {publicAuditContext,readPublicAuditPayload} from './lib/domain-public-audit-view.mjs';
const h=React.createElement,AGE=300000;
function normalize(value){return String(value||'').trim().toLowerCase().replace(/\.$/,'');}
function publicUrl(value){try{const host=normalize(value),url=new URL('https://'+host);return url.hostname===host&&!url.port&&!url.username&&!url.password&&url.pathname==='/'&&!url.search&&!url.hash?url.href:null;}catch{return null;}}
export default function DomainCardConnection({site,domain,domains=[],disabled=false,beginOperation,onDomain,reload}){
 const scope=JSON.stringify([site?.id,site?.slug,site?.status,site?.is_public,domain?.id,domain?.hostname]);
 const scopeRef=useRef(scope),active=useRef(null);scopeRef.current=scope;
 const [busy,setBusy]=useState(false),[result,setResult]=useState(null),[notice,setNotice]=useState(''),[now,setNow]=useState(Date.now());
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),10000);return()=>clearInterval(timer);},[]);
 useEffect(()=>{active.current?.abort();active.current=null;setBusy(false);setResult(null);setNotice('');return()=>{active.current?.abort();active.current=null;};},[scope]);
 async function check(){
  if(active.current||disabled||!site?.id||!domain?.id)return;
  if(typeof beginOperation!=='function'){setNotice('Pengunci operasi halaman belum terhubung. Pemeriksaan tidak dijalankan.');return;}
  const task=beginOperation('connection:'+domain.id);if(!task)return;
  const controller=new AbortController();active.current=controller;setBusy(true);setResult(null);setNotice('');
  const current=()=>active.current===controller&&!controller.signal.aborted&&scopeRef.current===scope&&task.current();
  const timer=setTimeout(()=>{if(!current())return;controller.abort();active.current=null;setBusy(false);setNotice('Batas waktu tercapai. Backend mungkin sudah berubah; muat ulang sebelum mengulangi.');task.finish();},45000);
  async function api(path,token,body){
   const response=await fetch(path,{method:'POST',redirect:'error',cache:'no-store',credentials:'omit',signal:controller.signal,headers:{authorization:'Bearer '+token,accept:'application/json','content-type':'application/json'},body:JSON.stringify(body)});
   if(response.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')throw Error('Respons server bukan hasil JSON yang terverifikasi.');
   const payload=await response.json();
   if(!response.ok)throw Error((typeof payload?.error==='string'?payload.error:'Permintaan belum berhasil.')+(payload?.code?' ('+String(payload.code).slice(0,100)+')':''));
   return payload;
  }
  let accepted=null;
  try{
   const auth=await getVerifiedSession({force:true});if(!current())return;
   if(auth?.verification!=='verified'||!auth?.user?.id||!auth?.session?.access_token)throw Error('Sesi akun perlu diverifikasi kembali.');
   const connected=await api('/api/domains/reconcile',auth.session.access_token,{siteId:site.id,domainId:domain.id});if(!current())return;
   if(connected.outcome!=='refresh_completed'||connected.domain?.id!==domain.id||connected.domain?.site_id!==site.id||normalize(connected.domain.hostname)!==normalize(domain.hostname))throw Error('Hasil rekonsiliasi tidak cocok dengan domain situs aktif.');
   accepted=connected.domain;
   const providerReady=accepted.status==='active'&&accepted.provider_status==='active'&&accepted.ssl_status==='active';
   const dnsCheckedAt=Date.now();setResult({scope,dnsCheckedAt,dnsReady:providerReady,httpsReady:false,published:site.status==='active'&&site.is_public===true});
   const payload=await api('/api/domains/audit',auth.session.access_token,{siteId:site.id});if(!current())return;
   const authAfter=await getVerifiedSession({force:true});if(!current())return;
   if(authAfter?.verification!=='verified'||authAfter?.user?.id!==auth.user.id)throw Error('Akun berubah; hasil pemeriksaan dibatalkan.');
   if(payload.site?.slug!==site.slug)throw Error('Hasil audit tidak cocok dengan alamat situs aktif.');
   const context=publicAuditContext(site,domains.map(row=>row.id===accepted.id?accepted:row));
   const audit=readPublicAuditPayload(payload,context),age=Date.now()-Date.parse(audit.checkedAt);
   if(age < -60000||age>AGE)throw Error('Hasil audit sudah kedaluwarsa atau waktu tidak valid.');
   const row=audit.results.find(item=>normalize(item.address)===normalize(domain.hostname));
   if(!row)throw Error('Audit belum mencakup hostname domain ini.');
   const published=payload.site.status==='active'&&payload.site.isPublic===true;
   const httpsReady=row.auditStatus==='passed'&&row.https===true&&row.reachable===true;
   setNow(Date.now());setResult({scope,dnsCheckedAt,dnsReady:providerReady,httpsReady,published,checkedAt:audit.checkedAt});
   setNotice(httpsReady&&published?'HTTPS merespons halaman publik. Identitas konten situs belum diverifikasi.':row.check||'Koneksi situs belum siap.');
  }catch(error){if(current())setNotice(error?.message||'Koneksi belum dapat dipastikan.');}
  finally{
   clearTimeout(timer);
   if(current()&&accepted){onDomain?.(accepted);if(typeof reload==='function')void Promise.resolve(reload(accepted)).catch(()=>{});}
   if(active.current===controller){active.current=null;setBusy(false);}task.finish();
  }
 }
 const shown=result?.scope===scope?result:null;
 const dnsFresh=shown&&now-shown.dnsCheckedAt<=AGE;
 const auditAge=shown?.checkedAt?now-Date.parse(shown.checkedAt):Infinity;
 const fresh=auditAge>=-60000&&auditAge<=AGE;
 const href=publicUrl(domain?.hostname);
 const published=site?.status==='active'&&site?.is_public===true;
 const ready=Boolean(href&&fresh&&dnsFresh&&shown?.dnsReady&&shown?.httpsReady&&shown?.published&&published);
 function item(label,ok,text){return h('span',{className:ok?'active':'pending',style:{display:'inline-block',padding:'4px 8px',borderRadius:'6px',background:ok?'#e8f7ee':'#fff5d6',color:ok?'#176438':'#725600'}},label+': '+text);}
 return h('section',{'data-domain-card-connection':'stage4','aria-busy':busy},
  h('div',{style:{display:'flex',gap:'6px',flexWrap:'wrap',marginBottom:'8px'}},item('Nameserver',dnsFresh&&shown.dnsReady,dnsFresh&&shown.dnsReady?'Cocok saat pemeriksaan':'Belum terkonfirmasi'),item('DNS',dnsFresh&&shown.dnsReady,dnsFresh&&shown.dnsReady?'Terjawab':'Belum terkonfirmasi'),item('HTTPS',fresh&&shown?.httpsReady,fresh&&shown?.httpsReady?'Lolos audit':'Belum terkonfirmasi'),item('Publikasi',published,published?'Diterbitkan':'Draf')),
  h('div',{style:{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap'}},
   h('button',{type:'button',onClick:check,disabled:disabled||busy||!href||domain?.status==='pending_deletion'},h(RefreshCw,{className:busy?'spin':''}),busy?'Memeriksa koneksi…':'Periksa koneksi'),
   ready?h('a',{href,target:'_blank',rel:'noopener noreferrer',style:{display:'inline-flex',alignItems:'center',gap:'4px',fontSize:'12px',padding:'6px 10px'}},h(ExternalLink,{size:14}),'Lihat situs'):h('span',{'aria-disabled':'true',title:'Menunggu DNS dan HTTPS terverifikasi serta situs diterbitkan',style:{fontSize:'12px',opacity:0.6}},'Lihat situs — belum siap')),
  notice?h('p',{role:'status','aria-live':'polite'},notice):null,
  shown?.checkedAt?h('small',null,'Diperiksa '+new Date(shown.checkedAt).toLocaleString('id-ID')+' · berlaku 5 menit'):null);
}
