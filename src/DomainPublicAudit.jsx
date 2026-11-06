import React,{useEffect,useRef,useState} from 'react';
import {Check,ShieldCheck,Zap,ExternalLink} from 'lucide-react';
import {getVerifiedSession} from './lib/auth-session-v76.js';
import {publicAuditContext,publicAuditRowView,readPublicAuditPayload,publicAuditSummary} from './lib/domain-public-audit-view.mjs';
const h=React.createElement,MAX_AGE=300000;
export default function DomainPublicAudit({site,domains=[],disabled=false}){
 const context=publicAuditContext(site,domains),scope=context.scope;
 const scopeRef=useRef(scope),active=useRef(null);scopeRef.current=scope;
 const [busy,setBusy]=useState(false),[result,setResult]=useState(null),[notice,setNotice]=useState(''),[now,setNow]=useState(Date.now());
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),10000);return()=>clearInterval(timer);},[]);
 useEffect(()=>{active.current?.abort();active.current=null;setBusy(false);setResult(null);setNotice('');return()=>{active.current?.abort();active.current=null;};},[scope,disabled]);
 async function runAudit(){
  if(active.current||disabled||!site?.id||!site?.slug)return;
  const c=new AbortController();active.current=c;setBusy(true);setNotice('');setResult(null);
  const current=()=>active.current===c&&!c.signal.aborted&&scopeRef.current===scope;
  const timer=setTimeout(()=>{if(!current())return;c.abort();active.current=null;setBusy(false);setNotice('Pemeriksaan melewati batas waktu. Koneksi belum dapat dipastikan.');},30000);
  try{
   const auth=await getVerifiedSession({force:true});if(!current())return;
   if(auth?.verification!=='verified'||!auth?.user?.id||!auth?.session?.access_token)throw Error('Sesi akun belum dapat diverifikasi.');
   const response=await fetch('/api/domains/audit',{method:'POST',redirect:'error',cache:'no-store',credentials:'omit',signal:c.signal,headers:{authorization:'Bearer '+auth.session.access_token,'content-type':'application/json',accept:'application/json'},body:JSON.stringify({siteId:site.id})});
   if(!current())return;
   if(response.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')throw Error('Respons pemeriksaan belum dapat diverifikasi.');
   const payload=await response.json();if(!current())return;
   if(!response.ok)throw Error(typeof payload?.error==='string'?payload.error.slice(0,500):'Server belum dapat menyelesaikan pemeriksaan.');
   const next=await getVerifiedSession({force:true});if(!current())return;
   if(next?.verification!=='verified'||next?.user?.id!==auth.user.id)throw Error('Sesi akun berubah. Hasil tidak ditampilkan.');
   const audit=readPublicAuditPayload(payload,context);
   const age=Date.now()-Date.parse(audit.checkedAt);
   if(age < -60000||age>MAX_AGE)throw Error('Waktu hasil pemeriksaan tidak cukup baru. Periksa kembali.');
   if(current()){setNow(Date.now());setResult({scope,audit});}
  }catch(error){if(current())setNotice((error?.message||'Pemeriksaan belum dapat diselesaikan.')+' Status DNS tidak diubah.');}
  finally{clearTimeout(timer);if(active.current===c){active.current=null;setBusy(false);}}
 }
 const shown=result?.scope===scope?result.audit:null;
 const fresh=Boolean(shown&&now-Date.parse(shown.checkedAt)<=MAX_AGE&&now-Date.parse(shown.checkedAt)>=-60000);
 const summary=publicAuditSummary(fresh?shown:null);
 const items=context.allowedHostnames.map(address=>({address,item:fresh?shown.results.find(row=>row.address===address):null}));
 return h('section',{className:'sv124-card sv124-domain-audit','data-public-audit-view':'verified-public-connection'},
  h('header',null,h('div',null,h('small',null,'PEMERIKSAAN KONEKSI PUBLIK'),h('h2',null,'DNS terjangkau dan akses HTTPS'),h('p',null,'Periksa alamat gratis dan custom domain situs aktif. Hijau menandakan audit HTTPS berhasil, bukan bukti delegasi nameserver atau kecocokan konten situs.')),h('button',{type:'button',className:'sv124-secondary',onClick:runAudit,disabled:disabled||busy||!site?.id||!site?.slug},h(Zap),busy?'Memeriksa koneksi…':'Periksa semua alamat')),
  busy?h('p',{role:'status','aria-live':'polite'},'Memeriksa HTTPS, respons HTTP, HTML, redirect, dan waktu respons melalui server…'):h('div',{className:'sv124-audit-summary '+summary.tone,role:'status'},h('b',null,summary.title),h('span',null,shown&&!fresh?'Hasil sebelumnya kedaluwarsa. Jalankan pemeriksaan ulang.':summary.message)),
  notice?h('p',{role:'status','aria-live':'polite'},notice):null,
  shown?h('p',null,'Waktu pemeriksaan: ',h('time',{dateTime:shown.checkedAt},new Date(shown.checkedAt).toLocaleString('id-ID')),' · berlaku 5 menit'):null,
  h('div',{className:'sv124-audit-results'},items.map(({address,item})=>{
   const view=item?publicAuditRowView(item):{tone:'muted',label:shown&&!fresh?'Perlu diperiksa ulang':'Belum diperiksa'};
   const passed=Boolean(item&&item.auditStatus==='passed'&&item.https===true&&item.reachable===true);
   return h('article',{key:address},h('span',{className:view.tone},h(passed?Check:ShieldCheck)),
    h('div',null,h('b',null,address),h('small',null,view.label),item?h('small',null,view.responseLabel+' · '+item.latencyMs+' ms'):null,item?h('p',null,item.check):null,
     h('div',{className:'sv124-connection-actions',style:{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap'}},
      h('button',{type:'button',className:'sv124-secondary',onClick:runAudit,disabled:disabled||busy||!site?.id||!site?.slug},h(Zap),busy?'Memeriksa…':'Periksa koneksi'),
      passed?h('a',{href:'https://'+address,target:'_blank',rel:'noopener noreferrer',className:'sv124-secondary',style:{fontSize:'12px',padding:'6px 10px',display:'inline-flex',alignItems:'center',gap:'4px'},'aria-label':'Lihat situs '+address},h(ExternalLink,{size:14}),'Lihat situs'):null)));
  })));
}
