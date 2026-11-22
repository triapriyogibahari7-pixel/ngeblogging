import {verifyCustomDomainTenantProof,proofMac} from './custom-domain-tenant-proof.mjs';
const DB='https://polvmlrhqoiflumibfqs.supabase.co',PATH='/api/domains/connection-refresh';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i,HEX=/^[a-f0-9]{32}$/i;
const PROVIDERS=new Set(['cloudflare','cloudflare-custom-hostnames']);
const SELECT='id,site_id,hostname,provider,provider_hostname_id,status,is_primary,ownership_verification';
const fail=(code,status=503)=>{throw Object.assign(Error(code),{code,status});};
const reply=(status,body)=>Response.json({...body,primaryChanged:false,publicSiteVerified:false,siteContentVerified:false},{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
async function json(source,max=65536){const reader=source.body?.getReader();if(!reader)throw Error('BODY_REQUIRED');try{const decoder=new TextDecoder('utf-8',{fatal:true});let text='',size=0;for(;;){const p=await reader.read();if(p.done)break;size+=p.value.byteLength;if(size>max)throw Error('BODY_TOO_LARGE');text+=decoder.decode(p.value,{stream:true});}return JSON.parse(text+decoder.decode());}finally{reader.cancel().catch(()=>{});}}
export function domainConnectionPaidRefreshResponse(request,env){
 const url=new URL(request.url);if(url.pathname!==PATH)return null;
 if(url.protocol!=='https:'||url.hostname!=='ngeblogging.com'||url.port||url.search)return reply(404,{code:'NOT_FOUND'});
 if(request.method!=='POST')return reply(405,{code:'METHOD_NOT_ALLOWED'});
 if(request.headers.get('origin')!==url.origin)return reply(403,{code:'ORIGIN_NOT_ALLOWED'});
 if(!/^application\/json(?:\s*;.*)?$/i.test(request.headers.get('content-type')||''))return reply(415,{code:'JSON_REQUIRED'});
 return refreshPaidDomain(request,env);
}
async function refreshPaidDomain(request,env){
 const controller=new AbortController(),abort=()=>controller.abort(),timer=setTimeout(abort,18000);
 if(request.signal.aborted)abort();else request.signal.addEventListener('abort',abort,{once:true});
 try{
  let input;try{input=await json(request,4096);}catch{fail('INVALID_REQUEST',400);}
  if(!input||Array.isArray(input)||Object.keys(input).sort().join(',')!=='domainId,siteId'||!UUID.test(input.domainId||'')||!UUID.test(input.siteId||''))fail('INVALID_REQUEST',400);
  const authorization=request.headers.get('authorization')||'';if(!/^Bearer [^\s]{1,4096}$/.test(authorization))fail('AUTH_REQUIRED',401);
  const base=String(env.SUPABASE_URL||env.VITE_SUPABASE_URL||'').replace(/\/$/,''),publicKey=env.SUPABASE_PUBLISHABLE_KEY||env.VITE_SUPABASE_PUBLISHABLE_KEY||env.VITE_SUPABASE_ANON_KEY;
  const token=String(env.CLOUDFLARE_DOMAIN_API_TOKEN||env.CLOUDFLARE_API_TOKEN||'').trim();
  if(base!==DB||!publicKey||!env.SUPABASE_SERVICE_ROLE_KEY||!HEX.test(env.CLOUDFLARE_ZONE_ID||'')||!HEX.test(env.CLOUDFLARE_ACCOUNT_ID||'')||!token)fail('CONNECTION_CONFIG_REQUIRED');
  const userHeaders={apikey:publicKey,authorization},admin={apikey:env.SUPABASE_SERVICE_ROLE_KEY,authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY};
  async function call(url,headers,init={}){const r=await fetch(url,{...init,headers,redirect:'manual',signal:controller.signal});if(!r.ok){try{r.body?.cancel()?.catch(()=>{});}catch{}fail('CONNECTION_READ_OR_UPDATE_UNAVAILABLE');}return json(r);}
  const user=await call(DB+'/auth/v1/user',userHeaders);if(!UUID.test(user?.id||''))fail('AUTH_REQUIRED',401);
  const sites=await call(DB+'/rest/v1/sites?id=eq.'+input.siteId+'&select=id,owner_id&limit=1',userHeaders);
  if(!Array.isArray(sites)||sites.length!==1||sites[0].id!==input.siteId)fail('SITE_MANAGER_REQUIRED',403);
  if(sites[0].owner_id!==user.id){const roles=await call(DB+'/rest/v1/site_members?site_id=eq.'+input.siteId+'&user_id=eq.'+user.id+'&select=role&limit=1',userHeaders);if(!Array.isArray(roles)||!roles.some(x=>['owner','admin'].includes(x.role)))fail('SITE_MANAGER_REQUIRED',403);}
  const rows=await call(DB+'/rest/v1/site_domains?id=eq.'+input.domainId+'&site_id=eq.'+input.siteId+'&select='+SELECT+'&limit=1',userHeaders),d=Array.isArray(rows)&&rows.length===1?rows[0]:null;
  if(!d||d.id!==input.domainId||d.site_id!==input.siteId||!PROVIDERS.has(d.provider)||typeof d.hostname!=='string'||d.hostname.length>253||d.hostname.split('.').some(x=>!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(x)))fail('PAID_SAAS_DOMAIN_REQUIRED',409);
  if(d.is_primary!==false)fail('EXISTING_PRIMARY_REQUIRES_REVIEW',409);
  if(!HEX.test(d.provider_hostname_id||'')&&!UUID.test(d.provider_hostname_id||''))fail('PROVIDER_BINDING_REQUIRED',409);
  const root=d.hostname.startsWith('www.')?d.hostname.slice(4):d.hostname;
  const rightsPath=DB+'/rest/v1/domain_connection_entitlements?site_id=eq.'+d.site_id+'&or=(hostname.eq.'+d.hostname+',hostname.eq.'+root+')&select=hostname,site_id,expires_at,review_required,last_order_id&limit=2';
  async function rights(){const es=await call(rightsPath,admin);if(!Array.isArray(es)||es.length!==1)fail('PAID_CONNECTION_REQUIRED',403);const e=es[0];if(e.site_id!==d.site_id||![e.hostname,'www.'+e.hostname].includes(d.hostname)||e.review_required!==false||!Number.isFinite(Date.parse(e.expires_at))||Date.parse(e.expires_at)<=Date.now())fail('CONNECTION_EXPIRED_OR_REVIEW_REQUIRED',409);return e;}
  const entitlement=await rights();
  if(!/^DCON-[a-f0-9]{32}$/.test(entitlement.last_order_id||''))fail('PAYMENT_RECORD_UNVERIFIED',409);
  const orders=await call(DB+'/rest/v1/domain_connection_orders?order_id=eq.'+entitlement.last_order_id+'&select=user_id,site_id,hostname,environment,purpose,payment_state,grant_expires_at,amount_idr,currency,period_months,includes_www&limit=1',admin),order=Array.isArray(orders)&&orders.length===1?orders[0]:null;
  if(!order||order.user_id!==user.id||order.site_id!==d.site_id||order.hostname!==entitlement.hostname||order.environment!=='production'||order.purpose!=='custom-domain-connection'||order.payment_state!=='paid'||!Number.isFinite(Date.parse(order.grant_expires_at))||order.amount_idr!==99000||order.currency!=='IDR'||order.period_months!==12||order.includes_www!==true)fail('PAYMENT_SCOPE_UNVERIFIED',403);
  const cf='https://api.cloudflare.com/client/v4/zones/'+env.CLOUDFLARE_ZONE_ID,cfHeaders={authorization:'Bearer '+token,accept:'application/json'};
  const zone=await call(cf,cfHeaders);if(zone.success!==true||zone.result?.id!==env.CLOUDFLARE_ZONE_ID||zone.result?.name!=='ngeblogging.com'||zone.result?.account?.id!==env.CLOUDFLARE_ACCOUNT_ID||zone.result?.status!=='active')fail('SAAS_ZONE_UNVERIFIED');
  const result=await call(cf+'/custom_hostnames/'+d.provider_hostname_id,cfHeaders),p=result.result;
  if(result.success!==true||p?.id!==d.provider_hostname_id||p.hostname!==d.hostname||typeof p.status!=='string'||typeof p.ssl?.status!=='string'||p.status.length>80||p.ssl.status.length>80)fail('PROVIDER_BINDING_MISMATCH',409);
  const providerActive=p.status==='active'&&p.ssl.status==='active';
  const proof=providerActive?await verifyCustomDomainTenantProof({domainId:d.id,siteId:d.site_id,hostname:d.hostname},env,{signal:controller.signal}):null;
  const proofAge=Date.now()-Date.parse(proof?.checkedAt);
  const observed=providerActive&&proof?.verified===true&&proof.hostname===d.hostname&&proof.domainId===d.id&&proof.siteId===d.site_id&&proof.tenantMappingVerified===true&&Number.isFinite(proofAge)&&proofAge>=-60000&&proofAge<=60000;
  const current=await rights();if(current.last_order_id!==entitlement.last_order_id||current.expires_at!==entitlement.expires_at)fail('CONNECTION_RIGHTS_CHANGED',409);
  const failed=['blocked','deleted','pending_deletion','expired','revoked'].some(x=>x===p.status||x===p.ssl.status),now=new Date().toISOString();
  const ownership={};for(const k of ['type','name','value'])if(typeof p.ownership_verification?.[k]==='string'&&p.ownership_verification[k].length<=4096)ownership[k]=p.ownership_verification[k];
  const validation=[];for(const v of (Array.isArray(p.ssl.validation_records)?p.ssl.validation_records:[]).slice(0,20)){const item={};for(const k of ['txt_name','txt_value','cname_name','cname_target','http_url','http_body'])if(typeof v?.[k]==='string'&&v[k].length<=4096)item[k]=v[k];if(Object.keys(item).length)validation.push(item);}
  const patch={status:observed?'active':failed?'failed':'verifying',provider_status:p.status,ssl_status:p.ssl.status,ownership_verification:ownership,ssl_validation:validation,is_primary:false,last_checked_at:now,verified_at:observed?now:null,error_message:observed?null:providerActive?'TENANT_ROUTE_PROOF_PENDING':failed?'PROVIDER_NOT_ACTIVE':null,updated_at:now};
  const saved=await call(DB+'/rest/v1/site_domains?id=eq.'+d.id+'&site_id=eq.'+d.site_id+'&hostname=eq.'+d.hostname+'&provider=eq.'+d.provider+'&provider_hostname_id=eq.'+d.provider_hostname_id+'&is_primary=eq.false&select=id,site_id,hostname,provider,provider_hostname_id,status,is_primary,provider_status,ssl_status,ownership_verification,ssl_validation,last_checked_at,verified_at',{...userHeaders,'content-type':'application/json',prefer:'return=representation'},{method:'PATCH',body:JSON.stringify(patch)});
  if(!Array.isArray(saved)||saved.length!==1||saved[0].id!==d.id||saved[0].site_id!==d.site_id||saved[0].hostname!==d.hostname||saved[0].provider_hostname_id!==d.provider_hostname_id||saved[0].is_primary!==false||saved[0].status!==patch.status)fail('DOMAIN_UPDATE_UNVERIFIED',409);
  return reply(200,{domain:saved[0],serviceExpiresAt:current.expires_at,providerActive,tenantMappingVerified:observed,connectionObserved:observed,requiresNameserverChange:false});
 }catch(e){return reply([400,401,403,409].includes(e.status)?e.status:503,{code:/^[A-Z_]+$/.test(e.code||'')?e.code:'CONNECTION_REFRESH_UNVERIFIED',error:'Status belum dapat dipastikan. Tidak ada pembayaran, pemasangan hostname baru, atau perubahan primary yang dijalankan oleh endpoint ini.'});}
 finally{clearTimeout(timer);request.signal.removeEventListener('abort',abort);abort();}
}

export function paidConnectionTenantProofResponse(request,env){
 const url=new URL(request.url);
 if(url.pathname!=='/.well-known/ngeblogging-domain-proof'||env.CUSTOM_DOMAIN_PROOF_ENABLED!=='true')return null;
 if(url.hostname==='ngeblogging.com'||url.hostname.endsWith('.ngeblogging.com'))return null;
 return paidProof(request,env,url);
}
async function paidProof(request,env,url){
 if(request.method!=='GET'||url.protocol!=='https:'||url.port||url.search)return null;
 const hostname=url.hostname,nonce=request.headers.get('x-ngeblogging-proof-nonce')||'',time=request.headers.get('x-ngeblogging-proof-time')||'',mac=request.headers.get('x-ngeblogging-proof-mac')||'',id=request.headers.get('x-ngeblogging-proof-domain')||'';
 if(!UUID.test(id)||!/^[a-f0-9]{64}$/.test(nonce)||!/^\d{13}$/.test(time)||!/^[a-f0-9]{64}$/.test(mac)||Math.abs(Date.now()-Number(time))>60000)return null;
 const c=new AbortController(),abort=()=>c.abort(),timer=setTimeout(abort,7000);
 if(request.signal.aborted)abort();else request.signal.addEventListener('abort',abort,{once:true});
 try{
  const expected=await proofMac(env.CUSTOM_DOMAIN_PROOF_SECRET,['request',hostname,nonce,time,id]);let diff=0;for(let i=0;i<64;i++)diff|=expected.charCodeAt(i)^mac.charCodeAt(i);if(diff)return null;
  if(String(env.SUPABASE_URL||'').replace(/\/$/,'')!==DB||!env.SUPABASE_SERVICE_ROLE_KEY)return reply(503,{code:'PROOF_STORAGE_UNAVAILABLE'});
  const get=async path=>{const r=await fetch(DB+'/rest/v1/'+path,{redirect:'manual',signal:c.signal,headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY,accept:'application/json'}});if(!r.ok){try{r.body?.cancel()?.catch(()=>{});}catch{}throw Error('READ_FAILED');}return json(r);};
  const ds=await get('site_domains?id=eq.'+id+'&select=id,site_id,hostname,provider,status&limit=1');
  if(!Array.isArray(ds)||ds.length!==1||!PROVIDERS.has(ds[0].provider))return null;
  const d=ds[0];if(d.id!==id||!UUID.test(d.site_id||'')||d.hostname!==hostname||!['pending','verifying','active'].includes(d.status))return reply(404,{code:'PAID_PROOF_DOMAIN_UNVERIFIED'});
  const root=hostname.startsWith('www.')?hostname.slice(4):hostname;
  const es=await get('domain_connection_entitlements?site_id=eq.'+d.site_id+'&or=(hostname.eq.'+hostname+',hostname.eq.'+root+')&select=hostname,site_id,expires_at,review_required&limit=2');
  if(!Array.isArray(es)||es.length!==1||es[0].site_id!==d.site_id||![es[0].hostname,'www.'+es[0].hostname].includes(hostname)||es[0].review_required!==false||!Number.isFinite(Date.parse(es[0].expires_at))||Date.parse(es[0].expires_at)<=Date.now())return reply(403,{code:'PAID_PROOF_ENTITLEMENT_REQUIRED'});
  const sites=await get('sites?id=eq.'+d.site_id+'&select=id,status,is_public&limit=1');
  if(!Array.isArray(sites)||sites.length!==1||sites[0].id!==d.site_id||sites[0].status!=='active'||sites[0].is_public!==true)return reply(409,{code:'SITE_NOT_PUBLISHED'});
  if(Date.parse(es[0].expires_at)<=Date.now()||Math.abs(Date.now()-Number(time))>60000)return reply(403,{code:'PAID_PROOF_EXPIRED'});
  return reply(200,{version:'domain-proof',hostname,nonce,time,domainId:d.id,siteId:d.site_id,tenantMappingVerified:true,mac:await proofMac(env.CUSTOM_DOMAIN_PROOF_SECRET,['response',hostname,nonce,time,d.id,d.site_id])});
 }catch{return reply(503,{code:'PAID_PROOF_UNAVAILABLE'});}
 finally{clearTimeout(timer);request.signal.removeEventListener('abort',abort);abort();}
}
