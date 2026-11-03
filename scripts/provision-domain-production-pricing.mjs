import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {parseDomainPricingSnapshot} from '../server/domain-pricing-snapshot.mjs';
const ACCOUNT='095e57b46e7ba7f6b188480d9e4e5fe7',WORKER='ngeblogging',BINDING='DOMAIN_CUSTOMER_REGISTRATION_PRICING_SNAPSHOT',PRIMARY='DOMAIN_PRODUCTION_PRICING_SNAPSHOT_JSON';
const fail=code=>{throw Object.assign(new Error(code),{code});};
export function prepareProductionPricingSecret(text,{now=Date.now()}={}){
 const snapshot=parseDomainPricingSnapshot(text,{now,environment:'production'});
 if(Math.min(Date.parse(snapshot.fx.expiresAt),Date.parse(snapshot.policy.expiresAt))-now<300000)fail('PRICING_VALIDITY_WINDOW_TOO_SHORT');
 const value=JSON.stringify(snapshot);
 if(new TextEncoder().encode(value).length>5120)fail('PRICING_BINDING_TOO_LARGE');
 return {[BINDING]:value};
}
export function inspectPricingBindingCapacity(bindings){
 if(!Array.isArray(bindings))fail('PRICING_RUNTIME_INVENTORY_UNAVAILABLE');
 const seen=new Set();let count=0,reused=false;
 for(const b of bindings){
  if(typeof b?.name!=='string'||seen.has(b.name))fail('INVALID_OR_DUPLICATE_BINDING');
  seen.add(b.name);
  if(b.name===PRIMARY)fail('PRIMARY_PRICING_BINDING_CONFLICT');
  if(b.name===BINDING){if(b.type!=='secret_text')fail('PRICING_BINDING_TYPE_CONFLICT');reused=true;}
  if(['plain_text','json','secret_text'].includes(b.type))count++;
  else if(/secret|text|json/i.test(b.type||''))fail('UNSUPPORTED_VARIABLE_BINDING_TYPE');
 }
 const variablesAfter=count+(reused?0:1);
 if(variablesAfter>64)fail('PRICING_BINDING_CAPACITY_EXCEEDED');
 return {variablesAfter,reused};
}
export async function installProductionPricingSecret(text,{env=process.env,confirmWorker,clock=Date.now,execute=execFileSync,fetchImpl=globalThis.fetch}={}){
 prepareProductionPricingSecret(text,{now:clock()});
 if(confirmWorker!==WORKER)fail('PRODUCTION_WORKER_CONFIRMATION_REQUIRED');
 if(typeof env.CLOUDFLARE_API_TOKEN!=='string'||!env.CLOUDFLARE_API_TOKEN.trim())fail('CLOUDFLARE_API_TOKEN_REQUIRED');
 if(env.CLOUDFLARE_ACCOUNT_ID&&env.CLOUDFLARE_ACCOUNT_ID!==ACCOUNT)fail('ACCOUNT_MISMATCH');
 if(env.WRANGLER_CI_OVERRIDE_NAME&&env.WRANGLER_CI_OVERRIDE_NAME!==WORKER)fail('WORKER_OVERRIDE_MISMATCH');
 let bindings;
 try{
  const response=await fetchImpl('https://api.cloudflare.com/client/v4/accounts/'+ACCOUNT+'/workers/scripts/'+WORKER+'/settings',{method:'GET',headers:{authorization:'Bearer '+env.CLOUDFLARE_API_TOKEN.trim(),accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(15000)});
  if(response.status!==200)fail('PRICING_RUNTIME_INVENTORY_UNAVAILABLE');
  const payload=await response.json();if(payload.success!==true)fail('PRICING_RUNTIME_INVENTORY_UNAVAILABLE');bindings=payload.result?.bindings;
 }catch{fail('PRICING_RUNTIME_INVENTORY_UNAVAILABLE');}
 const capacity=inspectPricingBindingCapacity(bindings);
 const secrets=prepareProductionPricingSecret(text,{now:clock()});
 try{execute('npx',['--no-install','wrangler','secret','bulk','--name',WORKER,'--config',fileURLToPath(new URL('../wrangler.jsonc',import.meta.url))],{input:JSON.stringify(secrets),encoding:'utf8',stdio:['pipe','pipe','pipe'],timeout:60000,maxBuffer:1048576,env:{...env,CLOUDFLARE_ACCOUNT_ID:ACCOUNT,WRANGLER_SEND_METRICS:'false'}});}catch{fail('SNAPSHOT_INSTALL_NOT_CONFIRMED');}
 return {code:'PRICING_SECRET_COMMAND_SUCCEEDED',worker:WORKER,binding:BINDING,variablesAfter:capacity.variablesAfter,bindingReused:capacity.reused,evidenceAudited:false,quoteVerified:false,readyForPayments:false};
}
async function main(){
 const args=process.argv.slice(2),check=args.length===2&&args[0]==='--check',apply=args.length===4&&args[0]==='--apply'&&args[2]==='--confirm-worker'&&args[3]===WORKER;
 if(!check&&!apply)fail('USAGE_CHECK_OR_EXPLICIT_APPLY_REQUIRED');
 const raw=await readFile(args[1]);if(raw.length>16384)fail('PRICING_SNAPSHOT_TOO_LARGE');
 const text=new TextDecoder('utf-8',{fatal:true}).decode(raw);
 prepareProductionPricingSecret(text);
 const report=check?{code:'PRODUCTION_PRICING_STRUCTURALLY_VALID',environment:'production',binding:BINDING,networkCalled:false,evidenceAudited:false,readyForPayments:false}:await installProductionPricingSecret(text,{confirmWorker:args[3]});
 console.log(JSON.stringify(report));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){main().catch(error=>{const code=String(error?.code||error?.message||'');console.error(JSON.stringify({code:/^[A-Z][A-Z0-9_]{0,79}$/.test(code)?code:'PRICING_PROVISIONING_FAILED',quoteVerified:false,readyForPayments:false}));process.exitCode=1;});}
