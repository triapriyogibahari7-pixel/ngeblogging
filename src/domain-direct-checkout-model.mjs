import {normalizePurchaseDomain,readPurchaseAttempt,fetchPurchaseQuote,fetchRegistrantPolicy} from './domain-purchase-model.mjs';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const fail=code=>{throw Object.assign(new Error(code),{code});};
export async function prepareDirectDomainCheckout(domain,token,{owner,siteId,storage,signal,fetchImpl=globalThis.fetch}={}){
 domain=normalizePurchaseDomain(domain);
 if(typeof owner!=='string'||!UUID.test(owner))fail('INVALID_SESSION');
 if(typeof siteId!=='string'||!UUID.test(siteId))fail('INVALID_SITE_ID');
 if(!storage||typeof storage.getItem!=='function')fail('ATTEMPT_UNREADABLE');
 if(readPurchaseAttempt(owner,storage))fail('ATTEMPT_HELD');
 if(signal?.aborted)fail('REQUEST_ABORTED');
 const options={signal,fetchImpl};
 const [quote,policy]=await Promise.all([fetchPurchaseQuote(domain,token,options),fetchRegistrantPolicy(token,options)]);
 return {domain,quote,policy};
}
