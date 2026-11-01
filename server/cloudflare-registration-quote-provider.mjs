import {normalizeRegistrarDomain} from './domain-registrar-quote-router.mjs';
const ENDPOINT='https://api.cloudflare.com/client/v4/accounts/095e57b46e7ba7f6b188480d9e4e5fe7/registrar/domain-check';
const issue=(code,status)=>Object.assign(new Error(code),{code,...(status?{status}:{})});
const decimal=v=>typeof v==='string'&&/^(?:0|[1-9]\d{0,11})(?:\.\d{1,6})?$/.test(v)&&/[1-9]/.test(v);
const unsupported=new Set(['extension_not_supported_via_api','extension_not_supported','extension_disallows_registration']);
// Advisory quote adapter only. Caller must supply verified extension/tax configuration.
// Construction performs no network request; defaults to disabled.
export function createCloudflareRegistrationQuoteProvider(env,{extensions,taxIncluded,enabled=false,fetchImpl=globalThis.fetch,timeoutMs=10000}={}){
 if(typeof enabled!=='boolean'||typeof taxIncluded!=='boolean'||typeof fetchImpl!=='function'||!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>30000||!Array.isArray(extensions)||!extensions.length||extensions.length>2000||new Set(extensions).size!==extensions.length||extensions.some(s=>typeof s!=='string'||s.length>189||s.split('.').some(x=>!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(x))))throw issue('CLOUDFLARE_QUOTE_CONFIGURATION_UNAVAILABLE');
 const token=env?.CLOUDFLARE_REGISTRAR_API_TOKEN;
 if(enabled&&(typeof token!=='string'||!token.trim()||token.length>8192||/[\u0000-\u0020\u007f]/.test(token)))throw issue('CLOUDFLARE_QUOTE_CONFIGURATION_UNAVAILABLE');
 const suffixes=Object.freeze([...extensions]);
 return Object.freeze({id:'cloudflare',enabled,quoteEnvironment:'live',extensions:suffixes,
  async lookup({domain,extension,years=1,signal}={}){
   if(!enabled)throw issue('CLOUDFLARE_PROVIDER_DISABLED');
   if(years!==1)throw issue('INVALID_REGISTRATION_PERIOD');
   const normalized=normalizeRegistrarDomain(domain,suffixes);
   if(extension!==undefined&&extension!==normalized.extension)throw issue('INVALID_PROVIDER_QUOTE');
   if(!suffixes.includes(normalized.extension))return {status:'unsupported'};
   if(signal?.aborted)throw Object.assign(issue('REGISTRAR_TIMEOUT'),{name:'AbortError'});
   const c=new AbortController();let stop,reader;
   const ended=new Promise((_,reject)=>{stop=()=>reject(Object.assign(issue('REGISTRAR_TIMEOUT'),{name:'AbortError'}));c.signal.addEventListener('abort',stop,{once:true});});
   const cancel=()=>c.abort(),timer=setTimeout(cancel,timeoutMs),wait=p=>Promise.race([p,ended]);
   signal?.addEventListener('abort',cancel,{once:true});
   try{
    const r=await wait(fetchImpl(ENDPOINT,{method:'POST',redirect:'error',cache:'no-store',credentials:'omit',headers:{authorization:'Bearer '+token,'content-type':'application/json',accept:'application/json'},body:JSON.stringify({domains:[normalized.domain]}),signal:c.signal}));
    if(r.status!==200){try{Promise.resolve(r.body?.cancel()).catch(()=>{});}catch{}throw issue('CLOUDFLARE_QUOTE_UNAVAILABLE',[401,403,429].includes(r.status)?r.status:503);}
    reader=r.body?.getReader();if(!reader||r.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')throw issue('INVALID_PROVIDER_QUOTE');
    let size=0;const chunks=[];
    for(;;){const part=await wait(reader.read());if(part.done)break;if(!(part.value instanceof Uint8Array))throw issue('INVALID_PROVIDER_QUOTE');size+=part.value.byteLength;if(size>65536)throw issue('INVALID_PROVIDER_QUOTE');chunks.push(part.value);}
    const bytes=new Uint8Array(size);let at=0;for(const part of chunks){bytes.set(part,at);at+=part.byteLength;}
    let data;try{data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{throw issue('INVALID_PROVIDER_QUOTE');}
    const rows=data?.result?.domains;
    if(data?.success!==true||!Array.isArray(rows)||rows.length!==1||rows[0]?.name!==normalized.domain||typeof rows[0]?.registrable!=='boolean')throw issue('INVALID_PROVIDER_QUOTE');
    const row=rows[0],prices={registration:{supported:false},renewal:{supported:false},transfer:{supported:false}};
    if(!row.registrable){
     if(unsupported.has(row.reason))return {status:'unsupported'};
     if(row.reason!=='domain_unavailable')throw issue('CLOUDFLARE_SPECIAL_REGISTRATION_UNSUPPORTED');
     return Object.freeze({domain:normalized.domain,availability:'unavailable',prices:Object.freeze(prices)});
    }
    if(row.reason!==undefined||row.tier!=='standard')throw issue('CLOUDFLARE_SPECIAL_REGISTRATION_UNSUPPORTED');
    const p=row.pricing;if(p?.currency!=='USD'||!decimal(p.registration_cost)||!decimal(p.renewal_cost))throw issue('INVALID_PROVIDER_QUOTE');
    prices.registration=Object.freeze({supported:true,amount:p.registration_cost,currency:'USD',taxIncluded,termYears:1});
    prices.renewal=Object.freeze({supported:true,amount:p.renewal_cost,currency:'USD',taxIncluded,termYears:1});
    return Object.freeze({domain:normalized.domain,availability:'available',prices:Object.freeze(prices)});
   }catch(error){
    if(c.signal.aborted||signal?.aborted)throw Object.assign(issue('REGISTRAR_TIMEOUT'),{name:'AbortError'});
    if(['INVALID_PROVIDER_QUOTE','CLOUDFLARE_QUOTE_UNAVAILABLE','CLOUDFLARE_SPECIAL_REGISTRATION_UNSUPPORTED'].includes(error?.code))throw issue(error.code,error.status);
    throw issue('CLOUDFLARE_QUOTE_UNAVAILABLE');
   }finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel);c.signal.removeEventListener('abort',stop);c.abort();if(reader){try{Promise.resolve(reader.cancel()).catch(()=>{});}catch{}try{reader.releaseLock();}catch{}}}
  }
 });
}
