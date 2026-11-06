import {checkCustomDomainDns} from './custom-domain-dns-readiness.mjs';
const CLOUDFLARE_API_BASE = 'https://api.cloudflare.com/client/v4';
export const WORKER_DOMAIN_ATTACH_RELEASE_V317 = 'cloudflare-worker-domain-verified-v317-20260806';
function failure(message,code,status=409){return Object.assign(new Error(message),{code,status});}
function providerConfig(env){
 const apiToken=String(env?.CLOUDFLARE_DOMAIN_API_TOKEN||env?.CLOUDFLARE_API_TOKEN||'').trim();
 const accountId=String(env?.CLOUDFLARE_ACCOUNT_ID||'').trim();
 const workerService=String(env?.CLOUDFLARE_WORKER_SERVICE||'ngeblogging').trim();
 const missing=[];
 if(!apiToken)missing.push('CLOUDFLARE_DOMAIN_API_TOKEN atau CLOUDFLARE_API_TOKEN');
 if(!/^[0-9a-f]{32}$/i.test(accountId))missing.push('CLOUDFLARE_ACCOUNT_ID');
 if(!workerService)missing.push('CLOUDFLARE_WORKER_SERVICE');
 if(missing.length)throw Object.assign(failure('Konfigurasi Cloudflare belum lengkap: '+missing.join(', '),'CLOUDFLARE_CONFIGURATION_REQUIRED',503),{missing});
 return {apiToken,accountId,workerService};
}
export function normalizeZoneName(input){
 let value=String(input||'').trim().toLowerCase().replace(/\.$/,'');
 if(!value)throw failure('Masukkan nama domain.','DOMAIN_REQUIRED',400);
 if(!value.includes('://'))value='https://'+value;
 let parsed;try{parsed=new URL(value);}catch{throw failure('Format domain tidak valid.','INVALID_DOMAIN',400);}
 const hostname=parsed.hostname.toLowerCase().replace(/\.$/,'');
 if(parsed.pathname!=='/'||parsed.search||parsed.hash||parsed.port||parsed.username||parsed.password)throw failure('Masukkan domain tanpa path, parameter, port, atau kredensial.','INVALID_DOMAIN',400);
 if(hostname.length<4||hostname.length>253||!hostname.includes('.')||hostname.includes('..')||hostname.startsWith('www.')||!/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])$/.test(hostname))throw failure('Masukkan domain akar yang valid, misalnya domain.com. Jangan awali dengan www.','INVALID_ROOT_DOMAIN',400);
 if(hostname==='ngeblogging.com'||hostname.endsWith('.ngeblogging.com'))throw failure('Alamat *.ngeblogging.com menggunakan sistem subdomain gratis.','USE_MANAGED_SUBDOMAIN',400);
 return hostname;
}
function cloudflareError(payload,response){
 const first=payload?.errors?.[0];const message=String(first?.message||'Cloudflare API mengembalikan HTTP '+response.status+'.');
 const providerCode=first?.code??'CLOUDFLARE_API_ERROR';const lower=message.toLowerCase();
 if(lower.includes('account.zone.create')||lower.includes('permission')&&lower.includes('create zones'))return Object.assign(failure('Token domain belum diizinkan membuat zone baru.','CLOUDFLARE_ZONE_CREATE_PERMISSION_REQUIRED',503),{providerCode,requiredPermission:'com.cloudflare.api.account.zone.create'});
 if(Number(providerCode)===1000||/invalid api token/i.test(message))return Object.assign(failure('Token Cloudflare untuk layanan domain tidak valid atau sudah dicabut.','CLOUDFLARE_DOMAIN_TOKEN_INVALID',503),{providerCode});
 return Object.assign(failure(message,String(providerCode),response.status>=500?502:[401,403].includes(response.status)?response.status:409),{providerStatus:response.status});
}
async function cloudflareRequest(env,path,{method='GET',body}={}){
 const {apiToken}=providerConfig(env);
 const response=await fetch(CLOUDFLARE_API_BASE+path,{method,headers:{authorization:'Bearer '+apiToken,accept:'application/json',...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
 const text=await response.text();let payload;try{payload=text?JSON.parse(text):{};}catch{throw failure('Cloudflare mengembalikan respons yang tidak valid.','INVALID_CLOUDFLARE_RESPONSE',502);}
 if(!response.ok||payload.success===false)throw cloudflareError(payload,response);
 return payload.result;
}
export async function findFullZone(env,input){
 const name=normalizeZoneName(input),{accountId}=providerConfig(env);
 const query=new URLSearchParams({name,'account.id':accountId,per_page:'50'});
 const zones=await cloudflareRequest(env,'/zones?'+query);
 return Array.isArray(zones)?zones.find(zone=>String(zone?.name||'').toLowerCase()===name)||null:null;
}
export async function createFullZone(env,input){const name=normalizeZoneName(input),{accountId}=providerConfig(env);return cloudflareRequest(env,'/zones',{method:'POST',body:{account:{id:accountId},name,type:'full'}});}
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export async function getOrCreateFullZone(env,input){
 const name=normalizeZoneName(input),existing=await findFullZone(env,name);
 if(existing)return {zone:existing,reused:true};
 try{return {zone:await createFullZone(env,name),reused:false};}catch(error){const raced=await findFullZone(env,name).catch(()=>null);if(raced)return {zone:raced,reused:true};throw error;}
}
function normalizeZoneId(input){const value=String(input||'').trim();if(!/^[0-9a-f]{32}$/i.test(value))throw failure('Cloudflare Zone ID tidak valid.','INVALID_ZONE_ID',400);return value;}
export async function getFullZoneStatus(env,zoneId){return cloudflareRequest(env,'/zones/'+encodeURIComponent(normalizeZoneId(zoneId)));}
export function publicZoneState(zone){return {id:String(zone?.id||''),name:String(zone?.name||''),status:String(zone?.status||'pending'),active:String(zone?.status||'').toLowerCase()==='active',nameServers:Array.isArray(zone?.name_servers)?zone.name_servers.map(String).map(value=>value.trim()).filter(Boolean):[],originalNameServers:Array.isArray(zone?.original_name_servers)?zone.original_name_servers.map(String).map(value=>value.trim()).filter(Boolean):[],createdOn:zone?.created_on||null,activatedOn:zone?.activated_on||null};}
function workerDomainPermissionError(error){
 const status=Number(error?.status||error?.providerStatus||0),message=String(error?.message||'');
 if(status!==401&&status!==403&&!/workers?.*(permission|script)/i.test(message))return error;
 return Object.assign(failure('Token domain belum diizinkan memasang Worker Custom Domain. Tambahkan izin Workers Scripts Write.','CLOUDFLARE_WORKERS_DOMAIN_PERMISSION_REQUIRED',503),{requiredPermission:'Workers Scripts Write',cause:error});
}
export async function listWorkerDomains(env,hostname=''){
 const {accountId}=providerConfig(env),query=new URLSearchParams();
 const name=String(hostname||'').trim().toLowerCase().replace(/\.$/,'');if(name)query.set('hostname',name);
 try{const result=await cloudflareRequest(env,'/accounts/'+accountId+'/workers/domains'+(query.size?'?'+query:''));return Array.isArray(result)?result:[];}catch(error){throw workerDomainPermissionError(error);}
}
async function verifyWorkerDomainAttachment(env,{hostname,zoneId,zoneName,workerService}){
 const expectedHostname=String(hostname||'').trim().toLowerCase().replace(/\.$/,''),expectedZoneId=String(zoneId||'').trim().toLowerCase(),expectedZoneName=String(zoneName||'').trim().toLowerCase().replace(/\.$/,'');let lastSeen=null;
 for(const delay of [0,300,800,1600,3200]){
  if(delay)await wait(delay);const domains=await listWorkerDomains(env,expectedHostname);
  const exact=domains.find(item=>String(item?.hostname||'').toLowerCase().replace(/\.$/,'')===expectedHostname)||null;if(!exact)continue;lastSeen=exact;
  const serviceMatches=String(exact.service||'')===workerService;
  const zoneMatches=!exact.zone_id||String(exact.zone_id).toLowerCase()===expectedZoneId;
  const zoneNameMatches=!exact.zone_name||String(exact.zone_name).toLowerCase().replace(/\.$/,'')===expectedZoneName;
  if(serviceMatches&&zoneMatches&&zoneNameMatches&&exact.id)return exact;
  if(!serviceMatches)throw Object.assign(failure('Hostname '+expectedHostname+' masih diarahkan ke Worker lain.','WORKER_DOMAIN_SERVICE_MISMATCH'),{expectedService:workerService,actualService:String(exact.service||'')});
 }
 throw Object.assign(failure('Cloudflare belum mengonfirmasi routing '+expectedHostname+' ke Worker '+workerService+'.','WORKER_DOMAIN_NOT_ATTACHED',503),{hostname:expectedHostname,workerService,lastSeen,release:WORKER_DOMAIN_ATTACH_RELEASE_V317});
}
export async function attachWorkerDomain(env,{hostname,zoneId,zoneName}){
 const normalizedZone=normalizeZoneName(zoneName),normalizedHostname=String(hostname||'').trim().toLowerCase().replace(/\.$/,'');
 if(normalizedHostname!==normalizedZone&&!normalizedHostname.endsWith('.'+normalizedZone))throw failure('Hostname tidak berada di dalam zone yang dipilih.','HOSTNAME_ZONE_MISMATCH',400);
 const validZoneId=normalizeZoneId(zoneId),{accountId,workerService}=providerConfig(env);
 const zone=await getFullZoneStatus(env,validZoneId);
 if(zone?.id!==validZoneId||String(zone?.name||'').toLowerCase().replace(/\.$/,'')!==normalizedZone||zone?.account?.id!==accountId)throw failure('Zone tidak cocok dengan akun atau domain yang dipilih.','FULL_ZONE_MISMATCH');
 if(zone.status!=='active')throw failure('Zone belum aktif. Pasang nameserver resmi domain ini di registrar.','ZONE_NOT_ACTIVE');
 try{await cloudflareRequest(env,'/accounts/'+accountId+'/workers/domains',{method:'PUT',body:{hostname:normalizedHostname,service:workerService,zone_id:validZoneId,zone_name:normalizedZone}});}catch(error){throw workerDomainPermissionError(error);}
 const attachment=await verifyWorkerDomainAttachment(env,{hostname:normalizedHostname,zoneId:validZoneId,zoneName:normalizedZone,workerService});
 const dns=await checkCustomDomainDns({hostname:normalizedHostname,zoneName:normalizedZone,expectedNameservers:zone.name_servers||[]});
 if(!dns.ready){
  const messages={nxdomain:'DNS publik masih NXDOMAIN. Record domain belum dapat ditemukan.',nameserver_mismatch:'Nameserver publik belum cocok dengan nameserver resmi domain ini.',address_missing:'DNS domain belum memiliki jawaban alamat A atau AAAA.',inconclusive:'Resolver DNS belum dapat mengonfirmasi koneksi. Coba pemeriksaan ulang.'};
  throw Object.assign(failure(messages[dns.state]||'DNS publik belum siap.','CUSTOM_DOMAIN_DNS_'+dns.state.toUpperCase(),409),{dnsState:dns.state,hostname:normalizedHostname});
 }
 return {...attachment,dns_readiness:dns};
}
export async function attachDefaultWorkerDomains(env,zone){
 const state=publicZoneState(zone);if(!state.active)throw failure('Zone belum aktif. Nameserver domain harus diarahkan ke Cloudflare dahulu.','ZONE_NOT_ACTIVE');
 const apex=await attachWorkerDomain(env,{hostname:state.name,zoneId:state.id,zoneName:state.name});
 const www=await attachWorkerDomain(env,{hostname:'www.'+state.name,zoneId:state.id,zoneName:state.name});return {apex,www};
}
function normalizeWorkerDomainId(input){const value=String(input||'').trim();if(!value||value.length>128||!/^[a-z0-9_-]+$/i.test(value))throw failure('Cloudflare Worker Domain ID tidak valid.','INVALID_WORKER_DOMAIN_ID',400);return value;}
export async function detachWorkerDomain(env,domainId){const id=normalizeWorkerDomainId(domainId),{accountId}=providerConfig(env);return cloudflareRequest(env,'/accounts/'+accountId+'/workers/domains/'+encodeURIComponent(id),{method:'DELETE'});}
export async function deleteFullZone(env,zoneId){return cloudflareRequest(env,'/zones/'+encodeURIComponent(normalizeZoneId(zoneId)),{method:'DELETE'});}
export function fullZoneProviderReady(env){try{providerConfig(env);return true;}catch{return false;}}
