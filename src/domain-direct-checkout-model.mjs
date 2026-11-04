import {normalizePurchaseDomain,readPurchaseAttempt,fetchRegistrantPolicy,parsePurchaseQuote} from './domain-purchase-model.mjs';
import {getFinalDomainQuote} from './domain-final-quote-source.mjs';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const fail=code=>{throw Object.assign(new Error(code),{code});};
const held=heldReason=>{throw Object.assign(new Error('ATTEMPT_HELD'),{code:'ATTEMPT_HELD',heldReason});};
export function assertCheckoutQuoteFresh(quote,{domain,now=Date.now()}={}){
 if(!Number.isSafeInteger(now)||Math.abs(now)>8640000000000000)fail('QUOTE_UNVERIFIED');
 const verified=parsePurchaseQuote(quote,{domain,now,allowExpired:true});
 const remaining=Date.parse(verified.expiresAt)-now;
 if(remaining<=0)fail('QUOTE_EXPIRED');
 if(remaining<15000)fail('QUOTE_REFRESH_REQUIRED');
 return verified;
}
async function missingOrderOnServer(id,token,{signal,fetchImpl}){
 if(typeof token!=='string'||!/^\S{1,8192}$/.test(token))fail('INVALID_SESSION');
 if(signal?.aborted)fail('REQUEST_ABORTED');
 const controller=new AbortController(),abort=()=>controller.abort();let stop,reader;
 const ended=new Promise((_,reject)=>{stop=()=>reject(Error('ATTEMPT_HELD'));controller.signal.addEventListener('abort',stop,{once:true});});
 const wait=value=>Promise.race([value,ended]),timer=setTimeout(abort,12000);
 signal?.addEventListener('abort',abort,{once:true});
 try{
  if(signal?.aborted)fail('REQUEST_ABORTED');
  const response=await wait(fetchImpl('/api/commerce/domains/orders/'+id,{method:'GET',redirect:'error',cache:'no-store',credentials:'same-origin',headers:{authorization:'Bearer '+token,accept:'application/json'},signal:controller.signal}));
  if(response.status!==404)held(response.status===200?'ORDER_EXISTS':response.status===401||response.status===403?'STATUS_AUTH_REJECTED':'STATUS_RESPONSE_UNEXPECTED');
  if(!/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type')||''))held('STATUS_CONTENT_TYPE_UNVERIFIED');
  reader=response.body?.getReader();if(!reader)held('STATUS_BODY_UNAVAILABLE');let size=0;const chunks=[];
  for(;;){const part=await wait(reader.read());if(part.done)break;size+=part.value.length;if(size>4096)held('STATUS_BODY_TOO_LARGE');chunks.push(part.value);}
  const bytes=new Uint8Array(size);let offset=0;for(const part of chunks){bytes.set(part,offset);offset+=part.length;}
  const result=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  if(signal?.aborted||controller.signal.aborted)fail('REQUEST_ABORTED');
  return result?.code==='DOMAIN_ORDER_NOT_FOUND'&&result.environment==='production';
 }catch(error){if(signal?.aborted)fail('REQUEST_ABORTED');if(error?.code==='INVALID_SESSION'||error?.heldReason)throw error;held(controller.signal.aborted?'STATUS_TIMEOUT':'STATUS_CHECK_UNVERIFIED');}
 finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);controller.signal.removeEventListener('abort',stop);if(reader){reader.cancel().catch(()=>{});try{reader.releaseLock();}catch{}}}
}
export async function recoverMissingOrderAttempt(domain,token,{owner,siteId,storage,signal,fetchImpl=globalThis.fetch,locks=globalThis.navigator?.locks}={}){
 domain=normalizePurchaseDomain(domain);
 if(typeof owner!=='string'||!UUID.test(owner))fail('INVALID_SESSION');
 if(typeof siteId!=='string'||!UUID.test(siteId))fail('INVALID_SITE_ID');
 if(!storage||typeof storage.getItem!=='function'||typeof storage.setItem!=='function'||typeof storage.removeItem!=='function')fail('ATTEMPT_UNREADABLE');
 if(!locks?.request)fail('CHECKOUT_LOCK_UNAVAILABLE');
 const storageKey='ngeblogging:domain-purchase:v1:'+owner.toLowerCase();
 return locks.request('ngeblogging:domain-purchase:'+owner.toLowerCase(),{mode:'exclusive',ifAvailable:true},async lock=>{
  if(!lock)fail('CHECKOUT_IN_PROGRESS');if(signal?.aborted)fail('REQUEST_ABORTED');
  const original=storage.getItem(storageKey),attempt=readPurchaseAttempt(owner,storage);
  if(!attempt)return false;
  if(attempt.phase!=='order')held('ATTEMPT_PHASE_NOT_RECOVERABLE');
  if(attempt.quote.domain!==domain)held('ATTEMPT_DOMAIN_MISMATCH');
  if((attempt.siteId??null)!==siteId.toLowerCase())held('ATTEMPT_SITE_MISMATCH');
  if(!await missingOrderOnServer(attempt.orderId,token,{signal,fetchImpl}))held('ORDER_ABSENCE_UNVERIFIED');
  if(signal?.aborted)fail('REQUEST_ABORTED');
  if(storage.getItem(storageKey)!==original)held('ATTEMPT_CHANGED');
  const current=readPurchaseAttempt(owner,storage);
  if(!current||current.key!==attempt.key||current.orderId!==attempt.orderId||current.phase!=='order')held('ATTEMPT_CHANGED');
  storage.setItem(storageKey+':missing-order-recovery:v1',JSON.stringify({reason:'AUTHENTICATED_ORDER_NOT_FOUND',attempt}));
  if(storage.getItem(storageKey)!==original)held('ATTEMPT_CHANGED');
  storage.removeItem(storageKey);
  if(storage.getItem(storageKey)!==null)fail('ATTEMPT_UNREADABLE');
  return true;
 });
}
export async function prepareDirectDomainCheckout(domain,token,{owner,siteId,storage,signal,fetchImpl=globalThis.fetch,clock=Date.now,quoteSource=getFinalDomainQuote,policySource=fetchRegistrantPolicy,locks=globalThis.navigator?.locks}={}){
 domain=normalizePurchaseDomain(domain);
 if(typeof owner!=='string'||!UUID.test(owner))fail('INVALID_SESSION');
 if(typeof siteId!=='string'||!UUID.test(siteId))fail('INVALID_SITE_ID');
 if(!storage||typeof storage.getItem!=='function')fail('ATTEMPT_UNREADABLE');
 if(readPurchaseAttempt(owner,storage))await recoverMissingOrderAttempt(domain,token,{owner,siteId,storage,signal,fetchImpl,locks});
 if(signal?.aborted)fail('REQUEST_ABORTED');
 const fresh=()=>quoteSource(domain,token,{owner,signal,fetchImpl,force:true});
 const [initial,policy]=await Promise.all([fresh(),policySource(token,{signal,fetchImpl})]);
 let quote=initial;
 for(let attempt=0;attempt<2;attempt++){
  if(signal?.aborted)fail('REQUEST_ABORTED');
  if(readPurchaseAttempt(owner,storage))held('ATTEMPT_APPEARED_DURING_PREPARATION');
  try{return {domain,quote:assertCheckoutQuoteFresh(quote,{domain,now:clock()}),policy};}
  catch(error){
   if(attempt!==0||!['QUOTE_EXPIRED','QUOTE_REFRESH_REQUIRED'].includes(error?.code))throw error;
   quote=await fresh();
  }
 }
}
