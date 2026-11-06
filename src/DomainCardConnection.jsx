import React,{useEffect,useRef,useState} from 'react';
import {ExternalLink,RefreshCw} from 'lucide-react';
import {getVerifiedSession} from './lib/auth-session-v76.js';
import {publicAuditContext,readPublicAuditPayload,publicAuditRowView} from './lib/domain-public-audit-view.mjs';
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
  const timer=setTimeout(()=>{if(!current())return;controller.abort();active.current=null;setBusy(false);setNotice('Batas waktu tercapai. Backend mungkin sudah berubah; muat ulang sebelum mengulangi.');setResult(previous=>({...previous,scope,httpsState:'Pemeriksaan kehabisan waktu'}));task.finish();},45000);
  async function api(path,token,body){
   const response=await fetch(path,{method:'POST',redirect:'error',cache:'no-store',credentials:'omit',signal:controller.signal,headers:{authorization:'Bearer '+token,accept:'application/json','content-type':'application/json'},body:JSON.stringify(body)});
   if(response.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')throw Error('Respons server bukan hasil JSON yang terverifikasi.');
   const payload=await response.json();
   if(!response.ok)throw Error((typeof payload?.error==='string'?payload.error:'Permintaan belum berhasil.')+(payload?.code?' ('+String(payload.code).slice(0,100)+')':''));
   return payload;
  }
  let accepted=null,reconcileError='';
  try{
   const auth=await getVerifiedSession({force:true});if(!current())return;
   if(auth?.verification!=='verified'||!auth?.user?.id||!auth?.session?.access_token)throw Error('Sesi akun perlu diverifikasi kembali.');
   try{
    const connected=await api('/api/domains/reconcile',auth.session.access_token,{siteId:site.id,domainId:domain.id});if(!current())return;
    if(connected.outcome!=='refresh_completed'||connected.domain?.id!==domain.id||connected.domain?.site_id!==site.id||normalize(connected.domain.hostname)!==normalize(domain.hostname))throw Error('Hasil rekonsiliasi tidak cocok dengan domain situs aktif.');
    accepted=connected.domain;
   }catch(error){if(!current())return;reconcileError=error?.message||'Rekonsiliasi belum berhasil.';}
   const providerReady=Boolean(accepted&&accepted.status==='active'&&accepted.provider_status==='active'&&accepted.ssl_status==='active');
   const providerCheckedAt=Date.now();
   setResult({scope,providerCheckedAt,providerReady,providerState:accepted?(providerReady?'Aktif menurut provider':'Provider masih menunggu'): 'Rekonsiliasi belum berhasil',httpsReady:false,httpsState:'Sedang diaudit'});
   setNotice(reconcileError?reconcileError+' Audit HTTPS tetap dicoba secara terpisah.':'');
   const payload=await api('/api/domains/audit',auth.session.access_token,{siteId:site.id});if(!current())return;
   const authAfter=await getVerifiedSession({force:true});if(!current())return;
   if(authAfter?.verification!=='verified'||authAfter?.user?.id!==auth.user.id){accepted=null;setResult(null);throw Error('Akun berubah; hasil pemeriksaan dibatalkan.');}
   if(payload.site?.slug!==site.slug)throw Error('Hasil audit tidak cocok dengan alamat situs aktif.');
   const rows=domains.some(row=>row.id===domain.id)?domains:[...domains,domain];
   const context=publicAuditContext(site,rows.map(row=>accepted&&row.id===accepted.id?accepted:row));
   const audit=readPublicAuditPayload(payload,context),age=Date.now()-Date.parse(audit.checkedAt);
   if(age < -60000||age>AGE)throw Error('Hasil audit sudah kedaluwarsa atau waktu tidak valid.');
   const row=audit.results.find(item=>normalize(item.address)===normalize(domain.hostname));
   if(!row)throw Error('Audit belum mencakup hostname domain ini.');
   const published=payload.site.status==='active'&&payload.site.isPublic===true;
   const httpsReady=row.auditStatus==='passed'&&row.https===true&&row.reachable===true;
   setNow(Date.now());setResult({scope,providerCheckedAt,providerReady,providerState:accepted?(providerReady?'Aktif menurut provider':'Provider masih menunggu'):'Rekonsiliasi belum berhasil',httpsReady,httpsState:publicAuditRowView(row).label,published,checkedAt:audit.checkedAt});
   setNotice([reconcileError,httpsReady?'HTTPS merespons halaman publik; identitas konten dan nameserver belum diverifikasi.':row.check||'Audit HTTPS belum berhasil.'].filter(Boolean).join(' '));
  }catch(error){if(current()){setNotice(error?.message||'Koneksi belum dapat dipastikan.');setResult(previous=>({...previous,scope,httpsReady:false,httpsState:'Pemeriksaan belum berhasil'}));}}
  finally{
   clearTimeout(timer);
   if(current()&&accepted){onDomain?.(accepted);if(typeof reload==='function')void Promise.resolve(reload(accepted)).catch(()=>{});}
   if(active.current===controller){active.current=null;setBusy(false);}task.finish();
  }
 }
 const shown=result?.scope===scope?result:null;
 const providerAge=shown?.providerCheckedAt?now-shown.providerCheckedAt:Infinity;
 const providerFresh=providerAge>=-60000&&providerAge<=AGE;
 const auditAge=shown?.checkedAt?now-Date.parse(shown.checkedAt):Infinity;
 const fresh=auditAge>=-60000&&auditAge<=AGE;
 const href=publicUrl(domain?.hostname);
 const published=site?.status==='active'&&site?.is_public===true;
 const ready=Boolean(href&&fresh&&providerFresh&&shown?.providerReady&&shown?.httpsReady&&shown?.published&&published);
 function item(label,ok,text){return h('span',{className:ok?'active':'pending',style:{display:'inline-block',padding:'4px 8px',borderRadius:'6px',background:ok?'#e8f7ee':'#fff5d6',color:ok?'#176438':'#725600'}},label+': '+text);}
 const initial=busy?'Sedang diperiksa':'Belum diperiksa';
 const httpsText=shown?.checkedAt&&!fresh?'Hasil kedaluwarsa — periksa ulang':shown?.httpsState||initial;
 const providerText=shown?.providerCheckedAt&&!providerFresh?'Hasil kedaluwarsa — periksa ulang':shown?.providerState||initial;
 return h('section',{'data-domain-card-connection':'status-v2','aria-busy':busy},
  h('div',{style:{display:'flex',gap:'6px',flexWrap:'wrap',marginBottom:'8px'}},item('Provider',providerFresh&&shown?.providerReady,providerText),item('Nameserver',false,'Belum diuji langsung'),item('DNS',false,'Belum diuji langsung'),item('HTTPS',fresh&&shown?.httpsReady,httpsText),item('Publikasi',published,published?'Diterbitkan':'Draf')),
  h('div',{style:{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap'}},
   h('button',{type:'button',onClick:check,disabled:disabled||busy||!href||domain?.status==='pending_deletion'},h(RefreshCw,{className:busy?'spin':''}),busy?'Memeriksa koneksi…':'Periksa koneksi'),
   ready?h('a',{href,target:'_blank',rel:'noopener noreferrer',title:'Provider aktif dan audit HTTPS lolos; bukan bukti nameserver atau identitas konten.',style:{display:'inline-flex',alignItems:'center',gap:'4px',fontSize:'12px',padding:'6px 10px'}},h(ExternalLink,{size:14}),'Lihat situs'):h('span',{'aria-disabled':'true',title:'Menunggu provider aktif, audit HTTPS terbaru, dan situs diterbitkan',style:{fontSize:'12px',opacity:0.6}},'Lihat situs — belum siap')),
  h('small',null,'Status provider tidak membuktikan nameserver atau DNS cocok. Pemeriksaan tidak berjalan otomatis saat halaman dibuka; hasil berlaku 5 menit.'),
  notice?h('p',{role:'status','aria-live':'polite'},notice):null,
  shown?.checkedAt?h('small',null,'Diperiksa '+new Date(shown.checkedAt).toLocaleString('id-ID')+' · berlaku 5 menit'):null);
}
