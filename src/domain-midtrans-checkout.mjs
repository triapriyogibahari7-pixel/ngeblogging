import {purchaseDomain} from './domain-purchase-model.mjs';
import {verifyDomainMidtransTarget} from './domain-midtrans-payment-target.mjs';
const fail=()=>{throw Object.assign(Error('PAYMENT_DETAILS_UNAVAILABLE'),{code:'PAYMENT_DETAILS_UNAVAILABLE'});};
async function capture(response,signal){
 const reader=response.clone().body?.getReader();if(!reader)fail();
 let timer,abort;
 const ended=new Promise((_,reject)=>{abort=()=>reject(Error('PAYMENT_DETAILS_UNAVAILABLE'));timer=setTimeout(abort,8000);signal?.addEventListener('abort',abort,{once:true});});
 const wait=value=>Promise.race([value,ended]);
 try{
  if(signal?.aborted)fail();let size=0;const chunks=[];
  for(;;){const part=await wait(reader.read());if(part.done)break;size+=part.value.length;if(size>32768)fail();chunks.push(part.value);}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
 }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);reader.cancel().catch(()=>{});try{reader.releaseLock();}catch{}}
}
// Observe the existing checkout response. Never create a second order or checkout request.
export async function purchaseDomainForPopup(quote,options={},purchaseImpl=purchaseDomain){
 const upstream=options.fetchImpl||globalThis.fetch;let received=null;
 const result=await purchaseImpl(quote,{...options,fetchImpl:async(path,init)=>{
  const response=await upstream(path,init);
  if(path==='/api/commerce/domains/checkout'&&init?.method==='POST'&&response.ok){try{received=await capture(response,init.signal);}catch{received=null;}}
  return response;
 }});
 if(options.signal?.aborted)throw Object.assign(Error('REQUEST_ABORTED'),{code:'REQUEST_ABORTED'});
 if(received?.code!=='DOMAIN_CHECKOUT_PRODUCTION'||received.environment!=='production'||received.purchaseAllowed!==true||received.checkoutCreated!==true||received.registrationStarted!==false)fail();
 const target=verifyDomainMidtransTarget({...received.checkout,environment:received.environment},{orderId:result.orderId,amountIdr:quote.amountIdr});
 if(target.url!==result.url)fail();
 return target;
}
