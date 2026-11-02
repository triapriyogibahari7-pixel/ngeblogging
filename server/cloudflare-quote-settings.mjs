export function readCloudflareQuoteSettings(env){
 const invalid=()=>{throw Error('CLOUDFLARE_QUOTE_CONFIGURATION_UNAVAILABLE');};
 if(!env||typeof env!=='object'||Array.isArray(env))invalid();
 const raw=env.CLOUDFLARE_REGISTRAR_QUOTE_EXTENSIONS_JSON;
 let extensions;
 if(typeof raw==='string'){
  if(!raw.length||new TextEncoder().encode(raw).length>32768)invalid();
  try{extensions=JSON.parse(raw);}catch{invalid();}
 }else if(Array.isArray(raw)){
  extensions=[...raw];
 }else invalid();
 if(!Array.isArray(extensions)||!extensions.length||extensions.length>2000||new Set(extensions).size!==extensions.length||extensions.some(s=>typeof s!=='string'||s.length>189||s.split('.').some(x=>!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(x))))invalid();
 if(new TextEncoder().encode(JSON.stringify(extensions)).length>32768)invalid();
 const tax=env.CLOUDFLARE_REGISTRAR_QUOTES_TAX_INCLUDED;
 if(![true,false,'true','false'].includes(tax))invalid();
 const rawTimeout=env.CLOUDFLARE_REGISTRAR_QUOTE_TIMEOUT_MS;
 let timeout=10000;
 if(rawTimeout!==undefined){
  if(typeof rawTimeout==='number')timeout=rawTimeout;
  else if(typeof rawTimeout==='string'&&/^[1-9]\d{0,4}$/.test(rawTimeout))timeout=Number(rawTimeout);
  else invalid();
  if(!Number.isInteger(timeout)||timeout<1||timeout>30000)invalid();
 }
 return Object.freeze({extensions:Object.freeze([...extensions]),taxIncluded:tax===true||tax==='true',timeoutMs:timeout});
}
