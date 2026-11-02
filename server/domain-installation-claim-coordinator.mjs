import {inspectPaidDomainInstallation} from './domain-paid-installation-reader.mjs';
import {parseInstallationClaim} from './domain-installation-claim-result.mjs';
const BASE='https://polvmlrhqoiflumibfqs.supabase.co',ORDER=/^DOM-[a-f0-9]{40}$/,UUID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const validPlan=(p,id)=>Boolean(p?.eligible===true&&p.code==='DOMAIN_INSTALLATION_PLAN_READY'&&p.orderId===id&&typeof p.userId==='string'&&UUID.test(p.userId)&&typeof p.siteId==='string'&&UUID.test(p.siteId)&&typeof p.domain==='string'&&p.domain!=='ngeblogging.com'&&p.domain.split('.').length===2&&p.domain.split('.').every(label=>/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))&&p.evidenceReadOnly===true&&p.snapshotAtomic===false&&p.requiresFreshOwnershipCheck===true&&p.requiresDomainReservation===true&&p.requiresZoneAccountVerification===true&&p.requiresDnsHttpsVerification===true&&p.installationStarted===false&&p.installationConfirmed===false&&p.purchaseAllowed===false);
// Internal reservation coordinator only; not wired to a public route or provider dispatcher.
export async function preparePaidDomainInstallation(env,orderId,{fetchImpl=globalThis.fetch,clock=Date.now,signal,timeoutMs=20000}={}){
 let claim=null,outcome='not_attempted';
 const result=(ok,code,forceReconcile=false)=>Object.freeze({ok,code,claimOutcome:outcome,reconciliationOnly:forceReconcile||outcome==='unknown'||Boolean(claim?.reconciliationOnly),newClaimAllowed:false,providerMutationAllowed:false,installationStarted:false,installationConfirmed:false,...(claim?{claim}:{})});
 if(env?.DOMAIN_INSTALLATION_PREFLIGHT_ENABLED!=='true'||env.DOMAIN_INSTALLATION_CLAIM_ENABLED!=='true'||env.DOMAIN_ORDER_ENV!=='production')return result(false,'INSTALLATION_PREPARATION_DISABLED');
 if(typeof orderId!=='string'||!ORDER.test(orderId)||env.SUPABASE_URL?.replace(/\/$/,'')!==BASE||typeof env.SUPABASE_SERVICE_ROLE_KEY!=='string'||!env.SUPABASE_SERVICE_ROLE_KEY||env.SUPABASE_SERVICE_ROLE_KEY.length>8192||/[\u0000-\u0020\u007f]/.test(env.SUPABASE_SERVICE_ROLE_KEY)||typeof fetchImpl!=='function'||typeof clock!=='function'||!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>30000)return result(false,'INSTALLATION_PREPARATION_CONFIGURATION_UNAVAILABLE');
 if(signal?.aborted)return result(false,'INSTALLATION_PREPARATION_UNAVAILABLE');
 const c=new AbortController(),abort=()=>c.abort();let stop;
 const ended=new Promise((_,reject)=>{stop=()=>reject(Error('PREPARATION_STOPPED'));c.signal.addEventListener('abort',stop,{once:true});});ended.catch(()=>{});
 const timer=setTimeout(abort,timeoutMs),wait=p=>Promise.race([p,ended]);signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)c.abort();
 const inspect=()=>{if(c.signal.aborted)throw Error('PREPARATION_STOPPED');return wait(inspectPaidDomainInstallation(env,orderId,{fetchImpl,clock,signal:c.signal,timeoutMs:Math.min(8000,timeoutMs)}));};
 try{
  const plan=await inspect();if(!validPlan(plan,orderId))return result(false,'INSTALLATION_PREFLIGHT_NOT_READY');
  if(c.signal.aborted)throw Error('PREPARATION_STOPPED');
  outcome='unknown';
  const response=await wait(fetchImpl(BASE+'/rest/v1/rpc/domain_claim_paid_domain_installation',{method:'POST',redirect:'manual',cache:'no-store',credentials:'omit',headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY,accept:'application/json','content-type':'application/json'},body:JSON.stringify({p_order_id:orderId}),signal:c.signal}));
  if(response.status!==200||response.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json'){try{Promise.resolve(response.body?.cancel()).catch(()=>{});}catch{}return result(false,'INSTALLATION_CLAIM_RECONCILIATION_REQUIRED',true);}
  const stream=response.body?.getReader();if(!stream)throw Error('CLAIM_UNVERIFIED');let ack;
  try{let size=0;const chunks=[];for(;;){const part=await wait(stream.read());if(part.done)break;if(!(part.value instanceof Uint8Array))throw Error('CLAIM_UNVERIFIED');size+=part.value.byteLength;if(size>8192)throw Error('CLAIM_UNVERIFIED');chunks.push(part.value);}const bytes=new Uint8Array(size);let at=0;for(const part of chunks){bytes.set(part,at);at+=part.byteLength;}ack=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}finally{try{Promise.resolve(stream.cancel()).catch(()=>{});}catch{}try{stream.releaseLock();}catch{}}
  if(ack?.ok===false){outcome='rejected';return result(false,'INSTALLATION_CLAIM_REJECTED');}
  claim=parseInstallationClaim(ack,{orderId,userId:plan.userId,siteId:plan.siteId,domain:plan.domain});outcome='recorded';
  const fresh=await inspect();
  if(!validPlan(fresh,orderId)||fresh.userId!==claim.userId||fresh.siteId!==claim.siteId||fresh.domain!==claim.domain)return result(false,'INSTALLATION_CLAIM_RECONCILIATION_REQUIRED',true);
  if(c.signal.aborted)throw Error('PREPARATION_STOPPED');
  return result(true,claim.newClaim?'DOMAIN_INSTALLATION_RESERVED':'DOMAIN_INSTALLATION_RECONCILIATION_ONLY');
 }catch{return result(false,outcome==='not_attempted'?'INSTALLATION_PREPARATION_UNAVAILABLE':'INSTALLATION_CLAIM_RECONCILIATION_REQUIRED',outcome!=='not_attempted');}
 finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);c.signal.removeEventListener('abort',stop);c.abort();}
}
