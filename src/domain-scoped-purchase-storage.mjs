import {normalizePurchaseDomain,readPurchaseAttempt} from './domain-purchase-model.mjs';
const UUID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const fail=code=>{throw Object.assign(Error(code),{code});};
// Local retention limit only, not an account-wide server quota.
export function scopedPurchaseStorage(owner,domain,storage,{signal}={}){
 if(typeof owner!=='string'||!UUID.test(owner))fail('INVALID_SESSION');
 owner=owner.toLowerCase();domain=normalizePurchaseDomain(domain);
 if(!storage||!['getItem','setItem','removeItem','key'].every(k=>typeof storage[k]==='function'))fail('ATTEMPT_UNREADABLE');
 const base='ngeblogging:domain-purchase:v1:'+owner,prefix=base+':domain:',slot=prefix+domain;
 let bound=null;
 const check=()=>{if(signal?.aborted)fail('REQUEST_ABORTED');};
 function parse(raw){return readPurchaseAttempt(owner,{getItem:key=>{if(key!==base)fail('ATTEMPT_UNREADABLE');return raw;}});}
 function at(key){return parse(storage.getItem(key));}
 function locate(){
  check();const legacy=at(base),current=at(slot);
  if(current&&current.quote.domain!==domain)fail('ATTEMPT_DOMAIN_MISMATCH');
  const legacyMatches=legacy?.quote.domain===domain;
  if(legacyMatches&&current)fail('ATTEMPT_DOMAIN_CONFLICT');
  const target=legacyMatches?base:slot;
  if(bound&&bound!==target&&storage.getItem(bound)!==null)fail('ATTEMPT_CHANGED');
  bound=target;return target;
 }
 function map(name){
  if(name===base)return locate();
  if(name===base+':missing-order-recovery:v1')return locate()+':missing-order-recovery:v1';
  fail('ATTEMPT_STORAGE_KEY_REJECTED');
 }
 function count(){
  const ids=new Set(),legacy=at(base);if(legacy)ids.add(legacy.orderId);
  if(!Number.isSafeInteger(storage.length)||storage.length<0||storage.length>100000)fail('ATTEMPT_UNREADABLE');
  for(let i=0;i<storage.length;i++){
   const key=storage.key(i);if(typeof key!=='string'||!key.startsWith(prefix))continue;
   const suffix=key.slice(prefix.length);if(suffix.includes(':'))continue;
   if(normalizePurchaseDomain(suffix)!==suffix)fail('ATTEMPT_UNREADABLE');
   const a=at(key);if(a&&a.quote.domain!==suffix)fail('ATTEMPT_DOMAIN_MISMATCH');
   if(a)ids.add(a.orderId);
  }
  return ids.size;
 }
 return {
  getItem(name){check();return storage.getItem(map(name));},
  setItem(name,value){
   check();const target=map(name);
   if(name!==base){storage.setItem(target,value);if(storage.getItem(target)!==value)fail('ATTEMPT_UNREADABLE');return;}
   if(typeof value!=='string')fail('ATTEMPT_UNREADABLE');
   const next=parse(value),prior=at(target);
   if(!next||next.quote.domain!==domain)fail('ATTEMPT_DOMAIN_MISMATCH');
   if(prior&&(prior.key!==next.key||prior.orderId!==next.orderId||JSON.stringify(prior.quote)!==JSON.stringify(next.quote)||(prior.siteId??null)!==(next.siteId??null)))fail('ATTEMPT_CHANGED');
   if(!prior&&count()>=50)fail('ORDER_LIMIT_REACHED');
   check();storage.setItem(target,value);if(storage.getItem(target)!==value)fail('ATTEMPT_UNREADABLE');
  },
  // Removal authority must come from the existing verified terminal/recovery flow.
  removeItem(name){
   check();if(name!==base)fail('ATTEMPT_STORAGE_KEY_REJECTED');
   const target=locate(),raw=storage.getItem(target);if(raw===null)return;
   const current=parse(raw);if(current.quote.domain!==domain)fail('ATTEMPT_DOMAIN_MISMATCH');
   const archive=target+':retained-archive:'+current.orderId,prior=storage.getItem(archive);
   if(prior!==null&&prior!==raw)fail('ATTEMPT_CHANGED');
   storage.setItem(archive,raw);
   if(storage.getItem(archive)!==raw||storage.getItem(target)!==raw)fail('ATTEMPT_CHANGED');
   check();storage.removeItem(target);if(storage.getItem(target)!==null)fail('ATTEMPT_UNREADABLE');
  }
 };
}
