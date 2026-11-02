import {createCustomerRegistrationQuoteRuntime} from './domain-customer-quote-runtime.mjs';
import {parseDomainPricingSnapshot} from './domain-pricing-snapshot.mjs';
// Configuration validation only. Never authorizes a lookup, payment or registration.
export function inspectDomainSearchConfiguration(env,{deploymentEnvironment,now=Date.now()}={}){
 if(!env||typeof env!=='object'||Array.isArray(env)||!Number.isSafeInteger(now)||Math.abs(now)>8640000000000000)throw new TypeError('INVALID_PREFLIGHT_INPUT');
 const blockers=[];
 const add=code=>{if(!blockers.includes(code))blockers.push(code);};
 if(deploymentEnvironment!=='production')add('DOMAIN_QUOTE_DEPLOYMENT_UNVERIFIED');
 if(env.DOMAIN_CUSTOMER_SEARCH_ENABLED!=='true')add('DOMAIN_SEARCH_DISABLED');
 const limit=env.DOMAIN_CUSTOMER_SEARCH_HTTP_BUDGET;
 if(typeof limit!=='string'||!/^[1-9]\d{0,2}$/.test(limit)||Number(limit)>256)add('DOMAIN_SEARCH_CONFIGURATION_UNAVAILABLE');
 if(typeof env.SUPABASE_URL!=='string'||env.SUPABASE_URL.replace(/\/$/,'')!=='https://polvmlrhqoiflumibfqs.supabase.co'||typeof env.SUPABASE_PUBLISHABLE_KEY!=='string'||!env.SUPABASE_PUBLISHABLE_KEY||env.SUPABASE_PUBLISHABLE_KEY.length>8192)add('AUTH_CONFIGURATION_UNAVAILABLE');
 const runtime=createCustomerRegistrationQuoteRuntime(env,{deploymentEnvironment,fetchImpl:()=>{throw Error('PREFLIGHT_NETWORK_FORBIDDEN');}});
 if(runtime.status!=='configured')add(runtime.code||'DOMAIN_QUOTE_CONFIGURATION_UNAVAILABLE');
 try{parseDomainPricingSnapshot(env.DOMAIN_CUSTOMER_REGISTRATION_PRICING_SNAPSHOT,{now,environment:'production'});}catch(error){add(error?.code==='FX_SNAPSHOT_EXPIRED'?'FX_SNAPSHOT_EXPIRED':error?.code==='COST_POLICY_EXPIRED'?'COST_POLICY_EXPIRED':'DOMAIN_PRICING_CONFIGURATION_UNAVAILABLE');}
 return Object.freeze({configurationOnly:true,configurationReady:blockers.length===0,blockers:Object.freeze(blockers),networkVerified:false,accountVerified:false,lookupAuthorized:false,purchaseAllowed:false,checkoutAvailable:false,registrationStarted:false});
}
