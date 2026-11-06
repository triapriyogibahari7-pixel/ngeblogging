import {handleDomainRequest as domainRequest} from './domain-handler.mjs';
import {saasReadiness} from './domain-saas-readiness-stage5.mjs';
const PATH='/api/domains/reconcile';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const SKIP=new Set(['pending_deletion','deleted','blocked','test_blocked','test_failed']);
function json(status,body){return new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});}
function providerFor(row){return row.provider==='cloudflare-full-zone'?'cloudflare-full-zone':row.provider==='cloudflare'?'cloudflare-custom-hostnames':null;}
function internalRequest(request,path,body){const url=new URL(request.url);url.pathname=path;url.search='';return new Request(url,{method:body?'POST':'GET',headers:{authorization:request.headers.get('authorization')||'',accept:'application/json',...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});}
export async function domainReconciliationResponse(request,env){
 const url=new URL(request.url);if(url.pathname!==PATH)return null;
 if(!['GET','POST'].includes(request.method))return json(405,{code:'METHOD_NOT_ALLOWED',error:'Gunakan GET untuk daftar atau POST untuk rekonsiliasi satu domain.'});
 if(!(request.headers.get('authorization')||'').startsWith('Bearer '))return json(401,{code:'AUTH_REQUIRED',error:'Masuk untuk merekonsiliasi domain situs Anda.'});
 let input={};
 if(request.method==='POST'){
  if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))return json(415,{code:'JSON_REQUIRED',error:'Gunakan JSON.'});
  const text=await request.text();if(text.length>4096)return json(413,{code:'BODY_TOO_LARGE',error:'Permintaan terlalu besar.'});
  try{input=JSON.parse(text);}catch{return json(400,{code:'INVALID_JSON',error:'JSON tidak valid.'});}
  if(!input||typeof input!=='object'||Array.isArray(input))return json(400,{code:'INVALID_JSON',error:'Objek JSON diperlukan.'});
 }else input={siteId:url.searchParams.get('siteId')};
 const siteId=String(input.siteId||'');if(!UUID.test(siteId))return json(400,{code:'INVALID_SITE',error:'Situs tidak valid.'});
 const list=internalRequest(request,'/api/domains/list');const listUrl=new URL(list.url);listUrl.search='?siteId='+encodeURIComponent(siteId);
 const listed=await domainRequest(new Request(listUrl,list),env);if(!listed.ok)return listed;
 const payload=await listed.json().catch(()=>null);if(!Array.isArray(payload?.domains))return json(503,{code:'DOMAIN_LIST_UNVERIFIED',error:'Daftar domain belum dapat diverifikasi.'});
 const domains=payload.domains.filter(row=>row?.site_id===siteId&&row.id&&row.hostname);
 const saasEnv={...env,CUSTOM_DOMAIN_PROVIDER:'cloudflare-custom-hostnames'};
 const ready=saasReadiness(saasEnv);
 const inventory=domains.map(row=>({id:row.id,hostname:row.hostname,provider:row.provider,status:row.status,eligible:!SKIP.has(row.status)&&(providerFor(row)==='cloudflare-full-zone'||providerFor(row)==='cloudflare-custom-hostnames'&&ready.configurationReady)}));
 if(request.method==='GET')return json(200,{siteId,mode:'inventory',domains:inventory,scope:'current-authorized-list-response',inventoryComplete:false,note:'Daftar mengikuti batas handler dasar; bukan inventaris global atau bukti DNS siap.'});
 const domainId=String(input.domainId||'');if(!UUID.test(domainId))return json(400,{code:'INVALID_DOMAIN_ID',error:'Pilih satu domain dari daftar situs.'});
 const domain=domains.find(row=>row.id===domainId);if(!domain)return json(404,{code:'DOMAIN_NOT_IN_SITE',error:'Domain tidak ditemukan pada daftar situs yang diizinkan.'});
 if(SKIP.has(domain.status))return json(409,{code:'DOMAIN_RECONCILIATION_BLOCKED',error:'Domain yang dilepas atau diblokir tidak akan dipasang ulang.'});
 const provider=providerFor(domain);
 if(!provider)return json(409,{code:'DOMAIN_MIGRATION_REQUIRED',error:'Provider domain tidak dikenali; tidak diubah otomatis.'});
 if(provider==='cloudflare-custom-hostnames'&&!ready.configurationReady)return json(503,{code:'SAAS_CONFIGURATION_NOT_READY',error:'Konfigurasi SaaS belum siap. Provider domain tidak diubah.',readiness:ready});
 const runtimeEnv={...env,CUSTOM_DOMAIN_PROVIDER:provider};
 try{
  const refreshed=await domainRequest(internalRequest(request,'/api/domains/refresh',{domainId}),runtimeEnv);
  const result=await refreshed.json().catch(()=>null);
  if(!refreshed.ok)return json(refreshed.status,{siteId,domainId,hostname:domain.hostname,outcome:'needs_attention',code:typeof result?.code==='string'?result.code:'DOMAIN_REFRESH_FAILED',error:typeof result?.error==='string'?result.error:'Rekonsiliasi belum berhasil.',checkedAt:new Date().toISOString(),mayHaveChangedProvider:true,publicSiteVerified:false});
  if(result?.domain?.id!==domainId||result.domain.site_id!==siteId||result.domain.hostname!==domain.hostname||result.domain.provider!==domain.provider)return json(502,{code:'DOMAIN_RESULT_MISMATCH',error:'Hasil tidak cocok dengan domain, situs, atau provider tersimpan. Perubahan backend mungkin telah terjadi; ini bukan rollback.'});
  return json(200,{siteId,domainId,hostname:domain.hostname,outcome:'refresh_completed',domain:result.domain,workerDomains:result.workerDomains||null,instructions:result.instructions||null,checkedAt:new Date().toISOString(),mayHaveChangedProvider:true,publicSiteVerified:false,note:'Refresh mengikuti provider tersimpan, bukan migrasi. Audit publik terpisah tetap diperlukan.'});
 }catch{return json(503,{siteId,domainId,hostname:domain.hostname,outcome:'unknown',code:'RECONCILIATION_OUTCOME_UNKNOWN',error:'Hasil belum dapat dipastikan. Periksa status sebelum mengulangi; provider mungkin sudah berubah.',mayHaveChangedProvider:true,publicSiteVerified:false});}
}
