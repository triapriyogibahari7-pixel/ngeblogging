export const PUBLIC_AUDIT_RELEASE = 'public-audit-status-v1-20261103';
export const PUBLIC_AUDIT_TRANSPORT_RELEASE='public-audit-worker-fetch-v2-20261103';
export function auditFailureDiagnostic(error,{aborted=false,phase='request'}={}){
 const code=String(error?.code||error?.cause?.code||'').toUpperCase().slice(0,120);
 const message=(String(error?.message||'')+' '+String(error?.cause?.message||'')).slice(0,4096);
 let errorCode='AUDIT_NETWORK_UNCLASSIFIED',detail='Jaringan audit belum mendapat respons yang dapat dipastikan.';
 if(aborted||error?.name==='TimeoutError'){errorCode='AUDIT_TIMEOUT';detail='Audit melewati batas waktu; belum dapat disimpulkan bahwa domain terputus.';}
 else if(/(?:credentials|cache|redirect|RequestInitializerDict).*(?:not implemented|unsupported)|unsupported.*(?:credentials|cache|redirect)/i.test(message)){errorCode='AUDIT_FETCH_OPTION_UNSUPPORTED';detail='Runtime auditor menolak opsi permintaan. Ini bukan bukti koneksi domain terputus.';}
 else if(code==='1019'||/\b1019\b|loop limit|recursive worker/i.test(message)){errorCode='AUDIT_WORKER_LOOP_DETECTED';detail='Auditor mencapai batas loop Worker. Jalur audit perlu diperbaiki tanpa mengubah DNS domain.';}
 else if(code==='1042'||/\b1042\b|same.zone.*worker|worker.*same.zone/i.test(message)){errorCode='AUDIT_WORKER_ROUTING_BLOCKED';detail='Permintaan auditor ditolak oleh routing antar-Worker. Status koneksi domain tidak diubah.';}
 else if(['ENOTFOUND','EAI_AGAIN','EAI_NONAME'].includes(code)||/dns.*(?:lookup|resolution).*(?:fail|error)/i.test(message)){errorCode='AUDIT_DNS_LOOKUP_FAILED';detail='Resolver jaringan audit belum berhasil menemukan alamat tujuan; koneksi domain belum dapat disimpulkan.';}
 else if(/CERT_|ERR_TLS_|UNABLE_TO_VERIFY|DEPTH_ZERO_/.test(code)||/certificate|tls handshake|ssl handshake/i.test(message)){errorCode='AUDIT_TLS_FAILED';detail='Negosiasi TLS dari auditor belum berhasil. Tidak ada pengecualian sertifikat atau fallback HTTP yang digunakan.';}
 else if(phase==='response'){errorCode='AUDIT_RESPONSE_READ_FAILED';detail='Server sudah merespons, tetapi auditor belum berhasil membaca halaman publik.';}
 return {auditStatus:errorCode==='AUDIT_TIMEOUT'?'timeout':'network_error',errorCode,check:detail+' Kode: '+errorCode+'.'};
}
const REDIRECTS=new Set([301,302,303,307,308]);
const INCONCLUSIVE=new Set(['timeout','network_error','redirect_external','audit_budget_exhausted']);
function hostname(value){
 if(typeof value!=='string')return null;
 const name=value.trim().toLowerCase().replace(/\.$/,'');
 if(name.length>253||!name.includes('.')||!/[a-z]/.test(name.split('.').at(-1))||/(?:^|\.)(?:localhost|local|internal)$/.test(name))return null;
 return name.split('.').every(label=>/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))?name:null;
}
function cancel(body){try{Promise.resolve(body?.cancel?.()).catch(()=>{});}catch{}}
export async function auditPublicTarget(target,{fetchImpl=globalThis.fetch,timeoutMs=6000,allowedHostnames=[],published=true,now=Date.now}={}){
 const started=now(),name=hostname(target?.hostname),controller=new AbortController();
 let timer,reader,phase='request',lastStatus=0,lastType='',lastUrl='',https=null;
 const base={...target,address:name||String(target?.hostname||''),url:name?'https://'+name:''};
 const finish=(auditStatus,check)=>({...base,transportRelease:PUBLIC_AUDIT_TRANSPORT_RELEASE,auditStatus,reachable:auditStatus==='passed',https,httpStatus:lastStatus,contentType:lastType,finalUrl:lastUrl,latencyMs:Math.max(0,now()-started),check});
 if(!name)return finish('invalid_target','Alamat audit tidak valid; konfigurasi domain tidak diubah.');
 if(!published)return finish('not_published','Situs masih draf atau belum dipublikasikan. Ini bukan kegagalan koneksi domain.');
 if(!Number.isFinite(timeoutMs)||timeoutMs<=0)return finish('audit_budget_exhausted','Anggaran waktu audit habis. Status koneksi domain tidak diubah.');
 const allowed=new Set([name,...allowedHostnames.map(hostname).filter(Boolean)]),visited=new Set();
 const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Object.assign(Error('audit timeout'),{name:'TimeoutError'}));},Math.min(timeoutMs,10000));});
 const inspect=async()=>{
  let url=new URL('https://'+name+'/');url.searchParams.set('ngeblogging_domain_audit','public-status-v1');
  for(let hop=0;hop<=4;hop++){
   if(controller.signal.aborted)throw Object.assign(Error(),{name:'TimeoutError'});
   if(visited.has(url.href))return finish('redirect_loop','Redirect berulang; periksa aturan redirect, bukan nameserver secara otomatis.');
   visited.add(url.href);lastUrl=url.href;
   phase='request';
   const result=await fetchImpl(url,{method:'GET',redirect:'manual',cache:'no-store',signal:controller.signal,headers:{accept:'text/html,application/xhtml+xml;q=0.9,*/*;q=0.1','cache-control':'no-cache'},cf:{cacheTtl:0,cacheEverything:false}});
   if(controller.signal.aborted){cancel(result.body);throw Object.assign(Error(),{name:'TimeoutError'});}
   phase='response';
   lastStatus=result.status;lastType=String(result.headers.get('content-type')||'').toLowerCase();https=true;
   if(REDIRECTS.has(result.status)){
    const location=result.headers.get('location');cancel(result.body);
    let next;try{if(!location)throw Error();next=new URL(location,url);}catch{return finish('redirect_invalid','Respons redirect tidak memiliki tujuan yang valid.');}
    if(next.protocol!=='https:'){https=false;return finish('redirect_insecure','Alamat HTTPS dialihkan ke protokol non-HTTPS.');}
    if(next.username||next.password||(next.port&&next.port!=='443')||!allowed.has(hostname(next.hostname)))return finish('redirect_external','Redirect menuju alamat di luar daftar situs aktif; audit berhenti tanpa mengubah status koneksi domain.');
    if(hop===4)return finish('redirect_limit','Rantai redirect melebihi batas pemeriksaan.');
    url=next;continue;
   }
   if(!result.ok){cancel(result.body);return finish('http_error','Server merespons HTTP '+result.status+'. Keterjangkauan halaman berbeda dari status koneksi domain.');}
   if(!/^(?:text\/html|application\/xhtml\+xml)(?:\s*;|$)/.test(lastType)){cancel(result.body);return finish('non_html','Server merespons, tetapi kontennya bukan HTML publik.');}
   reader=result.body?.getReader?.();let size=0;const chunks=[];
   if(reader)while(size<8192){const part=await reader.read();if(controller.signal.aborted)throw Object.assign(Error(),{name:'TimeoutError'});if(part.done)break;const bytes=part.value.subarray(0,8192-size);chunks.push(bytes);size+=bytes.length;}
   const bytes=new Uint8Array(size);let at=0;for(const part of chunks){bytes.set(part,at);at+=part.length;}
   const html=new TextDecoder().decode(bytes);
   if(!/<!doctype\s+html|<(?:html|head|body)(?:\s|>)/i.test(html))return finish('non_html','Respons bertipe HTML belum berisi dokumen halaman publik yang dapat dikenali.');
   return finish('passed','HTML publik berhasil dimuat melalui HTTPS.');
  }
 };
 try{return await Promise.race([inspect(),deadline]);}
 catch(error){const diagnostic=auditFailureDiagnostic(error,{aborted:controller.signal.aborted,phase});return {...finish(diagnostic.auditStatus,diagnostic.check),errorCode:diagnostic.errorCode};}
 finally{clearTimeout(timer);controller.abort();if(reader){try{Promise.resolve(reader.cancel()).catch(()=>{});}catch{}try{reader.releaseLock();}catch{}}}
}
export async function auditPublicTargets(targets,{fetchImpl=globalThis.fetch,published=true,timeoutMs=6000,budgetMs=18000,concurrency=4,now=Date.now}={}){
 const list=(Array.isArray(targets)?targets:[]).slice(0,14),results=new Array(list.length),allowedHostnames=list.map(target=>target.hostname),deadline=now()+Math.min(18000,Math.max(0,budgetMs));let cursor=0;
 const worker=async()=>{for(;;){const index=cursor++;if(index>=list.length)return;const remaining=deadline-now();results[index]=await auditPublicTarget(list[index],{fetchImpl,published,allowedHostnames,now,timeoutMs:Math.min(timeoutMs,remaining)});}};
 await Promise.all(Array.from({length:Math.min(list.length,Math.max(1,Math.min(4,Math.floor(concurrency)||1)))},worker));
 return results;
}
export function summarizePublicAudit(results){
 const rows=Array.isArray(results)?results:[],passed=rows.filter(row=>row.auditStatus==='passed').length,skipped=rows.filter(row=>row.auditStatus==='not_published').length,inconclusive=rows.filter(row=>INCONCLUSIVE.has(row.auditStatus)).length;
 return {passed,total:rows.length,skipped,inconclusive,failed:rows.length-passed-skipped-inconclusive,allReachable:rows.length>0&&passed===rows.length};
}
