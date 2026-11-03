import {readCloudflareQuoteSettings} from '../server/cloudflare-quote-settings.mjs';
const BRANCH='fix/registrar-workers-build-diagnostics-20261103';
const ACCOUNT='095e57b46e7ba7f6b188480d9e4e5fe7';
const REQUIRED=['DOMAIN_CUSTOMER_CLOUDFLARE_QUOTE_ENABLED','CLOUDFLARE_REGISTRAR_API_TOKEN','CLOUDFLARE_REGISTRAR_QUOTE_EXTENSIONS_JSON','CLOUDFLARE_REGISTRAR_QUOTES_TAX_INCLUDED'];
export function inventoryReport(bindings){
  if(!Array.isArray(bindings))throw Error('INVALID_BINDING_INVENTORY');
  const byName=new Map();
  for(const b of bindings){if(!b||typeof b.name!=='string'||byName.has(b.name))throw Error('INVALID_BINDING_INVENTORY');byName.set(b.name,b);}
  const value=n=>{const b=byName.get(n);return b?.type==='plain_text'?b.text:b?.type==='json'?b.json:undefined;};
  const selected=value('DOMAIN_CUSTOMER_REGISTRAR_PROVIDER')??'cloudflare';
  const provider=['cloudflare','opensrs'].includes(selected)?selected:'unsupported';
  const missing=provider==='cloudflare'?REQUIRED.filter(n=>!byName.has(n)):[];
  const flag=value('DOMAIN_CUSTOMER_CLOUDFLARE_QUOTE_ENABLED');
  let settings='not_verified';
  const env=Object.fromEntries(['CLOUDFLARE_REGISTRAR_QUOTE_EXTENSIONS_JSON','CLOUDFLARE_REGISTRAR_QUOTES_TAX_INCLUDED','CLOUDFLARE_REGISTRAR_QUOTE_TIMEOUT_MS'].map(n=>[n,value(n)]));
  if(provider==='cloudflare'&&env.CLOUDFLARE_REGISTRAR_QUOTE_EXTENSIONS_JSON!==undefined&&env.CLOUDFLARE_REGISTRAR_QUOTES_TAX_INCLUDED!==undefined){try{readCloudflareQuoteSettings(env);settings='valid';}catch{settings='invalid';}}
  return {scope:'binding-inventory-only',provider,missingBindings:missing,quoteFlag:flag===undefined?'not_verified':flag==='true'?'enabled':'disabled',cloudflareQuoteSettings:settings,registrarTokenBindingPresent:byName.has('CLOUDFLARE_REGISTRAR_API_TOKEN'),pricingSnapshotBindingPresent:byName.has('DOMAIN_CUSTOMER_REGISTRATION_PRICING_SNAPSHOT'),secretContentsVerified:false,registrarAccessVerified:false,purchaseAllowed:false};
}
export async function runRegistrarBuildInventory({env=process.env,fetchImpl=globalThis.fetch}={}){
  if(env.WORKERS_CI!=='1'||env.WORKERS_CI_BRANCH!==BRANCH)return;
  if(!/^[a-f0-9]{40}$/i.test(env.WORKERS_CI_COMMIT_SHA||''))throw Error('REGISTRAR_DIAGNOSTIC_COMMIT_REQUIRED');
  if(env.CLOUDFLARE_ACCOUNT_ID&&env.CLOUDFLARE_ACCOUNT_ID!==ACCOUNT)throw Error('REGISTRAR_DIAGNOSTIC_ACCOUNT_MISMATCH');
  const unavailable=reason=>console.log('[registrar-build-inventory] '+JSON.stringify({configurationRead:false,reason,diagnosticOnly:true}));
  if(!env.CLOUDFLARE_API_TOKEN){unavailable('BUILD_API_TOKEN_UNAVAILABLE');return;}
  try{
    const response=await fetchImpl(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/workers/scripts/ngeblogging/settings`,{method:'GET',headers:{Authorization:'Bearer '+env.CLOUDFLARE_API_TOKEN},redirect:'error',signal:AbortSignal.timeout(30000)});
    if(!response.ok){unavailable('INVENTORY_HTTP_'+response.status);return;}
    const data=await response.json();
    if(data.success!==true)throw Error('INVALID_INVENTORY');
    console.log('[registrar-build-inventory] '+JSON.stringify({configurationRead:true,diagnosticOnly:true,worker:'ngeblogging',commit:env.WORKERS_CI_COMMIT_SHA.toLowerCase(),...inventoryReport(data.result?.bindings)}));
  }catch{unavailable('INVENTORY_UNAVAILABLE');}
}
