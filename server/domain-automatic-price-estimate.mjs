import {checkCloudflareRegistrar} from './cloudflare-registrar-check.mjs';
import {fetchDomainReferenceFx,normalizeDomainReferenceFx} from './domain-reference-fx.mjs';
import {normalizeRegistrarDomain} from './domain-registrar-quote-router.mjs';
const fail=code=>{throw Object.assign(new Error(code),{code});};
const ceil=(n,d)=>(n+d-1n)/d;
const amount=n=>{if(n<0n||n>1000000000000n)fail('ESTIMATE_OUT_OF_RANGE');return Number(n);};
function micro(text){if(typeof text!=='string'||!/^(?:0|[1-9]\d{0,11})(?:\.\d{1,6})?$/.test(text))fail('ESTIMATE_INVALID_AMOUNT');const [a,b='']=text.split('.'),n=BigInt(a)*1000000n+BigInt(b.padEnd(6,'0'));if(n<=0n)fail('ESTIMATE_INVALID_AMOUNT');return n;}
export function buildAutomaticDomainEstimate(check,fx,{domain,now=Date.now(),policy=null}={}){
 domain=normalizeRegistrarDomain(domain).domain;
 if(!Number.isSafeInteger(now)||Math.abs(now)>8640000000000000)fail('ESTIMATE_INVALID_CLOCK');
 if(check?.domain!==domain||check.providerId!=='cloudflare'||check.status!=='checked'||check.registrable!==true||check.tier!=='standard'||check.lookupOnly!==true||check.purchaseAllowed!==false||check.mustRecheckBeforePurchase!==true||check.fixtureOnly===true||check.fixture_only===true||check.referenceOnly===true)fail('ESTIMATE_REGISTRAR_UNAVAILABLE');
 const checked=Date.parse(check.checkedAt);if(!Number.isFinite(checked)||checked>now||now-checked>=60000)fail('ESTIMATE_REGISTRAR_EXPIRED');
 if(check.prices?.currency!=='USD'||check.prices.registration?.termYears!==1)fail('ESTIMATE_UNSUPPORTED_CURRENCY');
 if(fx?.status!=='reference_available'||fx.referenceOnly!==true||fx.costBasisVerified!==false||fx.usableForCustomerQuote!==false||Date.parse(fx.retrievedAt)>now||!Number.isFinite(Date.parse(fx.retrievedAt))||!Number.isFinite(Date.parse(fx.refreshAfter))||Date.parse(fx.refreshAfter)<=now)fail('ESTIMATE_FX_UNAVAILABLE');
 const normalized=normalizeDomainReferenceFx({base:fx.base,quote:fx.quote,rate:Number(fx.rate),date:fx.rateDate},{now});
 const rate=micro(normalized.rate),registrar=ceil(micro(check.prices.registration.amount)*rate,1000000000000n),margin=25000n,subtotal=registrar+margin;
 let tax=null,payment=null,total=null;
 if(policy!==null){
  const keys=['taxBasis','taxBasisPoints','paymentFixedCostIdr','paymentFeeBasisPoints','sourceRef'];
  if(!policy||typeof policy!=='object'||Array.isArray(policy)||Object.keys(policy).length!==keys.length||keys.some(key=>!Object.hasOwn(policy,key))||!['registrar_cost','registrar_plus_margin'].includes(policy.taxBasis)||typeof policy.sourceRef!=='string'||!policy.sourceRef.trim()||policy.sourceRef.length>200||/[\u0000-\u001f\u007f]/.test(policy.sourceRef))fail('ESTIMATE_POLICY_INVALID');
  for(const key of ['taxBasisPoints','paymentFeeBasisPoints'])if(!Number.isInteger(policy[key])||policy[key]<0||policy[key]>=10000)fail('ESTIMATE_POLICY_INVALID');
  if(!Number.isSafeInteger(policy.paymentFixedCostIdr)||policy.paymentFixedCostIdr<0||policy.paymentFixedCostIdr>1000000000000)fail('ESTIMATE_POLICY_INVALID');
  tax=ceil((policy.taxBasis==='registrar_cost'?registrar:subtotal)*BigInt(policy.taxBasisPoints),10000n);
  total=ceil((subtotal+tax+BigInt(policy.paymentFixedCostIdr))*10000n,10000n-BigInt(policy.paymentFeeBasisPoints));
  payment=BigInt(policy.paymentFixedCostIdr)+ceil(total*BigInt(policy.paymentFeeBasisPoints),10000n);
  if(total-registrar-tax-payment<margin)fail('ESTIMATE_MARGIN_NOT_MET');
 }
 return {code:'DOMAIN_AUTOMATIC_PRICE_ESTIMATE',domain,currency:'IDR',years:1,indicative:true,referenceOnly:true,costBasisVerified:false,taxStatus:policy===null?'not_calculated':'operator_estimate',paymentFeeStatus:policy===null?'not_calculated':'operator_estimate',purchaseAllowed:false,checkoutAvailable:false,checkoutCreated:false,registrationStarted:false,registrarCostEstimateIdr:amount(registrar),targetMarginIdr:25000,subtotalBeforeTaxAndPaymentFeesIdr:amount(subtotal),taxEstimateIdr:tax===null?null:amount(tax),paymentFeeEstimateIdr:payment===null?null:amount(payment),totalEstimateIdr:total===null?null:amount(total),unpricedCosts:policy===null?['tax','payment_fees']:[],fx:{base:'USD',quote:'IDR',rate:normalized.rate,rateDate:normalized.rateDate,source:normalized.source},checkedAt:new Date(now).toISOString(),expiresAt:new Date(Math.min(checked+60000,Date.parse(fx.refreshAfter))).toISOString(),netMarginGuaranteed:false};
}
// Internal server helper only. An authenticated, rate-limited route must call it.
export async function fetchAutomaticDomainEstimate(env,input,{fetchImpl=globalThis.fetch,clock=Date.now,signal,policy=null,checkImpl=checkCloudflareRegistrar,fxImpl=fetchDomainReferenceFx}={}){
 const domain=normalizeRegistrarDomain(input?.domain).domain;if(signal?.aborted)fail('ESTIMATE_ABORTED');
 const boundedFetch=(target,init={})=>fetchImpl(target,{...init,...(signal?{signal:init.signal?AbortSignal.any([signal,init.signal]):signal}:{})});
 const [check,fx]=await Promise.all([checkImpl(env,{domain},{fetchImpl:boundedFetch,clock}),fxImpl({fetchImpl:boundedFetch,clock,signal})]);
 if(signal?.aborted)fail('ESTIMATE_ABORTED');return buildAutomaticDomainEstimate(check,fx,{domain,now:clock(),policy});
}
