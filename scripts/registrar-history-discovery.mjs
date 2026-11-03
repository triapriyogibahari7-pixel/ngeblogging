import {readCloudflareQuoteSettings} from '../server/cloudflare-quote-settings.mjs';
const ROOT='https://api.cloudflare.com/client/v4/accounts/095e57b46e7ba7f6b188480d9e4e5fe7/workers/scripts/ngeblogging';
const EXT='CLOUDFLARE_REGISTRAR_QUOTE_EXTENSIONS_JSON',TAX='CLOUDFLARE_REGISTRAR_QUOTES_TAX_INCLUDED';
export function inspectHistoricalRegistrarBindings(bindings){
 if(!Array.isArray(bindings))return null;
 const by=new Map();for(const b of bindings){if(typeof b?.name!=='string'||by.has(b.name))return null;by.set(b.name,b);}
 const ext=by.get(EXT),tax=by.get(TAX);
 const extensions=ext?.type==='plain_text'?ext.text:ext?.type==='json'?ext.json:undefined;
 const taxIncluded=tax?.type==='plain_text'?tax.text:tax?.type==='json'?tax.json:undefined;
 try{return readCloudflareQuoteSettings({[EXT]:extensions,[TAX]:taxIncluded});}catch{return null;}
}
export async function discoverRegistrarHistory(token){
 const deadline=Date.now()+60000;let scanned=0,failed=0,complete=false,next=0;const ids=[],seen=new Set(),candidates=[],configurations=new Set();
 async function get(path){
  const remaining=deadline-Date.now();if(remaining<=0)throw Error('DISCOVERY_DEADLINE');
  const response=await fetch(ROOT+path,{method:'GET',redirect:'error',cache:'no-store',headers:{authorization:'Bearer '+token.trim(),accept:'application/json'},signal:AbortSignal.timeout(Math.min(10000,remaining))});
  if(!response.ok)throw Error('DISCOVERY_HTTP_'+response.status);
  const text=await response.text();if(new TextEncoder().encode(text).length>1048576)throw Error('DISCOVERY_RESPONSE_LIMIT');
  const payload=JSON.parse(text);if(payload?.success!==true)throw Error('DISCOVERY_RESPONSE_INVALID');return payload.result;
 }
 try{
  for(let page=1;page<=3;page++){
   const result=await get('/versions?page='+page+'&per_page=50');const rows=Array.isArray(result)?result:result?.items;
   if(!Array.isArray(rows))throw Error('DISCOVERY_VERSION_LIST_INVALID');
   for(const row of rows){const id=row?.id;if(typeof id==='string'&&/^[a-f0-9-]{36}$/i.test(id)&&!seen.has(id)&&ids.length<150){seen.add(id);ids.push(id);}}
   if(rows.length<50){complete=true;break;}
  }
  async function worker(){
   while(next<ids.length&&Date.now()<deadline){
    const id=ids[next++];
    try{const version=await get('/versions/'+encodeURIComponent(id));scanned++;const config=inspectHistoricalRegistrarBindings(version?.resources?.bindings);
     if(config){configurations.add(JSON.stringify([config.extensions.slice().sort(),config.taxIncluded]));candidates.push({versionId:id,extensionCount:config.extensions.length,formatValid:true});}
    }catch{failed++;}
   }
  }
  await Promise.all(Array.from({length:4},worker));
  return {status:candidates.length?'candidates_found':'source_not_found_in_readable_history',readOnly:true,productionChanged:false,versionsListed:ids.length,versionsScanned:scanned,failedReads:failed,complete:complete&&scanned===ids.length&&failed===0,uniqueConfigurationCount:configurations.size,candidateCount:candidates.length,candidates:candidates.slice(0,10),requiresSourceReview:true,doesNotVerify:['registrar-permission','current-extension-support','current-tax-treatment','production-pricing','payments']};
 }catch(error){return {status:'discovery_unavailable',readOnly:true,productionChanged:false,versionsScanned:scanned,reason:/^DISCOVERY_[A-Z0-9_]+$/.test(error?.message||'')?error.message:'DISCOVERY_REQUEST_FAILED'};}
}
