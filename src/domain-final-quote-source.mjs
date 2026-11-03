import {normalizePurchaseDomain,parsePurchaseQuote,fetchPurchaseQuote} from './domain-purchase-model.mjs';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const fail=code=>{throw Object.assign(new Error(code),{code});};
export function createFinalDomainQuoteSource({fetchQuote=fetchPurchaseQuote,clock=Date.now,maxEntries=128}={}){
 if(typeof fetchQuote!=='function'||typeof clock!=='function'||!Number.isInteger(maxEntries)||maxEntries<1||maxEntries>512)fail('INVALID_QUOTE_SOURCE_CONFIG');
 const cache=new Map();
 return {clear(){cache.clear();},async get(domain,token,{owner,signal,fetchImpl,force=false}={}){
  domain=normalizePurchaseDomain(domain);
  if(typeof owner!=='string'||!UUID.test(owner)||typeof token!=='string'||!/^\S{1,8192}$/.test(token))fail('INVALID_SESSION');
  if(signal?.aborted)fail('REQUEST_ABORTED');
  const now=clock();if(!Number.isSafeInteger(now)||Math.abs(now)>8640000000000000)fail('QUOTE_UNVERIFIED');
  for(const [key,value] of cache)if(Date.parse(value.expiresAt)<=now)cache.delete(key);
  const key=owner.toLowerCase()+'\n'+domain;
  if(force)cache.delete(key);
  if(cache.has(key))return parsePurchaseQuote(cache.get(key),{domain,now});
  const received=await fetchQuote(domain,token,{signal,fetchImpl});
  if(signal?.aborted)fail('REQUEST_ABORTED');
  const quote=parsePurchaseQuote(received,{domain,now:clock()});
  if(cache.size>=maxEntries)cache.delete(cache.keys().next().value);
  cache.set(key,quote);
  return parsePurchaseQuote(quote,{domain,now:clock()});
 }};
}
// Memory only: no token, quote, or price is persisted by this source.
const sharedSource=createFinalDomainQuoteSource();
export const getFinalDomainQuote=(domain,token,options)=>sharedSource.get(domain,token,options);
export const clearFinalDomainQuoteCache=()=>sharedSource.clear();
