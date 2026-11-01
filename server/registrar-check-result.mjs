import {createIndicativeCheckOffer} from './registrar-check-indicative-offer.mjs';
const failures=new Set(['secret_missing','redirect_rejected','access_denied','rate_limited','provider_error','invalid_response','invalid_clock','timeout','network_error']);
export function attachRegistrarCheckOffer(result,options={}){
 const domain=options.domain;
 const rejected=()=>({domain,providerId:'cloudflare',status:'invalid_response',lookupOnly:true,purchaseAllowed:false,offerStatus:'invalid_check_offer',offer:null});
 if(result?.domain!==domain||result?.providerId!=='cloudflare'||result?.lookupOnly!==true||result?.purchaseAllowed!==false)return rejected();
 if(failures.has(result.status))return {...result,offerStatus:'not_created',offer:null};
 try{
  const built=createIndicativeCheckOffer(result,options);
  if(built.status==='expired'||built.status==='clock_mismatch')return {...rejected(),offerStatus:built.status};
  return {...result,offerStatus:built.status,offer:built.offer};
 }catch{return rejected();}
}
