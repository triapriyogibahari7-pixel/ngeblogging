import {loadOrderStatus} from './domain-order-status-model.mjs';
import {readPurchaseAttempt} from './domain-purchase-model.mjs';
import {isReleasableOrder} from './domain-stale-attempt-policy.mjs';
const fail=code=>{throw Object.assign(Error(code),{code});};
export async function clearReleasablePurchase({owner,token,storage,locks,signal,fetchImpl=globalThis.fetch,now=()=>Date.now()}={}){
 if(typeof owner!=='string')fail('INVALID_SESSION');
 if(!locks?.request)fail('CHECKOUT_LOCK_UNAVAILABLE');
 const base='ngeblogging:domain-purchase:v1:'+owner.toLowerCase();
 return locks.request('ngeblogging:domain-purchase:'+owner.toLowerCase(),{mode:'exclusive',ifAvailable:true},async lock=>{
  if(!lock)fail('CHECKOUT_IN_PROGRESS');
  if(signal?.aborted)fail('REQUEST_ABORTED');
  const attempt=readPurchaseAttempt(owner,storage);
  if(!attempt)return;
  const order=await loadOrderStatus(attempt.orderId,token,{signal,fetchImpl});
  if(order.orderId!==attempt.orderId||!isReleasableOrder(order,{now:now()}))fail('ATTEMPT_HELD');
  if(signal?.aborted)fail('REQUEST_ABORTED');
  const current=readPurchaseAttempt(owner,storage);
  if(!current||current.key!==attempt.key||current.orderId!==attempt.orderId)fail('ATTEMPT_CHANGED');
  const raw=storage.getItem(base);
  try{if(raw!==null)storage.setItem(base+':retained-archive:'+attempt.orderId,raw);}catch{}
  storage.removeItem(base);
 });
}
