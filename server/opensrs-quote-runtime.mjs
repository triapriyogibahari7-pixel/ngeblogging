import {createOpenSRSReadOnlyTransport} from './opensrs-readonly-transport.mjs';
import {createOpenSRSQuoteProvider} from './opensrs-quote-provider.mjs';
const unavailable=(code='OPENSRS_QUOTE_CONFIGURATION_UNAVAILABLE')=>Object.freeze({status:'blocked',code,provider:null,purchaseAllowed:false});
const disabled=code=>Object.freeze({status:'disabled',code,provider:null,purchaseAllowed:false});
const validSuffix=s=>typeof s==='string'&&s.length<=189&&s.split('.').every(x=>/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(x));
function jsonSetting(value){if(typeof value!=='string'||!value.length||value.length>32768)throw Error();return JSON.parse(value);}
export function readOpenSRSQuoteSettings(env,{deploymentEnvironment}={}){
 if(env?.OPENSRS_QUOTE_ENABLED!=='true')return disabled('OPENSRS_QUOTE_DISABLED');
 if(!['production','isolated-test'].includes(deploymentEnvironment))return unavailable('OPENSRS_DEPLOYMENT_UNVERIFIED');
 if(deploymentEnvironment==='production'&&env.OPENSRS_QUOTE_PRODUCTION_ENABLED!=='true')return disabled('OPENSRS_PRODUCTION_QUOTE_DISABLED');
 const environment=env.OPENSRS_ENV;
 if(environment!==(deploymentEnvironment==='production'?'live':'test'))return unavailable('OPENSRS_ENVIRONMENT_MISMATCH');
 try{
  const currency=env.OPENSRS_ACCOUNT_CURRENCY,tax=env.OPENSRS_QUOTES_TAX_INCLUDED;
  if(typeof currency!=='string'||!/^[A-Z]{3}$/.test(currency)||!['true','false'].includes(tax))return unavailable();
  const extensions=jsonSetting(env.OPENSRS_QUOTE_EXTENSIONS_JSON);
  if(!Array.isArray(extensions)||!extensions.length||extensions.length>2000||extensions.some(s=>!validSuffix(s))||new Set(extensions).size!==extensions.length)return unavailable();
  const transferTerms=env.OPENSRS_TRANSFER_TERMS_JSON===undefined?{}:jsonSetting(env.OPENSRS_TRANSFER_TERMS_JSON);
  if(!transferTerms||typeof transferTerms!=='object'||Array.isArray(transferTerms)||Object.entries(transferTerms).some(([suffix,years])=>!extensions.includes(suffix)||!Number.isInteger(years)||years<0||years>10))return unavailable();
  const rawTimeout=env.OPENSRS_QUOTE_TIMEOUT_MS;
  if(rawTimeout!==undefined&&(typeof rawTimeout!=='string'||!/^[1-9]\d{0,4}$/.test(rawTimeout)||Number(rawTimeout)>30000))return unavailable();
  const settings=Object.freeze({environment,currency,taxIncluded:tax==='true',extensions:Object.freeze([...extensions]),transferTerms:Object.freeze({...transferTerms}),timeoutMs:rawTimeout===undefined?10000:Number(rawTimeout)});
  return Object.freeze({status:'configured',settings,purchaseAllowed:false});
 }catch{return unavailable();}
}
// 'configured' describes local settings only, never successful account authentication.
export function createConfiguredOpenSRSQuoteProvider(env,{deploymentEnvironment,fetchImpl=globalThis.fetch}={}){
 const state=readOpenSRSQuoteSettings(env,{deploymentEnvironment});
 if(state.status!=='configured')return state;
 try{
  const settings=state.settings;
  const transport=createOpenSRSReadOnlyTransport({environment:settings.environment,username:env.OPENSRS_RESELLER_USERNAME,apiKey:env.OPENSRS_API_KEY,timeoutMs:settings.timeoutMs,fetchImpl});
  const provider=createOpenSRSQuoteProvider({transport,environment:settings.environment,currency:settings.currency,taxIncluded:settings.taxIncluded,extensions:settings.extensions,transferTerms:settings.transferTerms,enabled:true});
  return Object.freeze({status:'configured',provider,accountVerified:false,networkVerified:false,purchaseAllowed:false});
 }catch{return unavailable();}
}
