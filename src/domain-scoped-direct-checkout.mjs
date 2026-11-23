import {scopedPurchaseStorage} from './domain-scoped-purchase-storage.mjs';
import {readPurchaseAttempt} from './domain-purchase-model.mjs';
import {clearReleasablePurchase} from './domain-purchase-release.mjs';
import {prepareDirectDomainCheckout} from './domain-direct-checkout-model.mjs';
export async function prepareScopedDirectCheckout(domain,token,options={},{clear=clearReleasablePurchase,prepare=prepareDirectDomainCheckout}={}){
 const storage=scopedPurchaseStorage(options.owner,domain,options.storage,{signal:options.signal});
 const attempt=readPurchaseAttempt(options.owner,storage);
 if(attempt){
  try{await clear({owner:options.owner,token,storage,locks:options.locks||globalThis.navigator?.locks,signal:options.signal,fetchImpl:options.fetchImpl});}
  catch(error){if(options.signal?.aborted)throw Object.assign(Error('REQUEST_ABORTED'),{code:'REQUEST_ABORTED'});if(error?.code!=='ATTEMPT_HELD'&&error?.status!==404)throw error;}
 }
 if(options.signal?.aborted)throw Object.assign(Error('REQUEST_ABORTED'),{code:'REQUEST_ABORTED'});
 return prepare(domain,token,{...options,storage});
}
