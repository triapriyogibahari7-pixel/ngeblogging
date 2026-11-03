import {fetchDomainReferenceFx} from './domain-reference-fx.mjs';
import {buildDomainReferenceSaleQuoteDraft} from './domain-reference-sale-quote-draft.mjs';
import {serializeDomainReferenceSaleQuote} from './domain-reference-sale-quote-row.mjs';
// Called only after the existing handler has verified origin, session, and production gates.
export async function issueDomainReferenceSaleQuote(env,{domain,userId,fetchImpl,checkImpl,clock,makeId,wait,signal,base,reply,fxImpl=fetchDomainReferenceFx,buildImpl=buildDomainReferenceSaleQuoteDraft,serializeImpl=serializeDomainReferenceSaleQuote}){
 const [check,fx]=await wait(Promise.all([checkImpl(env,{domain},{fetchImpl,clock}),fxImpl({fetchImpl,clock,signal})]));
 if(check?.status==='not_registrable'&&['extension_not_supported_via_api','extension_not_supported','extension_disallows_registration'].includes(check.reason))return reply(422,'UNSUPPORTED_EXTENSION');
 if(check?.status==='not_registrable'&&check.reason==='domain_unavailable')return reply(409,'DOMAIN_UNAVAILABLE');
 if(check?.status==='premium_not_supported')return reply(422,'PREMIUM_NOT_SUPPORTED');
 if(check?.status!=='checked'||check.domain!==domain)return reply(502,'REGISTRAR_QUOTE_UNAVAILABLE');
 if(fx?.status!=='reference_available')return reply(503,'DOMAIN_PRICING_INPUTS_UNAVAILABLE',{reason:'REFERENCE_FX_UNAVAILABLE',stage:'calculation'});
 let row,draft;
 try{
  const now=clock();draft=buildImpl(check,fx,{userId,now,makeId});
  row=serializeImpl(draft,{expectedUserId:userId,expectedDomain:domain,now});
  if(row.environment!=='production'||row.user_id!==userId.toLowerCase()||row.domain!==domain||row.currency!=='IDR')throw Error();
 }catch{return reply(503,'DOMAIN_PRICING_INPUTS_UNAVAILABLE',{reason:'REFERENCE_QUOTE_INVALID',stage:'calculation'});}
 if(signal.aborted||Date.parse(row.expires_at)-clock()<5000)return reply(503,'SNAPSHOT_REFRESH_REQUIRED');
 const stored=await wait(fetchImpl(new Request(new URL('/rest/v1/domain_sale_quotes',base),{method:'POST',redirect:'manual',headers:{authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY,apikey:env.SUPABASE_SERVICE_ROLE_KEY,'content-type':'application/json',prefer:'return=minimal'},body:JSON.stringify(row),signal})));
 if(![201,204].includes(stored.status))return reply(503,'DOMAIN_QUOTE_STORAGE_UNAVAILABLE');
 if(Date.parse(row.expires_at)<=clock())return reply(409,'QUOTE_EXPIRED');
 const b=draft.draft.budget;
 return reply(201,'DOMAIN_QUOTE_PRODUCTION',{quote:{quoteId:row.id,domain:row.domain,years:1,displayCurrency:'USD',salePriceUsd:row.sale_price_usd,currency:'IDR',amountIdr:row.sale_price_idr,expiresAt:row.expires_at,indicative:false,pricingMode:'public_reference_budget',actualCostsVerified:false,netMarginGuaranteed:false,merchantAbsorbsOverrun:true,pricingBreakdown:{version:2,currency:'IDR',referenceRegistrarCostIdr:b.referenceRegistrarCostIdr,registrarReserveIdr:b.registrarReserveIdr,paymentReserveIdr:b.paymentReserveIdr,targetMarginIdr:b.targetMarginIdr,modelMarginIdr:b.modelMarginIdr,totalIdr:b.amountIdr,taxStatus:'not_assessed',paymentFeeMode:'merchant_budget',usdDisplayIsReference:true}}});
}
