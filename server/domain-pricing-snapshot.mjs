const fail=code=>{throw Object.assign(new Error(code),{code});};
function shape(value,keys){if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==keys.length||keys.some(k=>!Object.hasOwn(value,k)))fail('INVALID_PRICING_SNAPSHOT_SHAPE');}
function reference(value){if(typeof value!=='string'||!value.trim()||value.length>200||/[\u0000-\u001f\u007f]/.test(value))fail('INVALID_PRICING_REFERENCE');}
function timestamp(value){if(typeof value!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,6})?(?:Z|[+-]\d\d:\d\d)$/.test(value)||!Number.isSafeInteger(Date.parse(value)))fail('INVALID_PRICING_TIME');return Date.parse(value);}
export function validateDomainPricingSnapshot(input,{now=Date.now()}={}){
 if(!Number.isSafeInteger(now)||Math.abs(now)>8640000000000000)fail('INVALID_PRICING_CLOCK');
 shape(input,['environment','fx','policy']);
 if(input.environment!=='sandbox')fail('SANDBOX_REQUIRED');
 const f=input.fx,p=input.policy;
 shape(f,['base','quote','rate','observedAt','expiresAt','source','costBasisVerified']);
 shape(p,['taxStatus','costScope','paymentFeeMode','sourceRef','taxSourceRef','paymentFeeSourceRef','version','verifiedAt','expiresAt','otherDirectCostsIdr','paymentFixedCostIdr','minimumMarginIdr','paymentFeeBasisPoints']);
 if(f.base!=='USD'||f.quote!=='IDR')fail('INVALID_FX_PAIR');
 if(typeof f.rate!=='string'||!/^(?:0|[1-9]\d{0,11})(?:\.\d{1,6})?$/.test(f.rate))fail('INVALID_FX_RATE');
 const [whole,fraction='']=f.rate.split('.');const rate=BigInt(whole)*1000000n+BigInt(fraction.padEnd(6,'0'));
 if(rate<=0n||rate>1000000000000n)fail('INVALID_FX_RATE');
 if(f.costBasisVerified!==true)fail('FX_COST_BASIS_UNVERIFIED');
 reference(f.source);const observed=timestamp(f.observedAt),fxExpires=timestamp(f.expiresAt);
 if(observed>now||fxExpires<=now||fxExpires<=observed||fxExpires-observed>86400000)fail('FX_SNAPSHOT_EXPIRED');
 if(p.taxStatus!=='verified'||p.costScope!=='registration_year_1'||p.paymentFeeMode!=='conservative_ceiling')fail('COST_POLICY_UNVERIFIED');
 for(const k of ['sourceRef','taxSourceRef','paymentFeeSourceRef'])reference(p[k]);
 if(typeof p.version!=='string'||!/^[A-Za-z0-9_.-]{1,100}$/.test(p.version))fail('INVALID_PRICING_VERSION');
 const verified=timestamp(p.verifiedAt),policyExpires=timestamp(p.expiresAt);
 if(verified>now||policyExpires<=now||policyExpires<=verified)fail('COST_POLICY_EXPIRED');
 for(const k of ['otherDirectCostsIdr','paymentFixedCostIdr','minimumMarginIdr'])if(!Number.isSafeInteger(p[k])||p[k]<0||p[k]>1000000000000)fail('INVALID_IDR_COST');
 if(p.minimumMarginIdr<25000)fail('MINIMUM_MARGIN_BELOW_REQUIRED');
 if(!Number.isInteger(p.paymentFeeBasisPoints)||p.paymentFeeBasisPoints<0||p.paymentFeeBasisPoints>=10000)fail('INVALID_PAYMENT_FEE');
 return {environment:'sandbox',fx:{...f},policy:{...p}};
}
export function parseDomainPricingSnapshot(text,options){
 if(typeof text!=='string'||new TextEncoder().encode(text).length>16384)fail('PRICING_SNAPSHOT_TOO_LARGE');
 let input;try{input=JSON.parse(text);}catch{fail('INVALID_PRICING_JSON');}
 return validateDomainPricingSnapshot(input,options);
}
