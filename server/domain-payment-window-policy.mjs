export const DOMAIN_PAYMENT_WINDOW_VERSION='domain-payment-window-2h-v1';
export const DOMAIN_PAYMENT_WINDOW_MINUTES=120;
const DURATION=DOMAIN_PAYMENT_WINDOW_MINUTES*60000;
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const fail=code=>{throw Object.assign(Error(code),{code});};
function clock(value){if(!Number.isSafeInteger(value)||value<0||value>8640000000000000-DURATION)fail('PAYMENT_CLOCK_INVALID');return value;}
function timestamp(value){if(typeof value!=='string'||!Number.isFinite(Date.parse(value)))fail('PAYMENT_WINDOW_INVALID');return Date.parse(value);}
function eligible(order){
 if(!order||!/^DOM-[a-f0-9]{40}$/.test(order.orderId||'')||!UUID.test(order.quoteId||'')||order.environment!=='production'||order.currency!=='IDR'||!Number.isSafeInteger(order.amountIdr)||order.amountIdr<1||order.amountIdr>1000000000000)fail('PAYMENT_ORDER_INVALID');
 if(order.paymentWindowVersion!==DOMAIN_PAYMENT_WINDOW_VERSION)fail('PAYMENT_WINDOW_POLICY_NOT_ENABLED');
 if(order.paymentState!=='pending'||order.registrationState!=='not_started')fail('PAYMENT_ORDER_NOT_PENDING');
}
export function createDomainPaymentWindow({order,quote,now}={}){
 clock(now);eligible(order);
 if(!quote||quote.quoteId!==order.quoteId||quote.currency!=='IDR'||quote.amountIdr!==order.amountIdr||quote.indicative!==false)fail('PAYMENT_QUOTE_MISMATCH');
 if(timestamp(quote.expiresAt)<=now)fail('PAYMENT_QUOTE_EXPIRED');
 return Object.freeze({version:DOMAIN_PAYMENT_WINDOW_VERSION,orderId:order.orderId,quoteId:order.quoteId,currency:'IDR',amountIdr:order.amountIdr,anchorAt:new Date(now).toISOString(),expiresAt:new Date(now+DURATION).toISOString(),durationMinutes:DOMAIN_PAYMENT_WINDOW_MINUTES});
}
export function reuseDomainPaymentWindow(window,{order,now}={}){
 clock(now);eligible(order);
 if(!window||window.version!==DOMAIN_PAYMENT_WINDOW_VERSION||window.orderId!==order.orderId||window.quoteId!==order.quoteId||window.currency!=='IDR'||window.amountIdr!==order.amountIdr||window.durationMinutes!==DOMAIN_PAYMENT_WINDOW_MINUTES)fail('PAYMENT_WINDOW_INVALID');
 const anchor=timestamp(window.anchorAt),expires=timestamp(window.expiresAt);
 if(anchor>now||expires-anchor!==DURATION)fail('PAYMENT_WINDOW_INVALID');
 if(expires<=now)fail('PAYMENT_WINDOW_EXPIRED');
 return Object.freeze({version:window.version,orderId:window.orderId,quoteId:window.quoteId,currency:'IDR',amountIdr:window.amountIdr,anchorAt:window.anchorAt,expiresAt:window.expiresAt,durationMinutes:DOMAIN_PAYMENT_WINDOW_MINUTES});
}
