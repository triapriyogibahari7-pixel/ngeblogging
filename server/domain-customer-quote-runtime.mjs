import {createCloudflareRegistrationQuoteProvider} from './cloudflare-registration-quote-provider.mjs';
import {createConfiguredOpenSRSQuoteProvider} from './opensrs-quote-runtime.mjs';
import {readCloudflareQuoteSettings as settings} from './cloudflare-quote-settings.mjs';
const state=(status,code,providerId=null)=>Object.freeze({status,code,providerId,provider:null,accountVerified:false,networkVerified:false,purchaseAllowed:false,checkoutAvailable:false});
// Server-only constructor. No request is made during configuration.
// New configuration names do not imply that live bindings have been installed.
// Extensions and tax inputs must be verified by the operator, not inferred from
// the editorial catalog. Constructor success is not proof of provider access.
export function createCustomerRegistrationQuoteRuntime(env,{deploymentEnvironment,fetchImpl=globalThis.fetch}={}){
 if(!env||typeof env!=='object'||Array.isArray(env)||typeof fetchImpl!=='function')return state('blocked','DOMAIN_QUOTE_CONFIGURATION_UNAVAILABLE');
 const selected=env.DOMAIN_CUSTOMER_REGISTRAR_PROVIDER??'cloudflare';
 if(!['cloudflare','opensrs'].includes(selected))return state('blocked','DOMAIN_QUOTE_PROVIDER_UNSUPPORTED');
 if(deploymentEnvironment!=='production')return state('blocked','DOMAIN_QUOTE_DEPLOYMENT_UNVERIFIED',selected);
 if(selected==='cloudflare'){
  if(env.DOMAIN_CUSTOMER_CLOUDFLARE_QUOTE_ENABLED!=='true')return state('disabled','DOMAIN_CLOUDFLARE_QUOTE_DISABLED',selected);
  try{
   const config=settings(env);
   const provider=createCloudflareRegistrationQuoteProvider(env,{...config,enabled:true,fetchImpl});
   return Object.freeze({status:'configured',providerId:selected,provider,accountVerified:false,networkVerified:false,legacyOpenSRSReceiptCompatible:false,legacyCheckoutAuthorized:false,purchaseAllowed:false,checkoutAvailable:false});
  }catch{return state('blocked','DOMAIN_CLOUDFLARE_QUOTE_CONFIGURATION_UNAVAILABLE',selected);}
 }
 // OpenSRS is opt-in only. Never switch providers after a failed lookup.
 try{
  const result=createConfiguredOpenSRSQuoteProvider(env,{deploymentEnvironment:'production',fetchImpl});
  if(result?.status!=='configured'||result.provider?.id!=='opensrs'||result.provider.quoteEnvironment!=='live'||result.provider.enabled!==true)return state(result?.status==='disabled'?'disabled':'blocked','DOMAIN_OPENSRS_QUOTE_UNAVAILABLE',selected);
  return Object.freeze({status:'configured',providerId:selected,provider:result.provider,accountVerified:false,networkVerified:false,legacyOpenSRSReceiptCompatible:true,legacyCheckoutAuthorized:false,purchaseAllowed:false,checkoutAvailable:false});
 }catch{return state('blocked','DOMAIN_OPENSRS_QUOTE_CONFIGURATION_UNAVAILABLE',selected);}
}
