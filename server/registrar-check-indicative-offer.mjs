const amount=value=>typeof value==='string'&&/^(?:0|[1-9]\d{0,11})(?:\.\d{1,6})?$/.test(value);
const invalid=()=>Object.assign(new Error('INVALID_CHECK_OFFER'),{code:'INVALID_CHECK_OFFER'});
export function createIndicativeCheckOffer(check,{domain,now=Date.now(),maxAgeMs=60000,makeId=()=>globalThis.crypto.randomUUID()}={}){
 if(typeof domain!=='string'||!domain||typeof now!=='number'||!Number.isFinite(now)||Math.abs(now)>8640000000000000||!Number.isInteger(maxAgeMs)||maxAgeMs<1000||maxAgeMs>300000||typeof makeId!=='function')throw invalid();
 const empty=status=>({status,domain,offer:null,lookupOnly:true,purchaseAllowed:false});
 if(check?.domain!==domain||check?.providerId!=='cloudflare'||check?.lookupOnly!==true||check?.purchaseAllowed!==false)throw invalid();
 if(check.status==='not_registrable'&&check.registrable===false)return empty('not_registrable');
 if(check.status==='premium_not_supported'&&check.tier==='premium'&&check.registrable===true)return empty('premium_not_supported');
 if(check.status!=='checked'||check.registrable!==true||check.tier!=='standard'||check.mustRecheckBeforePurchase!==true)throw invalid();
 if(typeof check.checkedAt!=='string')throw invalid();
 const checked=Date.parse(check.checkedAt);
 if(!Number.isFinite(checked))throw invalid();
 if(checked>now)return empty('clock_mismatch');
 const expires=checked+maxAgeMs;
 if(!Number.isFinite(expires)||Math.abs(expires)>8640000000000000)throw invalid();
 if(now>=expires)return empty('expired');
 const p=check.prices;
 if(typeof p?.currency!=='string'||!/^[A-Z]{3}$/.test(p.currency)||!amount(p?.registration?.amount)||!amount(p?.renewal?.amount)||p.registration.termYears!==1||p.renewal.termYears!==1||p.transfer!==null||p.taxIncluded!==null)throw invalid();
 const id=makeId();
 if(typeof id!=='string'||!/^[A-Za-z0-9_-]{8,100}$/.test(id))throw invalid();
 const price=item=>Object.freeze({amount:item.amount,currency:p.currency,termYears:1,taxIncluded:null});
 return {status:'indicative_offer',domain,lookupOnly:true,purchaseAllowed:false,offer:Object.freeze({
  contract:'registrar-check-indicative-v1',quoteId:id,providerId:'cloudflare',domain,registrable:true,tier:'standard',
  checkedAt:new Date(checked).toISOString(),expiresAt:new Date(expires).toISOString(),
  prices:Object.freeze({registration:price(p.registration),renewal:price(p.renewal),transfer:Object.freeze({status:'not_quoted'})}),
  indicative:true,mustRecheckBeforePurchase:true,registrantEligibility:'not_checked',taxStatus:'unknown',
  ownership:'not_acquired',connectedToSite:false,purchaseAllowed:false
 })};
}
