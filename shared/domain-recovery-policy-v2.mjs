export const RECOVERY_POLICY='same-order-recovery-2h-v2';
export const TERMS_VERSION='cloudflare-domain-registration-2026-08-20';
export const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export const ORDER=/^DOM-[a-f0-9]{40}$/;
export function validateRecoveryInput(x){
 const keys=['orderId','requestId','previousQuoteId','expectedOrderUpdatedAt','quoteId','amountIdr','acceptedPrice','consentVersion','registrant','acceptedTerms','termsVersion'];
 if(!x||Array.isArray(x)||Object.keys(x).length!==keys.length||keys.some(k=>!Object.hasOwn(x,k))||!ORDER.test(x.orderId||'')||!UUID.test(x.requestId||'')||!UUID.test(x.previousQuoteId||'')||!UUID.test(x.quoteId||'')||x.quoteId===x.previousQuoteId||typeof x.expectedOrderUpdatedAt!=='string'||!Number.isFinite(Date.parse(x.expectedOrderUpdatedAt))||!Number.isSafeInteger(x.amountIdr)||x.amountIdr<1||x.amountIdr>1000000000000||x.acceptedPrice!==true||x.acceptedTerms!==true||x.consentVersion!==RECOVERY_POLICY||x.termsVersion!==TERMS_VERSION||!x.registrant||typeof x.registrant!=='object'||Array.isArray(x.registrant))throw Error('INVALID_RECOVERY_ACCEPTANCE');
 return x;
}
export function validateRecoveryWindow(s,now=Date.now()){
 const anchor=Date.parse(s?.expiry_anchor_at),expires=Date.parse(s?.expires_at);
 if(s?.payment_window_policy!==RECOVERY_POLICY||!Number.isFinite(anchor)||!Number.isFinite(expires)||!Number.isSafeInteger(now)||anchor>now+5000||expires-anchor!==7200000||expires<=now+30000)throw Error('RECOVERY_WINDOW_UNVERIFIED');
 return {startAt:anchor,expiresAt:expires,durationMinutes:120};
}
export function recoveryResult(r,input,now=Date.now()){
 if(r?.ok!==true||r.order_id!==input.orderId||r.quote_id!==input.quoteId||r.amount_idr!==input.amountIdr||r.currency!=='IDR'||r.environment!=='production'||r.payment_window_policy!==RECOVERY_POLICY||r.registrant_revalidated!==true||r.checkout_created!==false||r.registration_action_taken!==false||typeof r.reused!=='boolean')throw Error('RECOVERY_RESULT_UNVERIFIED');
 validateRecoveryWindow(r,now);return r;
}
