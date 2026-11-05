import {loadOrderStatus} from './domain-order-status-model.mjs';
const ORDER=/^DOM-[a-f0-9]{40}$/,UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const fail=code=>{throw Object.assign(Error(code),{code});};
function verified(a){if(a?.verification!=='verified'||!UUID.test(a.user?.id||'')||typeof a.session?.access_token!=='string'||!/^\S{1,8192}$/.test(a.session.access_token))fail('INVALID_SESSION');return a;}
// Read-only handoff. Never edits browser notes or creates a quote/checkout.
export async function prepareExistingOrderRecovery(expected,{getSession,loadStatus=loadOrderStatus,owner,token,signal}={}){
 if(signal?.aborted)fail('REQUEST_ABORTED');
 if(!expected||!ORDER.test(expected.orderId||'')||expected.currency!=='IDR'||!Number.isSafeInteger(expected.amountIdr)||expected.amountIdr<1||expected.amountIdr>1000000000000||typeof getSession!=='function')fail('ORDER_ACTION_UNCONFIRMED');
 const a=verified(await getSession());
 if((owner&&a.user.id.toLowerCase()!==owner.toLowerCase())||(token&&a.session.access_token!==token))fail('SESSION_CHANGED');
 if(signal?.aborted)fail('REQUEST_ABORTED');
 const fresh=await loadStatus(expected.orderId,a.session.access_token,{signal});
 if(signal?.aborted)fail('REQUEST_ABORTED');
 if(fresh?.orderId!==expected.orderId||fresh.domain!==expected.domain||fresh.currency!=='IDR'||fresh.amountIdr!==expected.amountIdr)fail('ORDER_ACTION_UNCONFIRMED');
 if(fresh.paymentState!=='pending'||fresh.registrationState!=='not_started'||fresh.resolution!=='none')fail('ORDER_ALREADY_PROCESSED');
 const b=verified(await getSession());if(signal?.aborted)fail('REQUEST_ABORTED');
 if(b.user.id.toLowerCase()!==a.user.id.toLowerCase()||b.session.access_token!==a.session.access_token)fail('SESSION_CHANGED');
 return {order:fresh,owner:a.user.id.toLowerCase(),token:a.session.access_token};
}
