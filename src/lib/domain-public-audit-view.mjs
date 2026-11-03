export const PUBLIC_AUDIT_VIEW_RELEASE='public-audit-status-v1-20261103';
const LABELS=Object.freeze({passed:['Lolos audit HTTPS','ok'],not_published:['Belum diterbitkan','muted'],timeout:['Audit kehabisan waktu','muted'],network_error:['Audit belum tersedia','muted'],audit_budget_exhausted:['Audit belum selesai','muted'],redirect_external:['Redirect di luar situs','muted'],http_error:['Halaman merespons error','warn'],non_html:['Bukan HTML publik','warn'],redirect_insecure:['Redirect tidak aman','warn'],redirect_invalid:['Redirect tidak valid','warn'],redirect_loop:['Redirect berulang','warn'],redirect_limit:['Terlalu banyak redirect','warn'],invalid_target:['Alamat audit tidak valid','warn']});
const CONNECTIONS=Object.freeze({connected:'Domain terhubung',published:'Situs diterbitkan',draft:'Situs masih draf',pending:'Koneksi menunggu verifikasi'});
const normalize=value=>String(value||'').trim().toLowerCase().replace(/\.$/,'');
export function publicAuditContext(site,domains=[]){
 const rows=(Array.isArray(domains)?domains:[]).filter(row=>row?.site_id===site?.id&&row.status!=='pending_deletion').map(row=>({id:row.id,hostname:normalize(row.hostname),status:row.status,providerStatus:row.provider_status,sslStatus:row.ssl_status,addresses:(Array.isArray(row.ownership_verification?.additional_hostnames)?row.ownership_verification.additional_hostnames:[]).filter(item=>item?.enabled!==false&&item?.hostname).map(item=>normalize(item.hostname)).sort()})).sort((a,b)=>String(a.id).localeCompare(String(b.id)));
 const allowedHostnames=[...(site?.slug?[normalize(site.slug+'.ngeblogging.com')]:[]),...rows.flatMap(row=>[row.hostname,...row.addresses])];
 return {siteId:site?.id||'',allowedHostnames:[...new Set(allowedHostnames.filter(Boolean))],scope:JSON.stringify([site?.id,site?.slug,site?.status,site?.is_public,rows])};
}
export function publicAuditRowView(item={}){
 const [label,tone]=Object.hasOwn(LABELS,item.auditStatus)?LABELS[item.auditStatus]:['Hasil belum terverifikasi','muted'];
 return {label:item.auditStatus==='http_error'&&item.httpStatus?label+' (HTTP '+item.httpStatus+')':label,tone,connectionLabel:Object.hasOwn(CONNECTIONS,item.connectionStatus)?CONNECTIONS[item.connectionStatus]:'Status koneksi belum tersedia',responseLabel:item.httpStatus?'HTTP '+item.httpStatus:item.auditStatus==='not_published'?'Tidak diuji':'Belum ada respons HTTP'};
}
export function readPublicAuditPayload(payload,context){
 const fail=()=>{throw Object.assign(Error('Hasil audit belum cocok dengan situs aktif. Status koneksi domain tidak diubah.'),{code:'AUDIT_RESULT_UNVERIFIED'});};
 if(!context?.siteId||payload?.site?.id!==context.siteId||payload.auditRelease!==PUBLIC_AUDIT_VIEW_RELEASE||typeof payload.checkedAt!=='string'||!Number.isFinite(Date.parse(payload.checkedAt))||!Array.isArray(payload.results)||!payload.results.length||payload.results.length>14)fail();
 const allowed=new Set(context.allowedHostnames),results=payload.results.map(row=>{
  if(!row||typeof row.address!=='string'||row.address!==normalize(row.address)||!allowed.has(row.address)||!Object.hasOwn(LABELS,row.auditStatus)||row.reachable!==(row.auditStatus==='passed')||![true,false,null].includes(row.https)||!Number.isInteger(row.httpStatus)||row.httpStatus<0||row.httpStatus>599||!Number.isFinite(row.latencyMs)||row.latencyMs<0||typeof row.check!=='string'||row.check.length>2000)fail();
  if(row.auditStatus==='passed'&&(row.https!==true||row.httpStatus<200||row.httpStatus>=300||!/^text\/html(?:\s*;|$)|^application\/xhtml\+xml(?:\s*;|$)/i.test(String(row.contentType||''))))fail();
  return {...row};
 });
 const passed=results.filter(row=>row.auditStatus==='passed').length,skipped=results.filter(row=>row.auditStatus==='not_published').length,failed=results.filter(row=>publicAuditRowView(row).tone==='warn').length;
 return {results,passed,skipped,failed,inconclusive:results.length-passed-skipped-failed,total:results.length,allReachable:passed===results.length,checkedAt:payload.checkedAt};
}
export function publicAuditSummary(audit){
 if(!audit?.results?.length)return {title:'Audit akses publik belum dijalankan',message:'Audit ini opsional dan terpisah dari status koneksi domain.',tone:'muted'};
 if(audit.skipped===audit.total)return {title:'Situs belum diterbitkan',message:'Audit halaman publik tidak dijalankan untuk situs draf. Domain tidak dinyatakan terputus.',tone:'muted'};
 if(audit.allReachable)return {title:'Semua alamat lolos audit HTTPS',message:'Halaman publik berhasil dimuat pada waktu audit yang tercatat.',tone:'ok'};
 return {title:audit.passed+'/'+audit.total+' alamat lolos audit HTTPS',message:audit.failed+' masalah respons halaman; '+audit.inconclusive+' hasil belum dapat disimpulkan; '+audit.skipped+' alamat belum diterbitkan. Hasil audit tidak mengubah status koneksi domain.',tone:audit.failed?'warn':'muted'};
}
