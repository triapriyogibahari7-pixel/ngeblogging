import {DOMAIN_REFERENCE_SALE_POLICY as policy,buildDomainReferenceSalePrice} from './domain-reference-sale-price.mjs';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const fail=()=>{throw Object.assign(Error('REFERENCE_ORDER_QUOTE_UNVERIFIED'),{code:'REFERENCE_ORDER_QUOTE_UNVERIFIED'});};
const ceil=(n,d)=>(n+d-1n)/d;
function decimal(value,digits){const text=typeof value==='number'&&Number.isFinite(value)?String(value):value;if(typeof text!=='string'||!/^(?:0|[1-9]\d{0,11})(?:\.\d{1,6})?$/.test(text))fail();const [a,b='']=text.split('.');if(b.length>digits)fail();const n=BigInt(a)*10n**BigInt(digits)+BigInt(b.padEnd(digits,'0'));if(n<=0n)fail();return n;}
function time(value){if(typeof value!=='string'||value.length>64)fail();const n=Date.parse(value);if(!Number.isSafeInteger(n))fail();return n;}
// Internal quote validation only; does not authorize checkout or mutate any record.
// Identity and lockedAt must come from authenticated server context and verified order identity.
export function validateReferenceOrderQuote(q,{userId,quoteId,domain,amountIdr,lockedAt,now=Date.now()}={}){
 if(typeof userId!=='string'||!UUID.test(userId)||typeof quoteId!=='string'||!UUID.test(quoteId)||!Number.isSafeInteger(now))fail();
 if(!q||q.id!==quoteId.toLowerCase()||q.user_id!==userId.toLowerCase()||q.domain!==domain||typeof domain!=='string'||domain.length>253||domain!==domain.toLowerCase()||!domain.includes('.')||/^\d+(?:\.\d+){3}$/.test(domain)||domain.split('.').some(x=>!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(x)))fail();
 if(q.environment!=='production'||q.provider_id!=='cloudflare'||q.operation!=='registration'||q.years!==1||q.currency!=='IDR'||q.display_currency!=='USD'||q.pricing_version!==policy.version||!Number.isSafeInteger(amountIdr)||amountIdr<1||amountIdr>1000000000000||q.sale_price_idr!==amountIdr)fail();
 const c=q.cost_basis;
 const required={source_ref:'merchant-approved:'+policy.version,pricing_mode:policy.mode,policy_version:policy.version,actual_costs_verified:false,net_margin_guaranteed:false,merchant_absorbs_overrun:true,fixture_only:false,tax_status:'not_assessed',payment_fee_mode:'merchant_budget',registrar_reserve_basis_points:policy.registrarReserveBasisPoints,payment_reserve_basis_points:policy.paymentReserveBasisPoints,payment_fixed_reserve_idr:policy.paymentFixedReserveIdr,target_margin_idr:policy.targetMarginIdr,rounding_increment_idr:policy.roundingIncrementIdr,provider_price_currency:'USD',fx_cost_basis_verified:false,usd_display_is_reference:true};
 if(!c||typeof c!=='object'||Array.isArray(c)||Object.entries(required).some(([key,value])=>c[key]!==value)||['fixtureOnly','referenceOnly','tax_source_ref','payment_fee_source_ref'].some(key=>Object.hasOwn(c,key)))fail();
 const rate=decimal(q.fx_rate_usd_idr,6);if(rate>1000000000000n||q.fx_source!=='ECB reference via Frankfurter')fail();
 if(typeof c.provider_price_amount!=='string')fail();const registrar=ceil(decimal(c.provider_price_amount,6)*rate,1000000000000n);if(registrar>1000000000000n)fail();
 const budget=buildDomainReferenceSalePrice({referenceRegistrarCostIdr:Number(registrar)});
 if(amountIdr!==budget.amountIdr||q.registrar_cost_idr!==budget.referenceRegistrarCostIdr||q.other_direct_costs_idr!==budget.registrarReserveIdr||q.payment_cost_idr!==budget.paymentReserveIdr)fail();
 const numerator=BigInt(amountIdr)*100000000n,cents=(2n*numerator+rate)/(2n*rate);if(decimal(q.sale_price_usd,2)!==cents)fail();
 const locked=time(lockedAt),checked=time(q.checked_at),expires=time(q.expires_at),observed=time(q.fx_observed_at),fxExpires=time(q.fx_expires_at),providerChecked=time(c.provider_checked_at);
 if(locked>now||checked>locked||locked>=expires||providerChecked>checked||checked-providerChecked>=60000||expires<=checked||expires>providerChecked+60000||observed>checked||fxExpires<=observed||fxExpires-observed>300000||expires>fxExpires||time(c.fx_retrieved_at)!==observed)fail();
 if(typeof c.fx_reference_date!=='string'||!/^\d{4}-\d\d-\d\d$/.test(c.fx_reference_date))fail();const reference=Date.parse(c.fx_reference_date+'T00:00:00Z');if(!Number.isSafeInteger(reference)||new Date(reference).toISOString().slice(0,10)!==c.fx_reference_date)fail();const day=Date.parse(new Date(checked).toISOString().slice(0,10)+'T00:00:00Z');if(reference>day||day-reference>7*86400000)fail();
 return Object.freeze({pricingMode:policy.mode,pricingVersion:policy.version,currency:'IDR',amountIdr,usdDisplayIsReference:true,salePriceUsd:(cents/100n).toString()+'.'+(cents%100n).toString().padStart(2,'0'),actualCostsVerified:false,netMarginGuaranteed:false});
}
