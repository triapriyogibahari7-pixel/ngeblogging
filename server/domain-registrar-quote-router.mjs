const OPS=Object.freeze(['registration','renewal','transfer']);
export const INDONESIAN_SUFFIXES=Object.freeze(['id','my.id','web.id','biz.id','co.id','or.id','ac.id','sch.id','ponpes.id','net.id','go.id','mil.id','desa.id']);
export const COMMON_COMPOUND_SUFFIXES=Object.freeze(['co.uk','org.uk','me.uk']);
const issue=code=>Object.assign(new Error(code),{code});
function suffix(value){
 if(typeof value!=='string')throw issue('INVALID_EXTENSION_CONFIG');
 const s=value.replace(/^\./,'').toLowerCase();
 if(!s||s.length>189||s.split('.').some(x=>!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(x)))throw issue('INVALID_EXTENSION_CONFIG');
 return s;
}
export function normalizeRegistrarDomain(value,knownSuffixes=[]){
 if(typeof value!=='string')throw issue('INVALID_DOMAIN');
 const raw=value.trim().replace(/\.$/,'');
 if(!raw||/[\s\u0000-\u001f\u007f/\\:@?#%]/u.test(raw))throw issue('INVALID_DOMAIN');
 let name;try{name=new URL('https://'+raw).hostname.toLowerCase();}catch{throw issue('INVALID_DOMAIN');}
 const labels=name.split('.');
 if(name.length>253||labels.length<2||/^\d+(?:\.\d+){3}$/.test(name)||labels.some(x=>!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(x)))throw issue('INVALID_DOMAIN');
 const catalog=[...new Set([...INDONESIAN_SUFFIXES,...COMMON_COMPOUND_SUFFIXES,'com','net','org',...knownSuffixes].map(suffix))].sort((a,b)=>b.length-a.length);
 const extension=catalog.find(s=>name===s||name.endsWith('.'+s))||labels.at(-1);
 const prefix=name===extension?'':name.slice(0,-extension.length-1);
 if(!prefix)throw issue('DOMAIN_NAME_REQUIRED');
 if(prefix.includes('.'))throw issue('SUBDOMAIN_NOT_REGISTRABLE');
 return Object.freeze({domain:name,name:prefix,extension});
}
function price(value,operation,years){
 if(value&&value.supported===false)return Object.freeze({supported:false});
 if(!value||typeof value.amount!=='string'||!/^(?:0|[1-9]\d{0,11})(?:\.\d{1,6})?$/.test(value.amount)
  ||typeof value.currency!=='string'||!/^[A-Z]{3}$/.test(value.currency)||typeof value.taxIncluded!=='boolean'
  ||!Number.isInteger(value.termYears)||value.termYears<0||value.termYears>10
  ||(operation!=='transfer'&&value.termYears!==years))throw issue('INVALID_PROVIDER_QUOTE');
 return Object.freeze({supported:true,amount:value.amount,currency:value.currency,termYears:value.termYears,taxIncluded:value.taxIncluded});
}
function failure(error){
 if(error?.code==='REGISTRAR_TIMEOUT'||error?.name==='AbortError')return 'timeout';
 if(error?.status===401||error?.status===403)return 'authentication_error';
 if(error?.status===429)return 'rate_limited';
 if(error?.code==='INVALID_PROVIDER_QUOTE')return 'invalid_response';
 return 'provider_error';
}
export function createRegistrarQuoteRouter({providers=[],timeoutMs=5000,maxAgeMs=60000,clock=Date.now,makeId=()=>globalThis.crypto.randomUUID()}={}){
 if(!Array.isArray(providers)||providers.length>8||!Number.isFinite(timeoutMs)||timeoutMs<=0||timeoutMs>30000
  ||!Number.isFinite(maxAgeMs)||maxAgeMs<1000||maxAgeMs>300000||typeof clock!=='function'||typeof makeId!=='function')throw issue('INVALID_ROUTER_CONFIG');
 const ids=new Set();
 const configured=providers.map(p=>{
  if(!p||typeof p.id!=='string'||!/^[a-z0-9][a-z0-9-]{0,39}$/.test(p.id)||ids.has(p.id)||!Array.isArray(p.extensions)
   ||(p.enabled!==undefined&&typeof p.enabled!=='boolean')||(p.enabled===true&&typeof p.lookup!=='function'))throw issue('INVALID_PROVIDER_CONFIG');
  ids.add(p.id);return {id:p.id,enabled:p.enabled===true,extensions:[...new Set(p.extensions.map(suffix))],lookup:p.lookup};
 });
 const known=configured.flatMap(p=>p.extensions);
 return Object.freeze({
  async lookup(input){
   const years=input?.years??1;
   if(!Number.isInteger(years)||years<1||years>10)throw issue('INVALID_REGISTRATION_PERIOD');
   const domain=normalizeRegistrarDomain(input?.domain,known),diagnostics=[];
   const empty=status=>({status,domain:domain.domain,extension:domain.extension,offer:null,diagnostics,lookupOnly:true,purchaseAllowed:false});
   if(!configured.some(p=>p.enabled))return empty('provider_unconfigured');
   const candidates=configured.filter(p=>p.extensions.includes(domain.extension));
   if(!candidates.length)return empty('unsupported_extension');
   const active=candidates.filter(p=>p.enabled);
   if(!active.length)return empty('provider_unconfigured');
   let observedAvailability=null;
   for(const p of active){
    const controller=new AbortController();let timer;
    try{
     const response=await Promise.race([
      Promise.resolve().then(()=>p.lookup({domain:domain.domain,extension:domain.extension,years,signal:controller.signal})),
      new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(issue('REGISTRAR_TIMEOUT'));},timeoutMs);})
     ]);
     if(response?.status==='unsupported'){diagnostics.push({providerId:p.id,status:'unsupported_extension'});continue;}
     if(response?.domain!==domain.domain||!['available','unavailable'].includes(response?.availability))throw issue('INVALID_PROVIDER_QUOTE');
     if(observedAvailability!==null&&observedAvailability!==response.availability){diagnostics.push({providerId:p.id,status:'availability_conflict'});return empty('availability_conflict');}
     observedAvailability=response.availability;
     const prices=Object.fromEntries(OPS.map(op=>[op,price(response.prices?.[op],op,years)]));
     const offered=OPS.map(op=>prices[op]).filter(x=>x.supported);
     if(!offered.length||new Set(offered.map(x=>x.currency)).size!==1)throw issue('INVALID_PROVIDER_QUOTE');
     const now=clock(),quoteId=makeId();
     if(!Number.isFinite(now)||typeof quoteId!=='string'||!/^[A-Za-z0-9_-]{8,100}$/.test(quoteId))throw issue('INVALID_ROUTER_CONFIG');
     return {status:'quoted',domain:domain.domain,extension:domain.extension,diagnostics,lookupOnly:true,purchaseAllowed:false,
      offer:Object.freeze({quoteId,providerId:p.id,domain:domain.domain,years,availability:response.availability,prices:Object.freeze(prices),
       checkedAt:new Date(now).toISOString(),expiresAt:new Date(now+maxAgeMs).toISOString(),indicative:true,mustRecheckBeforePurchase:true,transferEligibility:'not_checked',registrantEligibility:'not_checked'})};
    }catch(error){
     if(error?.code==='INVALID_ROUTER_CONFIG')throw error;
     diagnostics.push({providerId:p.id,status:failure(error)});
    }finally{clearTimeout(timer);}
   }
   return empty(diagnostics.length&&diagnostics.every(x=>x.status==='unsupported_extension')?'unsupported_extension':'provider_unavailable');
  }
 });
}
