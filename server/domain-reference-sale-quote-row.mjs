import {normalizeDomainReferenceFx} from './domain-reference-fx.mjs';
import {DOMAIN_REFERENCE_SALE_POLICY as policy,buildDomainReferenceSalePrice} from './domain-reference-sale-price.mjs';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const fail=()=>{throw Object.assign(new Error('REFERENCE_QUOTE_ROW_INVALID'),{code:'REFERENCE_QUOTE_ROW_INVALID'});};
const ceil=(n,d)=>(n+d-1n)/d;
function micro(text){if(typeof text!=='string'||!/^(?:0|[1-9]\d{0,11})(?:\.\d{1,6})?$/.test(text))fail();const [a,b='']=text.split('.'),n=BigInt(a)*1000000n+BigInt(b.padEnd(6,'0'));if(n<=0n)fail();return n;}
// Private serialization only. Expected identity/domain must come from verified server context.
// Requires the reviewed DB contract before insertion; does not write, publish or enable payment.
export function serializeDomainReferenceSaleQuote(result,{expectedUserId,expectedDomain,now=Date.now()}={}){
 const d=result?.draft,f=d?.fxReference,p=d?.registrarReference;
 if(!Number.isSafeInteger(now)||Math.abs(now)>8640000000000000||typeof expectedUserId!=='string'||!UUID.test(expectedUserId)||typeof expectedDomain!=='string')fail();
 if(result?.status!=='reference_sale_quote_draft'||result.purchaseAllowed!==false||result.quoteCreated!==false||result.checkoutCreated!==false||result.registrationStarted!==false)fail();
 if(typeof d?.id!=='string'||!UUID.test(d.id)||d.userId!==expectedUserId.toLowerCase()||d.domain!==expectedDomain||d.domain!==d.domain.toLowerCase()||d.environment!=='production'||d.years!==1||d.currency!=='IDR'||d.pricingMode!==policy.mode||d.pricingVersion!==policy.version||d.actualCostsVerified!==false||d.netMarginGuaranteed!==false||d.merchantAbsorbsOverrun!==true||p?.providerId!=='cloudflare'||f?.costBasisVerified!==false)fail();
 const times=[d.createdAt,d.expiresAt,p.checkedAt,f.retrievedAt,f.refreshAfter];
 if(times.some(t=>typeof t!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,6})?Z$/.test(t)||!Number.isSafeInteger(Date.parse(t))))fail();
 const [created,expires,checked,retrieved,refresh]=times.map(Date.parse);
 if(created>now||expires-now<5000||checked>created||created-checked>=60000||expires>checked+60000||retrieved>created||refresh<=retrieved||refresh-retrieved>300000||expires>refresh)fail();
 const normalized=normalizeDomainReferenceFx({base:f.base,quote:f.quote,rate:Number(f.rate),date:f.rateDate},{now});
 if(f.rate!==normalized.rate||f.source!==normalized.source||f.sourceUrl!==normalized.sourceUrl)fail();
 const rate=micro(f.rate),r=ceil(micro(p.registrationAmountUsd)*rate,1000000000000n);if(r>1000000000000n)fail();
 const budget=buildDomainReferenceSalePrice({referenceRegistrarCostIdr:Number(r)});
 if(d.budget?.mode!==policy.mode||d.budget?.policyVersion!==policy.version||d.budget?.actualCostsVerified!==false||d.budget?.netMarginGuaranteed!==false||d.amountIdr!==budget.amountIdr||['referenceRegistrarCostIdr','registrarReserveIdr','paymentReserveIdr','targetMarginIdr','modelMarginIdr','roundingSurplusIdr'].some(k=>d.budget?.[k]!==budget[k]))fail();
 const numerator=BigInt(budget.amountIdr)*100000000n,cents=(2n*numerator+rate)/(2n*rate);
 if(cents<=0n||cents>100000000000000n)fail();
 const saleUsd=(cents/100n).toString()+'.'+(cents%100n).toString().padStart(2,'0');
 return {id:d.id.toLowerCase(),user_id:d.userId,environment:'production',domain:d.domain,provider_id:'cloudflare',operation:'registration',years:1,currency:'IDR',sale_price_idr:budget.amountIdr,registrar_cost_idr:budget.referenceRegistrarCostIdr,other_direct_costs_idr:budget.registrarReserveIdr,payment_cost_idr:budget.paymentReserveIdr,pricing_version:policy.version,cost_basis:{source_ref:'merchant-approved:'+policy.version,pricing_mode:policy.mode,policy_version:policy.version,actual_costs_verified:false,net_margin_guaranteed:false,merchant_absorbs_overrun:true,fixture_only:false,tax_status:'not_assessed',payment_fee_mode:'merchant_budget',registrar_reserve_basis_points:2000,payment_reserve_basis_points:400,payment_fixed_reserve_idr:5000,target_margin_idr:25000,rounding_increment_idr:1000,provider_price_currency:'USD',provider_price_amount:p.registrationAmountUsd,provider_checked_at:p.checkedAt,fx_reference_date:f.rateDate,fx_retrieved_at:f.retrievedAt,fx_cost_basis_verified:false,usd_display_is_reference:true},checked_at:d.createdAt,expires_at:d.expiresAt,display_currency:'USD',sale_price_usd:saleUsd,fx_rate_usd_idr:f.rate,fx_source:f.source,fx_observed_at:f.retrievedAt,fx_expires_at:f.refreshAfter};
}
