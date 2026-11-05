import {readPurchaseAttempt,normalizePurchaseDomain} from './domain-purchase-model.mjs';
import {scopedPurchaseStorage} from './domain-scoped-purchase-storage.mjs';
const UUID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const fail=code=>{throw Object.assign(Error(code),{code});};
export function inspectCheckoutDomain(owner,domain,storage){
 return readPurchaseAttempt(owner,scopedPurchaseStorage(owner,domain,storage));
}
export function readCheckoutSelectionState(owner,storage){
 if(typeof owner!=='string'||!UUID.test(owner))fail('INVALID_SESSION');
 owner=owner.toLowerCase();
 if(!storage||typeof storage.getItem!=='function'||typeof storage.key!=='function'||!Number.isSafeInteger(storage.length)||storage.length<0||storage.length>100000)fail('ATTEMPT_UNREADABLE');
 const attempt=readPurchaseAttempt(owner,storage),prefix='ngeblogging:domain-purchase:v1:'+owner+':domain:',rows=[],seen=new Set();
 if(attempt)seen.add(attempt.orderId);
 for(let i=0;i<storage.length;i++){
  const key=storage.key(i);if(typeof key!=='string'||!key.startsWith(prefix))continue;
  const domain=key.slice(prefix.length);if(domain.includes(':'))continue;
  if(normalizePurchaseDomain(domain)!==domain)fail('ATTEMPT_UNREADABLE');
  const current=inspectCheckoutDomain(owner,domain,storage);if(!current)continue;
  if(seen.has(current.orderId))fail('ATTEMPT_DOMAIN_CONFLICT');seen.add(current.orderId);
  rows.push([current.quote.domain,current.orderId,current.phase]);
 }
 rows.sort((a,b)=>a[0].localeCompare(b[0])||a[1].localeCompare(b[1]));
 return {attempt,signature:JSON.stringify([attempt,false,rows])};
}
