import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readCloudflareQuoteSettings} from '../server/cloudflare-quote-settings.mjs';
const BRANCH='agent/sync-registrar-runtime-20261103',ACCOUNT='095e57b46e7ba7f6b188480d9e4e5fe7';
const PROVIDER='DOMAIN_CUSTOMER_REGISTRAR_PROVIDER',ENABLED='DOMAIN_CUSTOMER_CLOUDFLARE_QUOTE_ENABLED',TOKEN='CLOUDFLARE_REGISTRAR_API_TOKEN',EXT='CLOUDFLARE_REGISTRAR_QUOTE_EXTENSIONS_JSON',TAX='CLOUDFLARE_REGISTRAR_QUOTES_TAX_INCLUDED';
const NAMES=[PROVIDER,ENABLED,TOKEN,EXT,TAX];
const fail=code=>{throw Object.assign(Error(code),{code});};
export function planRegistrarRuntimeSync(env,bindings){
 if(!env||!Array.isArray(bindings))fail('INVALID_SYNC_INPUT');
 const by=new Map();
 for(const b of bindings){if(typeof b?.name!=='string'||!b.name||by.has(b.name)||typeof b.type!=='string')fail('INVALID_BINDING_INVENTORY');by.set(b.name,b);}
 const read=name=>{
  if(Object.hasOwn(env,name)){if(typeof env[name]!=='string')fail('INVALID_BUILD_INPUT_TYPE');return {value:env[name],source:'build'};}
  const b=by.get(name);
  if(b?.type==='plain_text'&&typeof b.text==='string')return {value:b.text,source:'runtime'};
  if(name===EXT&&b?.type==='json'&&Array.isArray(b.json))return {value:JSON.stringify(b.json),source:'runtime'};
  fail('SOURCE_UNAVAILABLE_'+name);
 };
 const provider=Object.hasOwn(env,PROVIDER)?env[PROVIDER]:'cloudflare';
 const enabled=Object.hasOwn(env,ENABLED)?env[ENABLED]:'true';
 if(provider!=='cloudflare')fail('SYNC_PROVIDER_NOT_CLOUDFLARE');
 if(enabled!=='true')fail('SYNC_QUOTE_NOT_ENABLED');
 const extension=read(EXT),tax=read(TAX);
 let settings;try{settings=readCloudflareQuoteSettings({[EXT]:extension.value,[TAX]:tax.value});}catch{fail('EXTENSION_OR_TAX_INPUT_INVALID');}
 const updates=[{name:PROVIDER,type:'plain_text',text:'cloudflare'},{name:ENABLED,type:'plain_text',text:'true'},{name:EXT,type:'plain_text',text:JSON.stringify(settings.extensions)},{name:TAX,type:'plain_text',text:String(settings.taxIncluded)}];
 const existingToken=by.get(TOKEN);let tokenSource='runtime-preserved';
 if(existingToken?.type==='secret_text'){
  // Preserve the encrypted runtime token without reading its value.
 }else{
  const token=env[TOKEN];
  if(typeof token!=='string'||!token||token.length>8192||/[\u0000-\u0020\u007f]/.test(token))fail('BUILD_REGISTRAR_TOKEN_UNAVAILABLE_OR_INVALID');
  updates.push({name:TOKEN,type:'secret_text',text:token});tokenSource='build';
 }
 const variableTypes=new Set(['plain_text','json','secret_text','secret_key']);
 const variableNames=new Set(bindings.filter(b=>variableTypes.has(b.type)).map(b=>b.name));
 for(const name of NAMES)variableNames.add(name);
 if(variableNames.size>64)fail('SYNC_EXCEEDS_CONSERVATIVE_64_VARIABLE_LIMIT');
 const summary={target:{accountId:ACCOUNT,worker:'ngeblogging',environment:'production'},readyToApply:true,productionChanged:false,variableCountAfter:variableNames.size,planned:NAMES.map(name=>({name,action:name===TOKEN&&tokenSource==='runtime-preserved'?'preserve':'set',source:name===TOKEN?tokenSource:name===EXT?extension.source:name===TAX?tax.source:Object.hasOwn(env,name)?'build':'requested-configuration'})),doesNotVerify:['registrar-permission','extension-support-evidence','tax-treatment-evidence','live-search','pricing-snapshot','payments']};
 return {updates,summary};
}
function selfTest(){
 const env={[EXT]:'["com"]',[TAX]:'false',[TOKEN]:'fixture-token'};
 const first=planRegistrarRuntimeSync(env,[]);assert.equal(first.updates.length,5);assert.equal(first.summary.variableCountAfter,5);
 assert.equal(first.updates.find(b=>b.name===TAX).text,'false');
 const secret={name:TOKEN,type:'secret_text'};Object.defineProperty(secret,'text',{get(){throw Error('SECRET_VALUE_READ');}});
 const preserved=planRegistrarRuntimeSync({[EXT]:'["com"]',[TAX]:'true'},[secret,{name:'UNRELATED',type:'plain_text',text:'kept'}]);
 assert.equal(preserved.updates.some(b=>b.name===TOKEN),false);assert.equal(preserved.summary.variableCountAfter,6);
 assert.equal(JSON.stringify(first.summary).includes('fixture-token'),false);
 assert.throws(()=>planRegistrarRuntimeSync({...env,[EXT]:'com'},[]));
 assert.throws(()=>planRegistrarRuntimeSync({...env,[TAX]:'unknown'},[]));
 assert.throws(()=>planRegistrarRuntimeSync({[EXT]:'["com"]',[TAX]:'false'},[]));
 assert.throws(()=>planRegistrarRuntimeSync({...env,[PROVIDER]:'opensrs'},[]));
 assert.throws(()=>planRegistrarRuntimeSync({...env,[ENABLED]:'false'},[]));
 assert.throws(()=>planRegistrarRuntimeSync(env,[secret,secret]));
 assert.throws(()=>planRegistrarRuntimeSync(env,Array.from({length:64},(_,i)=>({name:'EXISTING_'+i,type:'plain_text',text:'x'}))));
 const fallback=planRegistrarRuntimeSync({[TOKEN]:'fixture-token'},[{name:EXT,type:'plain_text',text:'["com"]'},{name:TAX,type:'plain_text',text:'false'}]);
 assert.equal(fallback.summary.planned.find(b=>b.name===EXT).source,'runtime');
}
export async function runRegistrarRuntimeSyncPreflight(){
 if(process.env.WORKERS_CI!=='1'||process.env.WORKERS_CI_BRANCH!==BRANCH)return null;
 selfTest();
 const expected=process.env.WORKERS_CI_COMMIT_SHA;
 const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
 if(!/^[a-f0-9]{40}$/i.test(expected||'')||expected.toLowerCase()!==commit.toLowerCase())fail('SYNC_COMMIT_MISMATCH');
 let report={schemaVersion:1,commit,branch:BRANCH,selfTestsPassed:true,readyToApply:false,productionChanged:false,mode:'plan-only'};
 try{
  const token=process.env.CLOUDFLARE_API_TOKEN;if(typeof token!=='string'||!token.trim())fail('BUILD_API_TOKEN_UNAVAILABLE');
  const response=await fetch('https://api.cloudflare.com/client/v4/accounts/'+ACCOUNT+'/workers/scripts/ngeblogging/settings',{method:'GET',redirect:'error',headers:{authorization:'Bearer '+token.trim(),accept:'application/json'},signal:AbortSignal.timeout(15000)});
  if(!response.ok)fail('SYNC_INVENTORY_HTTP_'+response.status);
  const text=await response.text();if(new TextEncoder().encode(text).length>1048576)fail('SYNC_INVENTORY_TOO_LARGE');
  let data;try{data=JSON.parse(text);}catch{fail('SYNC_INVENTORY_INVALID_JSON');}
  if(data?.success!==true)fail('SYNC_INVENTORY_REJECTED');
  const {summary}=planRegistrarRuntimeSync(process.env,data.result?.bindings);report={...report,...summary};
 }catch(error){report.reason=/^[A-Z0-9_]{1,160}$/.test(error?.code||'')?error.code:'SYNC_PREFLIGHT_UNAVAILABLE';}
 console.log('[registrar-runtime-sync-plan] '+JSON.stringify(report));
 return {name:'registrar-runtime-sync-plan',apply:'build',generateBundle(){this.emitFile({type:'asset',fileName:'assets/registrar-runtime-sync-plan-'+commit+'.json',source:JSON.stringify(report,null,2)+'\n'});}};
}
