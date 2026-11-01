import {normalizeRegistrarDomain} from './domain-registrar-quote-router.mjs';
import {readOpenSRSLookupReply,readOpenSRSPriceReply} from './opensrs-readonly-reply.mjs';
const issue=(code,status)=>Object.assign(new Error(code),{code,...(status?{status}:{})});
const abort=()=>{throw Object.assign(issue('REGISTRAR_TIMEOUT'),{name:'AbortError'});};
export function createOpenSRSQuoteProvider({transport,environment,currency,taxIncluded,extensions,transferTerms={},enabled=false}={}){
 if(!transport||typeof transport.request!=='function'||!['test','live'].includes(environment)||typeof currency!=='string'||!/^[A-Z]{3}$/.test(currency)||typeof taxIncluded!=='boolean'||typeof enabled!=='boolean'||!Array.isArray(extensions)||!extensions.length||extensions.length>2000||extensions.some(s=>typeof s!=='string'||s.length>189||s.split('.').some(x=>!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(x)))||!transferTerms||Array.isArray(transferTerms)||typeof transferTerms!=='object')throw issue('OPENSRS_QUOTE_CONFIGURATION_UNAVAILABLE');
 const suffixes=Object.freeze([...new Set(extensions)]),terms=Object.freeze(Object.fromEntries(Object.entries(transferTerms)));
 if(Object.entries(terms).some(([suffix,years])=>!suffixes.includes(suffix)||!Number.isInteger(years)||years<0||years>10))throw issue('OPENSRS_QUOTE_CONFIGURATION_UNAVAILABLE');
 const request=transport.request.bind(transport);
 return Object.freeze({id:'opensrs',enabled,quoteEnvironment:environment,extensions:suffixes,
  async lookup({domain,extension,years=1,signal}={}){
   if(!enabled)throw issue('OPENSRS_PROVIDER_DISABLED');
   if(!Number.isInteger(years)||years<1||years>10)throw issue('INVALID_REGISTRATION_PERIOD');
   const normalized=normalizeRegistrarDomain(domain,suffixes);
   if(extension!==undefined&&extension!==normalized.extension)throw issue('INVALID_PROVIDER_QUOTE');
   if(!suffixes.includes(normalized.extension))return {status:'unsupported'};
   async function command(input,parse){
    if(signal?.aborted)abort();let result;
    try{result=await request(input,{signal});}
    catch(error){
     if(signal?.aborted||error?.code==='OPENSRS_REQUEST_ABORTED')abort();
     if(error?.code==='OPENSRS_AUTH_REJECTED')throw issue('OPENSRS_AUTH_REJECTED',401);
     if(error?.code==='OPENSRS_RATE_LIMITED')throw issue('OPENSRS_RATE_LIMITED',429);
     throw issue('OPENSRS_PROVIDER_UNAVAILABLE');
    }
    if(signal?.aborted)abort();
    if(result?.providerId!=='opensrs'||result.environment!==environment||typeof result.responseXml!=='string')throw issue('INVALID_PROVIDER_QUOTE');
    try{return parse(result.responseXml);}catch{throw issue('INVALID_PROVIDER_QUOTE');}
   }
   const lookup=await command({action:'lookup',domain:normalized.domain},readOpenSRSLookupReply);
   const prices=Object.fromEntries(['registration','renewal','transfer'].map(op=>[op,Object.freeze({supported:false})]));
   if(lookup.availability==='unavailable')return Object.freeze({domain:normalized.domain,availability:'unavailable',prices:Object.freeze(prices)});
   if(lookup.premium||lookup.claimStatus==='required')throw issue('OPENSRS_SPECIAL_REGISTRATION_UNSUPPORTED');
   const operations=[['registration','new',years,years],['renewal','renewal',years,years]];
   if(Object.hasOwn(terms,normalized.extension))operations.push(['transfer','transfer',1,terms[normalized.extension]]);
   for(const [operation,regType,period,termYears] of operations){
    const price=await command({action:'get_price',domain:normalized.domain,period,regType},readOpenSRSPriceReply);
    if(price.registryPremium===true)throw issue('OPENSRS_SPECIAL_REGISTRATION_UNSUPPORTED');
    prices[operation]=Object.freeze({supported:true,amount:price.amount,currency,taxIncluded,termYears});
   }
   return Object.freeze({domain:normalized.domain,availability:'available',prices:Object.freeze(prices)});
  }
 });
}
