import {normalizeRegistrarDomain} from './domain-registrar-quote-router.mjs';
import {normalizeDomainReferenceFx} from './domain-reference-fx.mjs';
import {buildDomainReferenceSalePrice} from './domain-reference-sale-price.mjs';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const fail=code=>{throw Object.assign(new Error(code),{code});};
const ceil=(n,d)=>(n+d-1n)/d;
function time(value){if(typeof value!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,6})?Z$/.test(value)||!Number.isSafeInteger(Date.parse(value)))fail('INVALID_REFERENCE_QUOTE_TIME');return Date.parse(value);}
function micro(value){if(typeof value!=='string'||!/^(?:0|[1-9]\d{0,11})(?:\.\d{1,6})?$/.test(value))fail('INVALID_REFERENCE_QUOTE_AMOUNT');const [a,b='']=value.split('.'),n=BigInt(a)*1000000n+BigInt(b.padEnd(6,'0'));if(n<=0n)fail('INVALID_REFERENCE_QUOTE_AMOUNT');return n;}
// Internal draft composition only. No fetch, DB write, payment or registration.
// The caller must obtain these inputs server-side, never from a browser price payload.
export function buildDomainReferenceSaleQuoteDraft(check,fx,{userId,now=Date.now(),makeId=()=>globalThis.crypto.randomUUID()}={}){
 if(!Number.isSafeInteger(now)||Math.abs(now)>8640000000000000||typeof userId!=='string'||!UUID.test(userId)||typeof makeId!=='function')fail('INVALID_REFERENCE_QUOTE_CONTEXT');
 if(check?.providerId!=='cloudflare'||check.status!=='checked'||check.registrable!==true||check.tier!=='standard'||check.lookupOnly!==true||check.purchaseAllowed!==false||check.mustRecheckBeforePurchase!==true||check.fixtureOnly===true||check.fixture_only===true||check.referenceOnly===true)fail('REFERENCE_REGISTRAR_NOT_ELIGIBLE');
 const domain=normalizeRegistrarDomain(check.domain).domain;if(domain!==check.domain)fail('REFERENCE_DOMAIN_NOT_CANONICAL');
 const checked=time(check.checkedAt);if(checked>now||now-checked>=60000)fail('REFERENCE_REGISTRAR_EXPIRED');
 if(check.prices?.currency!=='USD'||check.prices.registration?.termYears!==1)fail('REFERENCE_REGISTRAR_PRICE_UNSUPPORTED');
 const usd=micro(check.prices.registration.amount);
 if(fx?.status!=='reference_available'||fx.referenceOnly!==true||fx.costBasisVerified!==false||fx.usableForCustomerQuote!==false||fx.purchaseAllowed!==false)fail('REFERENCE_FX_NOT_ELIGIBLE');
 const normalized=normalizeDomainReferenceFx({base:fx.base,quote:fx.quote,rate:Number(fx.rate),date:fx.rateDate},{now});
 if(fx.rate!==normalized.rate||fx.source!==normalized.source||fx.sourceUrl!==normalized.sourceUrl)fail('REFERENCE_FX_PROVENANCE_MISMATCH');
 const retrieved=time(fx.retrievedAt),refresh=time(fx.refreshAfter);
 if(retrieved>now||refresh<=now||refresh<=retrieved||refresh-retrieved>300000||now-retrieved>=300000)fail('REFERENCE_FX_EXPIRED');
 const referenceCost=ceil(usd*micro(normalized.rate),1000000000000n);
 if(referenceCost>1000000000000n)fail('REFERENCE_SALE_PRICE_OUT_OF_RANGE');
 const budget=buildDomainReferenceSalePrice({referenceRegistrarCostIdr:Number(referenceCost)});
 const expires=Math.min(checked+60000,refresh);if(expires-now<5000)fail('REFERENCE_QUOTE_REFRESH_REQUIRED');
 const id=makeId();if(typeof id!=='string'||!UUID.test(id))fail('INVALID_REFERENCE_QUOTE_ID');
 return {status:'reference_sale_quote_draft',lookupOnly:true,purchaseAllowed:false,quoteCreated:false,checkoutCreated:false,registrationStarted:false,draft:{id:id.toLowerCase(),userId:userId.toLowerCase(),environment:'production',domain,years:1,currency:'IDR',amountIdr:budget.amountIdr,pricingMode:budget.mode,pricingVersion:budget.policyVersion,budget,registrarReference:{providerId:'cloudflare',registrationAmountUsd:check.prices.registration.amount,checkedAt:check.checkedAt},fxReference:{base:'USD',quote:'IDR',rate:normalized.rate,rateDate:normalized.rateDate,source:normalized.source,sourceUrl:normalized.sourceUrl,retrievedAt:fx.retrievedAt,refreshAfter:fx.refreshAfter,costBasisVerified:false},createdAt:new Date(now).toISOString(),expiresAt:new Date(expires).toISOString(),actualCostsVerified:false,netMarginGuaranteed:false,merchantAbsorbsOverrun:true}};
}
