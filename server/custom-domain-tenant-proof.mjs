const BASE='https://polvmlrhqoiflumibfqs.supabase.co',PATH='/.well-known/ngeblogging-domain-proof',UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const enc=new TextEncoder(),HEX=/^[a-f0-9]{64}$/;
function host(value){const s=String(value||'').toLowerCase().replace(/\.$/,'');if(s.length>253||!s.includes('.')||!/[a-z]/i.test(s.split('.').at(-1))||/(?:^|\.)(localhost|local|internal)$/.test(s)||s.split('.').some(x=>!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(x)))throw Error('HOST_INVALID');return s;}
async function key(secret,usage){if(typeof secret!=='string'||secret.length<32)throw Error('PROOF_KEY_REQUIRED');return crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,[usage]);}
export async function proofMac(secret,parts){const bytes=await crypto.subtle.sign('HMAC',await key(secret,'sign'),enc.encode(JSON.stringify(parts)));return [...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('');}
async function verify(secret,parts,signature){if(!HEX.test(signature||''))return false;return crypto.subtle.verify('HMAC',await key(secret,'verify'),Uint8Array.from(signature.match(/../g),x=>parseInt(x,16)),enc.encode(JSON.stringify(parts)));}
async function boundedJson(response,max=16384){const reader=response.body?.getReader();if(!reader)throw Error('BODY_REQUIRED');try{const decoder=new TextDecoder('utf-8',{fatal:true});let text='',size=0;for(;;){const p=await reader.read();if(p.done)break;size+=p.value.byteLength;if(size>max)throw Error('BODY_TOO_LARGE');text+=decoder.decode(p.value,{stream:true});}text+=decoder.decode();return JSON.parse(text);}finally{reader.cancel().catch(()=>{});}}
const json=(status,body)=>Response.json(body,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
export async function customDomainTenantProofResponse(request,env,{fetchImpl=globalThis.fetch,clock=Date.now}={}){
 const url=new URL(request.url);if(url.pathname!==PATH)return null;
 if(env.CUSTOM_DOMAIN_PROOF_ENABLED!=='true')return new Response(null,{status:404});
 if(request.method!=='GET'||url.protocol!=='https:'||url.search)return new Response(null,{status:400});
 let hostname;try{hostname=host(url.hostname);}catch{return new Response(null,{status:400});}
 const nonce=request.headers.get('x-ngeblogging-proof-nonce')||'',time=request.headers.get('x-ngeblogging-proof-time')||'',signature=request.headers.get('x-ngeblogging-proof-mac')||'',domainId=request.headers.get('x-ngeblogging-proof-domain')||'';
 if(!UUID.test(domainId)||!HEX.test(nonce)||!/^\d{13}$/.test(time)||Math.abs(clock()-Number(time))>60000)return new Response(null,{status:403});
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),7000);
 try{
  if(!await verify(env.CUSTOM_DOMAIN_PROOF_SECRET,['request',hostname,nonce,time,domainId],signature))return new Response(null,{status:403});
  if(env.SUPABASE_URL?.replace(/\/$/,'')!==BASE||!env.SUPABASE_SERVICE_ROLE_KEY)return json(503,{code:'PROOF_STORAGE_UNAVAILABLE'});
  const get=async path=>{const r=await fetchImpl(BASE+'/rest/v1/'+path,{redirect:'manual',signal:controller.signal,headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY,accept:'application/json'}});if(r.status!==200)throw Error('LOOKUP_UNAVAILABLE');return boundedJson(r);};
  const rows=await get('site_domains?id=eq.'+domainId+'&select=id,site_id,hostname,status,provider,ownership_verification&limit=2');
  if(!Array.isArray(rows)||rows.length!==1)return new Response(null,{status:404});
  const d=rows[0];if(!UUID.test(d.id)||!UUID.test(d.site_id)||d.id!==domainId||d.provider!=='cloudflare-full-zone'||!['pending','verifying','active'].includes(d.status))return new Response(null,{status:404});
  const configured=Array.isArray(d.ownership_verification?.additional_hostnames)?d.ownership_verification.additional_hostnames:[];const www=configured.find(x=>x?.host==='www');const allowed=hostname===d.hostname||(hostname==='www.'+d.hostname&&(!www||www.enabled!==false))||configured.some(x=>x?.enabled!==false&&x?.hostname===hostname&&hostname.endsWith('.'+d.hostname));if(!allowed)return new Response(null,{status:404});
  const sites=await get('sites?id=eq.'+d.site_id+'&select=id,status,is_public&limit=1');
  if(!Array.isArray(sites)||sites.length!==1||sites[0].id!==d.site_id||sites[0].status!=='active'||sites[0].is_public!==true)return json(409,{code:'SITE_NOT_PUBLISHED'});
  return json(200,{version:'domain-proof',hostname,nonce,time,domainId:d.id,siteId:d.site_id,tenantMappingVerified:true,siteContentVerified:false,mac:await proofMac(env.CUSTOM_DOMAIN_PROOF_SECRET,['response',hostname,nonce,time,d.id,d.site_id])});
 }catch{return json(503,{code:'PROOF_UNAVAILABLE'});}finally{clearTimeout(timer);controller.abort();}
}
export async function verifyCustomDomainTenantProof(job,env,{fetchImpl=globalThis.fetch,signal,clock=Date.now}={}){
 if(env.CUSTOM_DOMAIN_PROOF_ENABLED!=='true')return {verified:false,reason:'TENANT_PROOF_NOT_ENABLED'};
 let hostname;try{hostname=host(job.hostname);if(!UUID.test(job.domainId)||!UUID.test(job.siteId))throw Error();}catch{return {verified:false,reason:'TENANT_PROOF_INPUT_INVALID'};}
 try{
  const nonce=[...crypto.getRandomValues(new Uint8Array(32))].map(x=>x.toString(16).padStart(2,'0')).join(''),time=String(clock());
  const signature=await proofMac(env.CUSTOM_DOMAIN_PROOF_SECRET,['request',hostname,nonce,time,job.domainId]);
  const timeout=AbortSignal.timeout(8000),combined=signal?AbortSignal.any([signal,timeout]):timeout;
  const r=await fetchImpl('https://'+hostname+PATH,{method:'GET',redirect:'manual',signal:combined,headers:{accept:'application/json','cache-control':'no-cache','x-ngeblogging-proof-nonce':nonce,'x-ngeblogging-proof-time':time,'x-ngeblogging-proof-mac':signature,'x-ngeblogging-proof-domain':job.domainId}});
  if(r.status!==200||r.headers.get('content-type')?.split(';')[0]!=='application/json')return {verified:false,reason:r.status===409?'SITE_NOT_PUBLISHED':'TENANT_PROOF_HTTP_FAILED'};
  const d=await boundedJson(r,8192);
  if(Math.abs(clock()-Number(time))>60000||d.version!=='domain-proof'||d.hostname!==hostname||d.nonce!==nonce||d.time!==time||d.domainId!==job.domainId||d.siteId!==job.siteId||d.tenantMappingVerified!==true||!await verify(env.CUSTOM_DOMAIN_PROOF_SECRET,['response',hostname,nonce,time,d.domainId,d.siteId],d.mac))return {verified:false,reason:'TENANT_PROOF_MISMATCH'};
  return {verified:true,hostname,domainId:d.domainId,siteId:d.siteId,checkedAt:new Date(clock()).toISOString(),tenantMappingVerified:true,siteContentVerified:false};
 }catch{return {verified:false,reason:'TENANT_PROOF_UNAVAILABLE'};}
}
