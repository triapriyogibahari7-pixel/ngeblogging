import React,{useEffect,useRef,useState} from 'react';
import {Check,ShieldCheck,Zap} from 'lucide-react';
import {getVerifiedSession} from './lib/auth-session-v76.js';
import {publicAuditContext,publicAuditRowView,readPublicAuditPayload,publicAuditSummary} from './lib/domain-public-audit-view.mjs';
const h=React.createElement;
export default function DomainPublicAudit({site,domains=[],disabled=false}){
 const context=publicAuditContext(site,domains),scope=context.scope;
 const scopeRef=useRef(scope),active=useRef(null);
 scopeRef.current=scope;
 const [busy,setBusy]=useState(false),[result,setResult]=useState(null),[notice,setNotice]=useState('');
 useEffect(()=>{active.current?.abort();active.current=null;setBusy(false);setResult(null);setNotice('');return()=>{active.current?.abort();active.current=null;};},[scope,disabled]);
 async function runAudit(){
  if(active.current||disabled||!site?.id||!site?.slug)return;
  const c=new AbortController();active.current=c;setBusy(true);setNotice('');setResult(null);
  const current=()=>active.current===c&&!c.signal.aborted&&scopeRef.current===scope;
  const timer=setTimeout(()=>{if(!current())return;c.abort();active.current=null;setBusy(false);setNotice('Audit melewati batas waktu. Status koneksi domain tidak diubah.');},30000);
  try{
   const auth=await getVerifiedSession({force:true});if(!current())return;
   if(auth?.verification!=='verified'||!auth?.user?.id||!auth?.session?.access_token)throw Error('Sesi akun belum dapat diverifikasi. Hasil audit tidak ditampilkan.');
   const response=await fetch('/api/domains/audit',{method:'POST',redirect:'error',cache:'no-store',credentials:'omit',signal:c.signal,headers:{authorization:'Bearer '+auth.session.access_token,'content-type':'application/json',accept:'application/json'},body:JSON.stringify({siteId:site.id})});
   if(!current())return;
   if(response.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')throw Error('Respons layanan audit belum dapat diverifikasi.');
   const payload=await response.json();if(!current())return;
   if(!response.ok)throw Error(typeof payload?.error==='string'?payload.error.slice(0,500):'Audit belum dapat diselesaikan oleh server.');
   const next=await getVerifiedSession({force:true});if(!current())return;
   if(next?.verification!=='verified'||next?.user?.id!==auth.user.id)throw Error('Sesi akun berubah. Hasil audit tidak ditampilkan.');
   const audit=readPublicAuditPayload(payload,context);if(current())setResult({scope,audit});
  }catch(error){if(current())setNotice((error?.message||'Audit belum dapat diselesaikan.')+' Status koneksi domain tidak diubah.');}
  finally{clearTimeout(timer);if(active.current===c){active.current=null;setBusy(false);}}
 }
 const shown=result?.scope===scope?result.audit:null,summary=publicAuditSummary(shown);
 return h('section',{className:'sv124-card sv124-domain-audit','data-public-audit-view':'separate-connection-status'},
  h('header',null,h('div',null,h('small',null,'AUDIT PUBLIK SERVER-SIDE'),h('h2',null,'Akses publik situs aktif'),h('p',null,'Audit HTTPS, HTTP, HTML, redirect, dan waktu respons. Hasilnya terpisah dari status domain terhubung.')),h('button',{type:'button',className:'sv124-secondary',onClick:runAudit,disabled:disabled||busy||!site?.id||!site?.slug},h(Zap),busy?'Memeriksa akses publik…':shown?'Audit ulang':'Audit akses publik')),
  busy?h('p',{role:'status','aria-live':'polite'},'Memeriksa akses publik tanpa mengubah konfigurasi domain…'):h('div',{className:'sv124-audit-summary '+summary.tone,role:'status'},h('b',null,summary.title),h('span',null,summary.message)),
  notice?h('p',{role:'status','aria-live':'polite'},notice):null,
  shown?h('p',null,'Waktu audit: ',h('time',{dateTime:shown.checkedAt},new Date(shown.checkedAt).toLocaleString('id-ID'))):null,
  shown?h('div',{className:'sv124-audit-results'},shown.results.map((item,index)=>{const view=publicAuditRowView(item);return h('article',{key:item.address+':'+index},h('span',{className:view.tone},h(view.tone==='ok'?Check:ShieldCheck)),h('div',null,h('b',null,item.label||item.address),h('small',null,item.address+' · '+view.responseLabel+' · '+item.latencyMs+' ms'),h('small',null,view.connectionLabel),h('p',null,item.check)),h('i',null,view.label));})):null);
}
