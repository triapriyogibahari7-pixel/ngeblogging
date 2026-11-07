import {proofMac} from './custom-domain-tenant-proof.mjs';
const PATH='/.well-known/ngeblogging-migration-proof',HEX=/^[a-f0-9]{64}$/,UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i,enc=new TextEncoder();
const fail=code=>Object.assign(Error(code),{code});
function hostname(value){if(typeof value!=='string'||value.length>253||!value.includes('.')||!/[a-z]/.test(value.split('.').at(-1))||/(?:^|\.)(localhost|local|internal)$/.test(value)||value.split('.').some(x=>!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(x)))throw fail('INVALID_HOSTNAME');return value;}
async function validMac(secret,parts,signature){if(!HEX.test(signature||'')||typeof secret!=='string'||secret.length<32)return false;const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);return crypto.subtle.verify('HMAC',key,Uint8Array.from(signature.match(/../g),x=>parseInt(x,16)),enc.encode(JSON.stringify(parts)));}
async function bytes(response,max){const reader=response.body?.getReader();if(!reader)throw fail('PROOF_BODY_REQUIRED');const chunks=[];let size=0;try{for(;;){const p=await reader.read();if(p.done)break;size+=p.value.length;if(size>max)throw fail('PROOF_BODY_TOO_LARGE');chunks.push(p.value);}}finally{reader.cancel().catch(()=>{});}const out=new Uint8Array(size);let n=0;for(const chunk of chunks){out.set(chunk,n);n+=chunk.length;}return out;}
async function json(response){return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(await bytes(response,16384)));}
const hash=async value=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',value))].map(x=>x.toString(16).padStart(2,'0')).join('');
export async function migrationRouteProofResponse(request,env,{clock=Date.now}={}){
 const url=new URL(request.url);if(url.pathname!==PATH)return null;
 const deny=status=>new Response(null,{status,headers:{'cache-control':'no-store'}});
 if(env.MIGRATION_ROUTE_PROOF_ENABLED!=='true')return deny(404);
 if(request.method!=='GET'||url.protocol!=='https:'||url.search)return deny(400);
 try{
  const h=hostname(url.hostname),scope=JSON.parse(request.headers.get('x-migration-scope')||'null'),signature=request.headers.get('x-migration-mac');
  if(!Array.isArray(scope)||scope.length!==7)return deny(403);
  const [version,host,siteId,migrationId,providerId,nonce,time]=scope;
  if(version!=='saas-route-v1'||host!==h||![siteId,migrationId,providerId].every(x=>UUID.test(x||''))||!HEX.test(nonce||'')||!Number.isSafeInteger(time)||Math.abs(clock()-time)>30000)return deny(403);
  if(!await validMac(env.MIGRATION_ROUTE_PROOF_SECRET,['request',...scope],signature))return deny(403);
  const meta=request.cf?.hostMetadata;
  if(meta?.site_id!==siteId||meta?.migration_id!==migrationId||meta?.provider_id!==providerId)return deny(409);
  return Response.json({scope,route:'saas',mac:await proofMac(env.MIGRATION_ROUTE_PROOF_SECRET,['response',...scope,'saas'])},{headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
 }catch{return deny(503);}
}
export async function verifyMigrationTarget({identity,target,contentPins,inspectAuthoritativeDns,secret,fetchImpl=globalThis.fetch,clock=Date.now}){
 if(!UUID.test(identity?.siteId||'')||!UUID.test(identity?.migrationId||'')||!Array.isArray(target?.hostnames)||!target.hostnames.length||target.hostnames.length>50||typeof inspectAuthoritativeDns!=='function'||typeof secret!=='string'||secret.length<32)throw fail('LIVE_VERIFIER_CONFIGURATION_REQUIRED');
 if(new Set(target.hostnames.map(x=>x.hostname)).size!==target.hostnames.length)throw fail('DUPLICATE_HOSTNAME');
 if(target.siteId!==identity.siteId||target.migrationId!==identity.migrationId)throw fail('TARGET_SCOPE_MISMATCH');
 const results=[];
 for(const item of target.hostnames){
  const h=hostname(item.hostname);if(!UUID.test(item.id||'')||item.status!=='active'||item.sslStatus!=='active')throw fail('TARGET_NOT_READY');
  const pin=contentPins?.[h];if(!pin||!HEX.test(pin.sha256||'')||typeof pin.path!=='string'||!pin.path.startsWith('/')||pin.path.startsWith('//')||/[?#\\]/.test(pin.path)||pin.siteId!==identity.siteId)throw fail('TRUSTED_SITE_CONTENT_PIN_REQUIRED');
  const contentUrl=new URL(pin.path,'https://'+h);if(contentUrl.origin!=='https://'+h)throw fail('INVALID_CONTENT_PROBE_URL');
  const dns=await inspectAuthoritativeDns({hostname:h,identity,providerId:item.id});
  if(dns?.hostname!==h||dns.siteId!==identity.siteId||dns.migrationId!==identity.migrationId||dns.authoritativeVerified!==true||!Number.isSafeInteger(dns.checkedAt)||Math.abs(clock()-dns.checkedAt)>30000)throw fail('AUTHORITATIVE_DNS_PROOF_REQUIRED');
  // Recursive lookup is additional evidence, never labeled authoritative.
  for(const resolver of ['https://cloudflare-dns.com/dns-query','https://dns.google/resolve']){
   let address=false;for(const type of ['A','AAAA']){const u=new URL(resolver);u.searchParams.set('name',h);u.searchParams.set('type',type);const r=await fetchImpl(u,{redirect:'error',signal:AbortSignal.timeout(8000),headers:{accept:'application/dns-json'}});if(!r.ok)throw fail('DNS_RESOLVER_UNAVAILABLE');const d=await json(r);if(d.Status!==0)throw fail('DNS_PUBLIC_NOT_READY');address=address||(Array.isArray(d.Answer)&&d.Answer.some(x=>[1,28].includes(x.type)&&typeof x.data==='string'));}if(!address)throw fail('DNS_PUBLIC_NOT_READY');
  }
  const nonce=[...crypto.getRandomValues(new Uint8Array(32))].map(x=>x.toString(16).padStart(2,'0')).join(''),time=clock(),scope=['saas-route-v1',h,identity.siteId,identity.migrationId,item.id,nonce,time];
  const response=await fetchImpl('https://'+h+PATH,{redirect:'error',signal:AbortSignal.timeout(8000),headers:{'cache-control':'no-cache','x-migration-scope':JSON.stringify(scope),'x-migration-mac':await proofMac(secret,['request',...scope])}});
  if(response.status!==200)throw fail('SAAS_ROUTE_NOT_VERIFIED');
  const proof=await json(response);if(JSON.stringify(proof.scope)!==JSON.stringify(scope)||proof.route!=='saas'||Math.abs(clock()-time)>30000||!await validMac(secret,['response',...scope,'saas'],proof.mac))throw fail('SAAS_ROUTE_PROOF_MISMATCH');
  const page=await fetchImpl(contentUrl,{redirect:'error',signal:AbortSignal.timeout(8000),headers:{'cache-control':'no-cache'}});if(page.status!==200||!page.headers.get('content-type')?.toLowerCase().startsWith('text/html'))throw fail('SITE_CONTENT_UNVERIFIED');
  if(await hash(await bytes(page,1048576))!==pin.sha256)throw fail('SITE_CONTENT_HASH_MISMATCH');
  if(Math.abs(clock()-time)>30000)throw fail('LIVE_PROOF_EXPIRED');
  results.push({hostname:h,providerId:item.id,dnsVerified:true,routingVerified:true,siteContentVerified:true,sslStatus:'active',tlsEvidence:'successful-certificate-validating-https-fetch',checkedAt:clock()});
 }
 const checkedAt=clock();if(results.some(x=>checkedAt-x.checkedAt>60000))throw fail('LIVE_PROOF_EXPIRED');
 return {siteId:identity.siteId,migrationId:identity.migrationId,checkedAt,hostnames:results};
}
