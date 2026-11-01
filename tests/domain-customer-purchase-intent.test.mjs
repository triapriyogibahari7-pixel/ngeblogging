import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareCustomerDomainPurchaseIntent} from '../server/drafts/domain-customer-purchase-intent.mjs';
import {customerRegistrationPrice} from '../server/domain-customer-price-check.mjs';
import {issueProviderDomainReviewReceipt} from '../server/domain-provider-review-receipt.mjs';
// Offline synthetic inputs only. No registrar, storage or payment calls.
const NOW=Date.parse('2026-11-01T12:00:00.000Z'),iso=x=>new Date(x).toISOString();
const USER='11111111-1111-4111-8111-111111111111',SITE='22222222-2222-4222-8222-222222222222',ID='33333333-3333-4333-8333-333333333333',KEY=new Uint8Array(32).fill(11);
function fixture(){
 const context={providerId:'opensrs',registrarAccountRef:'offline-fixture-account'};
 const snapshot={environment:'production',fx:{base:'USD',quote:'IDR',rate:'20000',source:'offline-fixture',costBasisVerified:true,observedAt:iso(NOW-1000),expiresAt:iso(NOW+60000)},policy:{taxStatus:'verified',costScope:'registration_year_1',paymentFeeMode:'conservative_ceiling',sourceRef:'offline-fixture',taxSourceRef:'offline-fixture',paymentFeeSourceRef:'offline-fixture',version:'offline-v1',verifiedAt:iso(NOW-1000),expiresAt:iso(NOW+60000),otherDirectCostsIdr:1000,paymentFixedCostIdr:1000,minimumMarginIdr:25000,paymentFeeBasisPoints:100}};
 const snapshotText=JSON.stringify(snapshot),offer={domain:'example.com',providerId:'opensrs',providerEnvironment:'live',availability:'available',years:1,indicative:true,mustRecheckBeforePurchase:true,checkedAt:iso(NOW),expiresAt:iso(NOW+60000),prices:{registration:{supported:true,termYears:1,taxIncluded:true,amount:'5.00',currency:'USD'}}};
 const price=customerRegistrationPrice(offer,snapshotText,{now:NOW});
 const receipt=issueProviderDomainReviewReceipt({code:'DOMAIN_CUSTOMER_PRICE_CHECK',environment:'production',siteId:SITE,domain:offer.domain,quoteContext:context,availability:'available',indicative:true,purchaseAllowed:false,checkoutAvailable:false,checkedAt:offer.checkedAt,expiresAt:price.expiresAt,price},{key:KEY,userId:USER,siteId:SITE,...context,now:NOW,makeId:()=>ID});
 return {input:{reviewToken:receipt.token,domain:offer.domain,idempotencyKey:ID,consent:{accepted:true,version:'domain-registration-v1',domain:offer.domain,siteId:SITE,currency:'IDR',amountIdr:price.amountIdr,years:1},offer,snapshotText},options:{key:KEY,authenticatedUserId:USER,siteId:SITE,ownedSite:{id:SITE,owner_id:USER},...context,now:NOW},price};
}
const rejects=(fn,code)=>assert.throws(fn,error=>error.code===code);
test('intent preserves reviewed IDR, provenance and disabled payment state',()=>{
 const {input,options,price}=fixture(),plan=prepareCustomerDomainPurchaseIntent(input,options),row=plan.rpcArguments.p_input;
 assert.equal(plan.state,'prepared_not_payable');assert.equal(plan.purchaseAllowed,false);assert.equal(plan.checkoutAvailable,false);
 assert.equal(row.pricing.amountIdr,price.amountIdr);assert.equal(row.siteId,SITE);assert.equal(row.providerId,'opensrs');
 assert.equal(row.pricing.amountIdr-row.pricing.registrarCostIdr-row.pricing.otherDirectCostsIdr-row.pricing.paymentCostIdr,25000);
 assert.equal(row.reviewDigest.length,64);assert.ok(!JSON.stringify(plan).includes(input.reviewToken));assert.ok(Object.isFrozen(row.pricing.policy));
 assert.equal(prepareCustomerDomainPurchaseIntent(input,options).rpcArguments.p_input.intentId,row.intentId);
});
test('ownership, explicit consent and changed fresh prices block intent preparation',()=>{
 const {input,options}=fixture();
 rejects(()=>prepareCustomerDomainPurchaseIntent(input,{...options,ownedSite:{id:SITE,owner_id:ID}}),'SITE_OWNER_REQUIRED');
 rejects(()=>prepareCustomerDomainPurchaseIntent({...input,consent:{...input.consent,accepted:false}},options),'EXPLICIT_PURCHASE_CONSENT_REQUIRED');
 rejects(()=>prepareCustomerDomainPurchaseIntent({...input,consent:{...input.consent,amountIdr:1}},options),'EXPLICIT_PURCHASE_CONSENT_REQUIRED');
 const offer={...input.offer,prices:{registration:{...input.offer.prices.registration,amount:'6.00'}}};
 rejects(()=>prepareCustomerDomainPurchaseIntent({...input,offer},options),'DOMAIN_PRICE_CHANGED_REVIEW_REQUIRED');
});
test('provider, account and expired receipt mismatches cannot create intents',()=>{
 const {input,options}=fixture();
 assert.throws(()=>prepareCustomerDomainPurchaseIntent(input,{...options,providerId:'cloudflare'}));
 assert.throws(()=>prepareCustomerDomainPurchaseIntent(input,{...options,registrarAccountRef:'different-fixture'}));
 assert.throws(()=>prepareCustomerDomainPurchaseIntent(input,{...options,now:NOW+60000}));
});
test('draft SQL source contains immutable nonpayable and atomic ledger guards, not a deployment proof',()=>{
 const sql=readFileSync(new URL('../server/drafts/domain-customer-purchase-intent.sql',import.meta.url),'utf8');
 for(const fragment of ['SECURITY INVOKER','ENABLE ROW LEVEL SECURITY','pg_advisory_xact_lock','REVIEW_ALREADY_CONSUMED','IDEMPOTENCY_CONFLICT',"state='prepared_not_payable'",'UNIQUE(user_id,idempotency_key)','review_id uuid NOT NULL UNIQUE'])assert.ok(sql.includes(fragment),fragment);
 assert.ok(!/UPDATE public[.]domain_purchase_orders|INSERT INTO public[.]domain_sale_quotes/.test(sql));
});
