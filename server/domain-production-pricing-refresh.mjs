import {validateDomainPricingSnapshot,parseDomainPricingSnapshot} from './domain-pricing-snapshot.mjs';
const PRIMARY='DOMAIN_PRODUCTION_PRICING_SNAPSHOT_JSON',SHARED='DOMAIN_CUSTOMER_REGISTRATION_PRICING_SNAPSHOT';
const fail=code=>{throw Object.assign(new Error(code),{code});};
const safeCodes=new Set('PRICING_SNAPSHOT_TOO_LARGE INVALID_PRICING_JSON INVALID_PRICING_SNAPSHOT_SHAPE INVALID_PRICING_REFERENCE INVALID_PRICING_TIME INVALID_PRICING_CLOCK INVALID_PRICING_ENVIRONMENT PRODUCTION_REQUIRED INVALID_FX_PAIR INVALID_FX_RATE FX_COST_BASIS_UNVERIFIED FX_SNAPSHOT_EXPIRED COST_POLICY_UNVERIFIED INVALID_PRICING_VERSION COST_POLICY_EXPIRED INVALID_IDR_COST MINIMUM_MARGIN_BELOW_REQUIRED INVALID_PAYMENT_FEE PRICING_VALIDITY_WINDOW_TOO_SHORT PRICING_BINDING_TOO_LARGE'.split(' '));
function validClock(now){if(!Number.isSafeInteger(now)||Math.abs(now)>8640000000000000)fail('INVALID_PRICING_CLOCK');}
// Structural validation is not an external audit of the supplied cost evidence.
export function buildProductionPricingSnapshot(input,{now=Date.now()}={}){
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length!==2||!Object.hasOwn(input,'fx')||!Object.hasOwn(input,'policy'))fail('INVALID_PRICING_SNAPSHOT_SHAPE');
 const snapshot=validateDomainPricingSnapshot({environment:'production',fx:input.fx,policy:input.policy},{now,environment:'production'});
 if(Math.min(Date.parse(snapshot.fx.expiresAt),Date.parse(snapshot.policy.expiresAt))-now<300000)fail('PRICING_VALIDITY_WINDOW_TOO_SHORT');
 if(new TextEncoder().encode(JSON.stringify(snapshot)).length>5120)fail('PRICING_BINDING_TOO_LARGE');
 return snapshot;
}
// Internal preparation only: no provider, scheduler, storage write or installation is built in.
export async function refreshProductionPricingSnapshot(text,{getVerifiedFx,clock=Date.now}={}){
 const before=clock();validClock(before);
 if(typeof text!=='string'||new TextEncoder().encode(text).length>16384)fail('PRICING_SNAPSHOT_TOO_LARGE');
 let raw;try{raw=JSON.parse(text);}catch{fail('INVALID_PRICING_JSON');}
 const originalTime=Math.max(Date.parse(raw?.fx?.observedAt),Date.parse(raw?.policy?.verifiedAt));
 const previous=parseDomainPricingSnapshot(text,{now:originalTime,environment:'production'});
 if(originalTime>before)fail('PRICING_REFRESH_FROM_FUTURE');
 if(Date.parse(previous.policy.expiresAt)-before<300000)fail('COST_POLICY_REFRESH_REQUIRED');
 if(typeof getVerifiedFx!=='function')fail('VERIFIED_FX_PROVIDER_REQUIRED');
 let fx;
 try{fx=await getVerifiedFx(Object.freeze({base:'USD',quote:'IDR',source:previous.fx.source,previousObservedAt:previous.fx.observedAt}));}
 catch{fail('VERIFIED_FX_REFRESH_UNAVAILABLE');}
 const after=clock();validClock(after);if(after<before)fail('PRICING_REFRESH_CLOCK_REVERSED');
 const next=buildProductionPricingSnapshot({fx,policy:previous.policy},{now:after});
 if(next.fx.source!==previous.fx.source)fail('FX_SOURCE_CHANGE_REQUIRES_APPROVAL');
 if(Date.parse(next.fx.observedAt)<=Date.parse(previous.fx.observedAt))fail('FX_REFRESH_NOT_NEWER');
 return next;
}
// Runtime-env diagnostic, not a Cloudflare inventory reader. Never returns snapshot values.
export function diagnoseProductionPricingSnapshot(env,{now=Date.now()}={}){
 let binding;
 try{
  const primary=env?.[PRIMARY];binding=primary===undefined?SHARED:PRIMARY;
  const text=primary===undefined?env?.[SHARED]:primary;
  if(text===undefined)return {status:'missing',code:'PRICING_SNAPSHOT_MISSING',checkedBindings:[PRIMARY,SHARED],readyForPayments:false};
  const snapshot=parseDomainPricingSnapshot(text,{now,environment:'production'});
  buildProductionPricingSnapshot({fx:snapshot.fx,policy:snapshot.policy},{now});
  return {status:'structurally_valid',binding,evidenceAudited:false,quoteVerified:false,readyForPayments:false};
 }catch(error){return {status:'invalid',...(binding?{binding}:{}),code:safeCodes.has(error?.code)?error.code:'PRICING_SNAPSHOT_INVALID',readyForPayments:false};}
}
