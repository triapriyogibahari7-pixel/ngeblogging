// Private server calculation only. Caller must verify the account and obtain trusted
// registrar, FX and cost-policy snapshots. No fetch, persistence, checkout or registration.
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const fail=code=>{throw Object.assign(new Error(code),{code});};
const ceil=(n,d)=>(n+d-1n)/d;
function ref(value){if(typeof value!=='string'||!value.trim()||value.length>200||/[\u0000-\u001f\u007f]/.test(value))fail('INVALID_SOURCE_REFERENCE');return value;}
function time(value){if(typeof value!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,6})?(?:Z|[+-]\d\d:\d\d)$/.test(value)||!Number.isSafeInteger(Date.parse(value)))fail('INVALID_SNAPSHOT_TIME');return Date.parse(value);}
function micro(value){if(typeof value!=='string'||!/^(?:0|[1-9]\d{0,11})(?:\.\d{1,6})?$/.test(value))fail('INVALID_DECIMAL_AMOUNT');const [a,b='']=value.split('.');const n=BigInt(a)*1000000n+BigInt(b.padEnd(6,'0'));if(n<=0n)fail('INVALID_DECIMAL_AMOUNT');return n;}
function idr(value){if(!Number.isSafeInteger(value)||value<0||value>1000000000000)fail('INVALID_IDR_COST');return BigInt(value);}
function number(value){if(value<0n||value>1000000000000n)fail('PRICE_OUT_OF_RANGE');return Number(value);}
export function buildDomainSaleQuoteDraft(check,{userId,environment,fx,policy,now=Date.now(),makeId=()=>crypto.randomUUID()}={}){
 if(environment!=='sandbox')fail('SANDBOX_REQUIRED');
 if(typeof userId!=='string'||!UUID.test(userId)||!Number.isSafeInteger(now)||Math.abs(now)>8640000000000000||typeof makeId!=='function')fail('INVALID_QUOTE_CONTEXT');
 if(check?.providerId!=='cloudflare'||check.status!=='checked'||check.registrable!==true||check.tier!=='standard'||check.lookupOnly!==true||check.purchaseAllowed!==false||check.mustRecheckBeforePurchase!==true)fail('REGISTRAR_CHECK_NOT_ELIGIBLE');
 const domain=check.domain;
 if(typeof domain!=='string'||domain.length>253||domain!==domain.toLowerCase()||!domain.includes('.')||/^\d+(?:\.\d+){3}$/.test(domain)||domain.split('.').some(x=>!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(x)))fail('INVALID_QUOTE_DOMAIN');
 const checked=time(check.checkedAt);if(checked>now||now-checked>=60000)fail('REGISTRAR_CHECK_EXPIRED');
 if(check.prices?.currency!=='USD'||check.prices.registration?.termYears!==1)fail('UNSUPPORTED_REGISTRAR_PRICE');
 const registrarUsd=micro(check.prices.registration.amount);
 if(fx?.base!=='USD'||fx.quote!=='IDR')fail('INVALID_FX_PAIR');
 const rate=micro(fx.rate);if(rate>1000000000000n)fail('INVALID_FX_RATE');
 const observed=time(fx.observedAt),fxExpires=time(fx.expiresAt);ref(fx.source);
 if(observed>now||fxExpires<=now||fxExpires<=observed||fxExpires-observed>86400000)fail('FX_SNAPSHOT_EXPIRED');
 if(policy?.taxStatus!=='verified'||policy.costScope!=='registration_year_1'||policy.paymentFeeMode!=='conservative_ceiling')fail('COST_POLICY_UNVERIFIED');
 ref(policy.sourceRef);ref(policy.taxSourceRef);ref(policy.paymentFeeSourceRef);
 if(typeof policy.version!=='string'||!/^[A-Za-z0-9_.-]{1,100}$/.test(policy.version))fail('INVALID_PRICING_VERSION');
 const verified=time(policy.verifiedAt),policyExpires=time(policy.expiresAt);if(verified>now||policyExpires<=now||policyExpires<=verified)fail('COST_POLICY_EXPIRED');
 const other=idr(policy.otherDirectCostsIdr),fixed=idr(policy.paymentFixedCostIdr),margin=idr(policy.minimumMarginIdr);
 if(margin===0n||!Number.isInteger(policy.paymentFeeBasisPoints)||policy.paymentFeeBasisPoints<0||policy.paymentFeeBasisPoints>=10000)fail('INVALID_MARGIN_OR_PAYMENT_FEE');
 const bps=BigInt(policy.paymentFeeBasisPoints),registrar=ceil(registrarUsd*rate,1000000000000n);
 const required=ceil((registrar+other+fixed+margin)*10000n,10000n-bps);
 const cents=ceil(required*100000000n,rate);if(cents>99999999999999n)fail('PRICE_OUT_OF_RANGE');
 const sale=ceil(cents*rate,100000000n),payment=fixed+ceil(sale*bps,10000n),net=sale-registrar-other-payment;
 if(net<margin)fail('MINIMUM_MARGIN_NOT_MET');
 const expires=Math.min(checked+60000,fxExpires,policyExpires);if(expires-now<5000)fail('SNAPSHOT_REFRESH_REQUIRED');
 const quoteId=makeId();if(typeof quoteId!=='string'||!UUID.test(quoteId))fail('INVALID_QUOTE_ID');
 const saleUsd=(cents/100n).toString()+'.'+(cents%100n).toString().padStart(2,'0');
 const row={id:quoteId.toLowerCase(),user_id:userId.toLowerCase(),environment:'sandbox',domain,provider_id:'cloudflare',operation:'registration',years:1,currency:'IDR',sale_price_idr:number(sale),registrar_cost_idr:number(registrar),other_direct_costs_idr:number(other),payment_cost_idr:number(payment),pricing_version:policy.version,cost_basis:{source_ref:policy.sourceRef,provider_checked_at:check.checkedAt,provider_price_currency:'USD',provider_price_amount:check.prices.registration.amount,tax_status:'verified',tax_source_ref:policy.taxSourceRef,payment_fee_mode:'conservative_ceiling',payment_fee_source_ref:policy.paymentFeeSourceRef,payment_fee_basis_points:policy.paymentFeeBasisPoints,payment_fixed_cost_idr:Number(fixed),minimum_margin_idr:Number(margin),computed_margin_idr:number(net),cost_policy_verified_at:policy.verifiedAt,cost_policy_expires_at:policy.expiresAt},checked_at:new Date(now).toISOString(),expires_at:new Date(expires).toISOString(),display_currency:'USD',sale_price_usd:saleUsd,fx_rate_usd_idr:fx.rate,fx_source:fx.source,fx_observed_at:fx.observedAt,fx_expires_at:fx.expiresAt};
 return {status:'quote_draft',lookupOnly:true,purchaseAllowed:false,checkoutCreated:false,registrationStarted:false,row};
}
