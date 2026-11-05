const ORIGIN='https://api.midtrans.com';
const ORDER=/^DOM-[a-f0-9]{40}$/;
const UUID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
export class GatewayCancellationError extends Error {
 constructor(code,status=409){super(code);this.code=code;this.status=status;}
}
const fail=(code,status)=>{throw new GatewayCancellationError(code,status);};
async function boundedJson(response){
 if(!/^application\/json(?:\s*;.*)?$/i.test(response.headers.get('content-type')||''))fail('GATEWAY_RESPONSE_UNVERIFIED',502);
 const reader=response.body?.getReader();if(!reader)fail('GATEWAY_RESPONSE_UNVERIFIED',502);
 let size=0;const chunks=[];
 try{
  for(;;){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>32768)fail('GATEWAY_RESPONSE_TOO_LARGE',502);chunks.push(part.value);}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  const body=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  if(!body||Array.isArray(body)||typeof body!=='object')fail('GATEWAY_RESPONSE_UNVERIFIED',502);
  return body;
 }finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
}
function amount(value){
 if(typeof value!=='string'||!/^(?:0|[1-9]\d{0,12})(?:\.0{1,2})?$/.test(value))fail('GATEWAY_AMOUNT_UNVERIFIED',502);
 return BigInt(value.split('.')[0]);
}
function verify(response,order,transactionId){
 const b=response.body;
 if(response.httpStatus===404||String(b.status_code)==='404')fail('SNAP_RECONCILIATION_REQUIRED');
 if(!response.ok||!['200','201','202','407'].includes(String(b.status_code)))fail('GATEWAY_STATUS_UNAVAILABLE',502);
 if(b.order_id!==order.orderId||amount(b.gross_amount)!==BigInt(order.amountIdr)||(b.currency!==undefined&&b.currency!=='IDR')||typeof b.transaction_id!=='string'||!/^[A-Za-z0-9_-]{1,200}$/.test(b.transaction_id)||typeof b.transaction_status!=='string')fail('GATEWAY_IDENTITY_MISMATCH',502);
 const expected=transactionId||order.midtransTransactionId;if(expected&&expected!==b.transaction_id)fail('GATEWAY_TRANSACTION_MISMATCH',502);
 return {transactionId:b.transaction_id,state:b.transaction_status};
}
function evidence(order,status,cancelAttempted){
 if(!['cancel','expire'].includes(status.state))return null;
 return {orderId:order.orderId,transactionId:status.transactionId,environment:'production',provider:'midtrans',gatewayState:status.state,paymentState:status.state==='cancel'?'cancelled':'expired',gatewayConfirmed:true,cancelAttempted,observedAt:new Date().toISOString()};
}
// Server-only. actorId and order must come from verified auth and private DB reads.
// claimAttempt must atomically recheck unpaid/unclaimed registration state and
// retain one durable cancellation claim per order, including after timeouts.
// This module neither supplies that DB adapter nor updates local payment state.
export async function cancelDomainAtGateway(order,{actorId,confirmed=false,serverKey,claimAttempt,fetchImpl=globalThis.fetch}={}){
 if(confirmed!==true)fail('CANCELLATION_CONFIRMATION_REQUIRED',400);
 if(!order||!ORDER.test(order.orderId||'')||order.environment!=='production'||order.currency!=='IDR'||!Number.isSafeInteger(order.amountIdr)||order.amountIdr<1||order.amountIdr>1000000000000)fail('ORDER_UNVERIFIED',400);
 if(typeof actorId!=='string'||!UUID.test(actorId)||typeof order.ownerId!=='string'||actorId.toLowerCase()!==order.ownerId.toLowerCase())fail('ORDER_OWNER_REQUIRED',403);
 if(order.paymentState!=='pending'||order.registrationState!=='not_started'||order.resolution!=='none')fail('ORDER_ALREADY_PROCESSED');
 if(typeof claimAttempt!=='function')fail('CANCELLATION_LEDGER_REQUIRED',503);
 if(typeof serverKey!=='string'||!/^[\x21-\x7e]{8,512}$/.test(serverKey)||serverKey.includes(':')||serverKey.startsWith('SB-'))fail('PRODUCTION_SERVER_KEY_REQUIRED',503);
 const authorization='Basic '+btoa(serverKey+':');
 async function request(action,method='GET'){
  const controller=new AbortController();let timer;
  const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new GatewayCancellationError('GATEWAY_REQUEST_UNCONFIRMED',503));},10000);});
  const operation=(async()=>{const r=await fetchImpl(`${ORIGIN}/v2/${encodeURIComponent(order.orderId)}/${action}`,{method,redirect:'error',credentials:'omit',cache:'no-store',headers:{authorization,accept:'application/json',...(method==='POST'?{'content-type':'application/json'}:{})},...(method==='POST'?{body:'{}'}:{}),signal:controller.signal});return {httpStatus:r.status,ok:r.ok,body:await boundedJson(r)};})();
  try{return await Promise.race([operation,timeout]);}catch(error){if(error instanceof GatewayCancellationError)throw error;fail('GATEWAY_REQUEST_UNCONFIRMED',503);}finally{clearTimeout(timer);controller.abort();}
 }
 const before=verify(await request('status'),order);
 const previous=evidence(order,before,false);if(previous)return previous;
 if(['settlement','capture','authorize'].includes(before.state))fail('PAYMENT_PROTECTED_FROM_CANCELLATION');
 if(before.state!=='pending')fail('GATEWAY_STATE_REQUIRES_REVIEW');
 const claimed=await claimAttempt({actorId:actorId.toLowerCase(),orderId:order.orderId,transactionId:before.transactionId,amountIdr:order.amountIdr,environment:'production',action:'cancel'});
 if(claimed!==true)fail('GATEWAY_CANCELLATION_IN_PROGRESS');
 try{await request('cancel','POST');}catch{}
 const after=verify(await request('status'),order,before.transactionId);
 const result=evidence(order,after,true);if(result)return result;
 if(['settlement','capture','authorize'].includes(after.state))fail('PAYMENT_PROTECTED_FROM_CANCELLATION');
 fail('GATEWAY_CANCELLATION_UNCONFIRMED');
}
