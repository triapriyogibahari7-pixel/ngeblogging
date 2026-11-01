import {createHash} from 'node:crypto';
import {verifyProviderDomainReviewReceipt} from '../domain-provider-review-receipt.mjs';
import {customerRegistrationPrice} from '../domain-customer-price-check.mjs';
import {parseDomainPricingSnapshot} from '../domain-pricing-snapshot.mjs';
import {registrarCostInRupiah} from './domain-money-conversion.mjs';
const UUID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
export const CUSTOMER_REGISTRATION_CONSENT_VERSION='domain-registration-v1';
const fail=code=>{throw Object.assign(Error(code),{code});};
const digest=x=>createHash('sha256').update(x,'utf8').digest('hex');
const freeze=x=>{if(x&&typeof x==='object'){for(const value of Object.values(x))freeze(value);Object.freeze(x);}return x;};
function id(x){if(typeof x!=='string'||!UUID.test(x))fail('INVALID_PURCHASE_INTENT');return x.toLowerCase();}
// Server-only pure preparation. authenticatedUserId, ownedSite and offer must come
// from verified server reads, never a browser payload. No network/storage writes.
// This is NOT an order, payment instruction or registration capability assertion.
export function prepareCustomerDomainPurchaseIntent({reviewToken,domain,idempotencyKey,consent,offer,snapshotText},{key,authenticatedUserId,siteId,ownedSite,providerId,registrarAccountRef,now=Date.now()}={}){
 const userId=id(authenticatedUserId),site=id(siteId),idem=id(idempotencyKey);
 if(ownedSite?.id!==site||ownedSite.owner_id!==userId)fail('SITE_OWNER_REQUIRED');
 const claims=verifyProviderDomainReviewReceipt(reviewToken,{key,userId,siteId:site,providerId,registrarAccountRef,domain,now});
 const keys=['accepted','version','domain','siteId','currency','amountIdr','years'];
 if(!consent||typeof consent!=='object'||Array.isArray(consent)||Object.keys(consent).length!==keys.length||keys.some(k=>!Object.hasOwn(consent,k))||consent.accepted!==true||consent.version!==CUSTOMER_REGISTRATION_CONSENT_VERSION||consent.domain!==claims.domain||consent.siteId!==site||consent.currency!=='IDR'||consent.amountIdr!==claims.amountIdr||consent.years!==1)fail('EXPLICIT_PURCHASE_CONSENT_REQUIRED');
 if(offer?.domain!==claims.domain||offer.providerId!==providerId)fail('FRESH_QUOTE_CONTEXT_MISMATCH');
 const snapshot=parseDomainPricingSnapshot(snapshotText,{now,environment:'production'}),price=customerRegistrationPrice(offer,snapshotText,{now,providerId});
 if(price.amountIdr!==claims.amountIdr)fail('DOMAIN_PRICE_CHANGED_REVIEW_REQUIRED');
 const p=snapshot.policy,cost=BigInt(registrarCostInRupiah({amount:offer.prices.registration.amount,currency:offer.prices.registration.currency,fx:snapshot.fx},now).amountIdr),total=BigInt(price.amountIdr),other=BigInt(p.otherDirectCostsIdr),fee=BigInt(p.paymentFixedCostIdr)+(total*BigInt(p.paymentFeeBasisPoints)+9999n)/10000n;
 if(total-cost-other-fee<BigInt(p.minimumMarginIdr))fail('PURCHASE_INTENT_MARGIN_UNVERIFIED');
 const expiresAt=new Date(Math.min(claims.expiresAt,Date.parse(price.expiresAt))).toISOString();
 const input={intentId:'DCI-'+digest('production:domain-customer-intent:v1:'+userId+':'+idem).slice(0,40),idempotencyKey:idem,userId,siteId:site,domain:claims.domain,providerId,registrarAccountRef,reviewId:claims.reviewId,reviewDigest:digest(reviewToken),reviewIssuedAt:new Date(claims.issuedAt).toISOString(),reviewExpiresAt:new Date(claims.expiresAt).toISOString(),pricing:{currency:'IDR',amountIdr:price.amountIdr,registrarCostIdr:Number(cost),otherDirectCostsIdr:Number(other),paymentCostIdr:Number(fee),minimumMarginIdr:p.minimumMarginIdr,pricingVersion:p.version,checkedAt:offer.checkedAt,expiresAt,fx:{...snapshot.fx},policy:{...p}},consent:{...consent}};
 return freeze({state:'prepared_not_payable',rpcName:'domain_prepare_customer_purchase_intent',rpcArguments:{p_input:input},purchaseAllowed:false,checkoutAvailable:false});
}
