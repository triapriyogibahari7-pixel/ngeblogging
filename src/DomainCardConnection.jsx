import React,{useEffect,useRef,useState} from 'react';
import {ExternalLink,RefreshCw} from 'lucide-react';
import {getVerifiedSession} from './lib/auth-session-v76.js';
import {publicAuditContext,readPublicAuditPayload,publicAuditRowView} from './lib/domain-public-audit-view.mjs';
import {checkCustomDomainDns} from '../server/custom-domain-dns-readiness.mjs';
const h=React.createElement,AGE=300000,RELEASE='domain-card-dns-v4-auto-20261106';
const normalize=value=>String(value||'').trim().toLowerCase().replace(/\.$/,'');
function publicUrl(value){try{const host=normalize(value),url=new URL('https://'+host);return url.hostname===host&&!url.port&&!url.username&&!url.password&&url.pathname==='/'&&!url.search&&!url.hash?url.href:null;}catch{return null;}}
export default function DomainCardConnection({site,domain,domains=[],disabled=false,beginOperation,onDomain,reload}){
 const expected=Array.isArray(domain?.ownership_verification?.required_name_servers)?domain.ownership_verification.required_name_servers:[];
 const zoneName=domain?.ownership_verification?.zone_name||domain?.hostname;
 const scope=JSON.stringify([site?.id,site?.slug,site?.status,site?.is_public,domain?.id,domain?.hostname,domain?.provider,zoneName,expected]);
 const scopeRef=useRef(scope),active=useRef(null),autoScope=useRef(null);scopeRef.current=scope;
 const [busy,setBusy]=useState(false),[result,setResult]=useState(null),[notice,setNotice]=useState(''),[now,setNow]=useState(Date.now());
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),10000);return()=>clearInterval(timer);},[]);
 useEffect(()=>{active.current?.abort();active.current=null;autoScope.current=null;setBusy(false);setResult(null);setNotice('');return()=>{active.current?.abort();active.current=null;};},[scope]);
 useEffect(()=>{
  if(disabled||!site?.id||!domain?.id||domain?.status==='pending_deletion'||!publicUrl(domain?.hostname)||typeof beginOperation!=='function')return;
  const timer=setInterval(()=>{if(autoScope.current===scope)return;if(check())autoScope.current=scope;},500);
  return()=>clearInterval(timer);
 },[scope,disabled,beginOperation,domain?.status]);
 function check(){
  if(active.current||disabled||!site?.id||!domain?.id||domain?.status==='pending_deletion')return false;
  if(typeof beginOperation!=='function'){setNotice('Pengunci operasi halaman belum terhubung.');return false;}
  const task=beginOperation('connection:'+domain.id);if(!task)return false;
  const controller=new AbortController();active.current=controller;autoScope.current=scope;setBusy(true);setResult(null);setNotice('');
  void run(controller,task);return true;
 }
 async function run(controller,task){
  const current=()=>active.current===controller&&!controller.signal.aborted&&scopeRef.current===scope&&task.current();
  const update=value=>{if(current())setResult(previous=>({...previous,scope,...value}));};
  let finished=false;const finish=()=>{if(!finished){finished=true;task.finish();}};
  const timer=setTimeout(()=>{if(!current())return;setNotice('Pemeriksaan kehabisan waktu. Hasil DNS memiliki waktu pemeriksaan sendiri.');update({httpsReady:false,httpsState:'Pemeriksaan kehabisan waktu'});controller.abort();active.current=null;setBusy(false);finish();},45000);
  const dnsTask=Promise.resolve().then(()=>checkCustomDomainDns({hostname:domain.hostname,zoneName,expectedNameservers:expected})).then(dns=>{if(current()){setNow(Date.now());update({dns});}}).catch(()=>update({dnsError:'Pemeriksaan DNS tidak dapat dijalankan; periksa hostname dan daftar nameserver.'}));
  async function api(path,token,body){
   const response=await fetch(path,{method:'POST',redirect:'error',cache:'no-store',credentials:'omit',signal:controller.signal,headers:{authorization:'Bearer '+token,accept:'application/json','content-type':'application/json'},body:JSON.stringify(body)});
   if(response.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')throw Error('Respons server bukan JSON terverifikasi.');
   const payload=await response.json();if(!response.ok)throw Error((typeof payload?.error==='string'?payload.error:'Permintaan gagal.')+(payload?.code?' ('+String(payload.code).slice(0,100)+')':''));return payload;
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
   update({providerCheckedAt:Date.now(),providerReady,providerState:accepted?(providerReady?'Aktif menurut provider':'Provider masih menunggu'):'Rekonsiliasi gagal',httpsState:'Sedang diaudit'});
   setNotice(reconcileError);
   const payload=await api('/api/domains/audit',auth.session.access_token,{siteId:site.id});if(!current())return;
   const authAfter=await getVerifiedSession({force:true});if(!current())return;
   if(authAfter?.verification!=='verified'||authAfter?.user?.id!==auth.user.id){accepted=null;setResult(null);throw Error('Akun berubah; hasil dibatalkan.');}
   if(payload.site?.slug!==site.slug)throw Error('Audit tidak cocok dengan alamat situs aktif.');
   const rows=domains.some(row=>row.id===domain.id)?domains:[...domains,domain];
   const context=publicAuditContext(site,rows.map(row=>accepted&&row.id===accepted.id?accepted:row));
   const audit=readPublicAuditPayload(payload,context),age=Date.now()-Date.parse(audit.checkedAt);
   if(age < -60000||age>AGE)throw Error('Waktu audit tidak valid atau kedaluwarsa.');
   const row=audit.results.find(item=>normalize(item.address)===normalize(domain.hostname));if(!row)throw Error('Hostname ini belum tercakup audit.');
   const httpsReady=row.auditStatus==='passed'&&row.https===true&&row.reachable===true;
   setNow(Date.now());update({httpsReady,httpsState:publicAuditRowView(row).label,published:payload.site.status==='active'&&payload.site.isPublic===true,checkedAt:audit.checkedAt});
   setNotice([reconcileError,httpsReady?'Halaman publik merespons HTTPS; identitas konten belum diverifikasi.':row.check].filter(Boolean).join(' '));
  }catch(error){if(current()){setNotice(error?.message||'Pemeriksaan belum berhasil.');update({httpsReady:false,httpsState:'Pemeriksaan belum berhasil'});}}
  finally{
   await dnsTask;clearTimeout(timer);
   try{if(current()&&accepted){onDomain?.(accepted);if(typeof reload==='function')void Promise.resolve(reload(accepted)).catch(()=>{});}}catch{if(current())setNotice('Pemeriksaan selesai; pemuatan ulang data gagal.');}
   if(active.current===controller){active.current=null;setBusy(false);}finish();
  }
 }
 const shown=result?.scope===scope?result:null;
 const fresh=value=>{const age=now-(typeof value==='number'?value:Date.parse(value));return Number.isFinite(age)&&age>=-60000&&age<=AGE;};
 const dns=shown?.dns,checks=Array.isArray(dns?.checks)?dns.checks:[],dnsFresh=fresh(dns?.checkedAt);
 const diagnostics=(Array.isArray(dns?.diagnostics)?dns.diagnostics:[]).filter(row=>row&&['cloudflare-dns.com','dns.google'].includes(row.resolver)&&['A','AAAA','NS'].includes(row.type)).slice(0,24);
 const diagnosticText=value=>typeof value==='string'?value.replace(/[^a-zA-Z0-9_.-]/g,'').slice(0,80):'';
 const addressesReady=dnsFresh&&checks.length===2&&checks.every(row=>row.addressReady===true);
 const fullZone=domain?.provider==='cloudflare-full-zone',saas=domain?.provider==='cloudflare';
 const nsReady=dnsFresh&&checks.length===2&&checks.every(row=>row.nameserversMatch===true);
 const dnsUnavailable=checks.some(row=>row.a?.state==='unavailable'||row.aaaa?.state==='unavailable');
 const nxdomain=checks.some(row=>row.a?.state==='nxdomain'||row.aaaa?.state==='nxdomain');
 const pending=busy?'Sedang diperiksa':'Belum diperiksa';
 const dnsText=dns&&!dnsFresh?'Hasil kedaluwarsa':!dns?pending:addressesReady?'A/AAAA terjawab pada dua resolver':dnsUnavailable?'Pemeriksaan resolver server belum berhasil':nxdomain?'NXDOMAIN teramati; periksa detail':'Alamat A/AAAA belum konsisten atau belum tersedia';
 const nsText=!fullZone?(saas?'Tidak diwajibkan untuk provider SaaS':'Provider belum dikenali'):expected.length<2?'Daftar nameserver resmi belum lengkap':dns&&!dnsFresh?'Hasil kedaluwarsa':!dns?pending:nsReady?'Cocok pada dua resolver':checks.some(row=>row.ns?.state==='unavailable')?'Pemeriksaan NS di server belum berhasil':'Nameserver belum cocok atau belum konsisten';
 const href=publicUrl(domain?.hostname),published=site?.status==='active'&&site?.is_public===true;
 const httpsFresh=fresh(shown?.checkedAt),providerFresh=fresh(shown?.providerCheckedAt);
 const ready=Boolean(href&&addressesReady&&(fullZone?nsReady:saas)&&httpsFresh&&shown?.httpsReady&&providerFresh&&shown?.providerReady&&shown?.published&&published);
 function item(label,ok,text){return h('span',{className:ok?'active':'pending',style:{display:'inline-block',padding:'4px 8px',borderRadius:'6px',background:ok?'#e8f7ee':'#fff5d6',color:ok?'#176438':'#725600'}},label+': '+text);}
 return h('section',{'data-domain-card-connection':RELEASE,'aria-busy':busy},
  h('div',{style:{display:'flex',gap:'6px',flexWrap:'wrap',marginBottom:'8px'}},item('Provider',providerFresh&&shown?.providerReady,shown?.providerCheckedAt&&!providerFresh?'Hasil kedaluwarsa':shown?.providerState||pending),item('Nameserver',fullZone&&nsReady,nsText),item('DNS',addressesReady,dnsText),item('HTTPS',httpsFresh&&shown?.httpsReady,shown?.checkedAt&&!httpsFresh?'Hasil kedaluwarsa':shown?.httpsState||pending),item('Publikasi',published,published?'Diterbitkan':'Draf')),
  h('div',{style:{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap'}},h('button',{type:'button',onClick:check,disabled:disabled||busy||!href||domain?.status==='pending_deletion'},h(RefreshCw,{className:busy?'spin':''}),busy?'Memeriksa koneksi…':'Periksa koneksi'),ready?h('a',{href,target:'_blank',rel:'noopener noreferrer',style:{fontSize:'12px'}},h(ExternalLink,{size:14}),'Lihat situs'):h('span',{'aria-disabled':'true',style:{fontSize:'12px',opacity:0.6}},'Lihat situs — belum siap')),
  dns?h('details',null,h('summary',null,'Bukti DNS publik'),h('p',null,'Diperiksa '+new Date(dns.checkedAt).toLocaleString('id-ID')+'; hasil berlaku 5 menit. Ini bukan bukti HTTPS atau identitas konten.'),...checks.map(row=>h('p',{key:row.resolver},row.resolver+' · NS ['+row.ns.state+']: '+row.ns.answers.join(', ')+' · A ['+row.a.state+']: '+row.a.answers.join(', ')+' · AAAA ['+row.aaaa.state+']: '+row.aaaa.answers.join(', '))),diagnostics.length?h('div',{'data-dns-server-diagnostics':true},h('p',null,'Diagnostik pemeriksaan server'),...diagnostics.map((row,index)=>h('p',{key:index},row.resolver+' · '+row.type+' · '+(diagnosticText(row.reason)||'UNKNOWN')+(diagnosticText(row.phase)?' · fase '+diagnosticText(row.phase):'')+(Number.isInteger(row.httpStatus)&&row.httpStatus>0&&row.httpStatus<=599?' · HTTP '+row.httpStatus:'')+(Number.isInteger(row.dnsStatus)&&row.dnsStatus>=0&&row.dnsStatus<=65535?' · DNS '+row.dnsStatus:'')+(diagnosticText(row.code)?' · kode '+diagnosticText(row.code):'')))):null):null,
  shown?.dnsError?h('p',{role:'status'},shown.dnsError):null,
  notice?h('p',{role:'status','aria-live':'polite'},notice):null);
}
