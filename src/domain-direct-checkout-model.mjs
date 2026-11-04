import {normalizePurchaseDomain,readPurchaseAttempt,fetchRegistrantPolicy,parsePurchaseQuote} from './domain-purchase-model.mjs';
import {getFinalDomainQuote} from './domain-final-quote-source.mjs';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const fail=code=>{throw Object.assign(new Error(code),{code});};
// A UI preparation budget, not an extension of the server's quote lifetime.
export function assertCheckoutQuoteFresh(quote,{domain,now=Date.now()}={}){
 if(!Number.isSafeInteger(now)||Math.abs(now)>8640000000000000)fail('QUOTE_UNVERIFIED');
 const verified=parsePurchaseQuote(quote,{domain,now,allowExpired:true});
 const remaining=Date.parse(verified.expiresAt)-now;
 if(remaining<=0)fail('QUOTE_EXPIRED');
 if(remaining<15000)fail('QUOTE_REFRESH_REQUIRED');
 return verified;
}
export async function prepareDirectDomainCheckout(domain,token,{owner,siteId,storage,signal,fetchImpl=globalThis.fetch,clock=Date.now,quoteSource=getFinalDomainQuote,policySource=fetchRegistrantPolicy}={}){
 domain=normalizePurchaseDomain(domain);
 if(typeof owner!=='string'||!UUID.test(owner))fail('INVALID_SESSION');
 if(typeof siteId!=='string'||!UUID.test(siteId))fail('INVALID_SITE_ID');
 if(!storage||typeof storage.getItem!=='function')fail('ATTEMPT_UNREADABLE');
 if(readPurchaseAttempt(owner,storage))fail('ATTEMPT_HELD');
 if(signal?.aborted)fail('REQUEST_ABORTED');
 const fresh=()=>quoteSource(domain,token,{owner,signal,fetchImpl,force:true});
 const [initial,policy]=await Promise.all([fresh(),policySource(token,{signal,fetchImpl})]);
 let quote=initial;
 // Retry once only if preparation consumed the quote's useful lifetime.
 for(let attempt=0;attempt<2;attempt++){
  if(signal?.aborted)fail('REQUEST_ABORTED');
  if(readPurchaseAttempt(owner,storage))fail('ATTEMPT_HELD');
  try{return {domain,quote:assertCheckoutQuoteFresh(quote,{domain,now:clock()}),policy};}
  catch(error){
   if(attempt!==0||!['QUOTE_EXPIRED','QUOTE_REFRESH_REQUIRED'].includes(error?.code))throw error;
   quote=await fresh();
  }
 }
}
