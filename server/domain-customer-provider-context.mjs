// Nonsecret account identity for review binding, never a provider credential.
export function resolveCustomerRegistrarContext(env){
 const providerId=env?.DOMAIN_CUSTOMER_REGISTRAR_PROVIDER??'cloudflare';
 if(providerId!=='cloudflare'&&providerId!=='opensrs')throw Error('DOMAIN_REVIEW_CONFIGURATION_UNAVAILABLE');
 const registrarAccountRef=providerId==='cloudflare'?'cloudflare:095e57b46e7ba7f6b188480d9e4e5fe7':env?.OPENSRS_REGISTRAR_ACCOUNT_REF;
 if(typeof registrarAccountRef!=='string'||!/^[A-Za-z0-9_.:-]{1,120}$/.test(registrarAccountRef))throw Error('DOMAIN_REVIEW_CONFIGURATION_UNAVAILABLE');
 return Object.freeze({providerId,registrarAccountRef});
}
