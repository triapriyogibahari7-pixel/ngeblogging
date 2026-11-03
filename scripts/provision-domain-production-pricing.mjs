import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {parseDomainPricingSnapshot} from '../server/domain-pricing-snapshot.mjs';
const ACCOUNT='095e57b46e7ba7f6b188480d9e4e5fe7',WORKER='ngeblogging',BINDING='DOMAIN_PRODUCTION_PRICING_SNAPSHOT_JSON';
export function prepareProductionPricingSecret(text,{now=Date.now()}={}){const snapshot=parseDomainPricingSnapshot(text,{now,environment:'production'});return {[BINDING]:JSON.stringify(snapshot)};}
export function installProductionPricingSecret(text,{env=process.env,confirmWorker,now=Date.now(),execute=execFileSync}={}){
 const secrets=prepareProductionPricingSecret(text,{now});
 if(confirmWorker!==WORKER)throw Error('PRODUCTION_WORKER_CONFIRMATION_REQUIRED');
 if(typeof env.CLOUDFLARE_API_TOKEN!=='string'||!env.CLOUDFLARE_API_TOKEN.trim())throw Error('CLOUDFLARE_API_TOKEN_REQUIRED');
 if(env.CLOUDFLARE_ACCOUNT_ID&&env.CLOUDFLARE_ACCOUNT_ID!==ACCOUNT)throw Error('ACCOUNT_MISMATCH');
 if(env.WRANGLER_CI_OVERRIDE_NAME&&env.WRANGLER_CI_OVERRIDE_NAME!==WORKER)throw Error('WORKER_OVERRIDE_MISMATCH');
 try{execute('npx',['--no-install','wrangler','secret','bulk','--name',WORKER,'--config',fileURLToPath(new URL('../wrangler.jsonc',import.meta.url))],{input:JSON.stringify(secrets),encoding:'utf8',stdio:['pipe','pipe','pipe'],timeout:60000,maxBuffer:1048576,env:{...env,CLOUDFLARE_ACCOUNT_ID:ACCOUNT,WRANGLER_SEND_METRICS:'false'}});}catch{throw Error('SNAPSHOT_INSTALL_NOT_CONFIRMED');}
 return {code:'PRICING_SECRET_COMMAND_SUCCEEDED',worker:WORKER,binding:BINDING,evidenceAudited:false,quoteVerified:false,readyForPayments:false};
}
async function main(){
 const args=process.argv.slice(2),check=args.length===2&&args[0]==='--check',apply=args.length===4&&args[0]==='--apply'&&args[2]==='--confirm-worker'&&args[3]===WORKER;
 if(!check&&!apply)throw Error('USAGE_CHECK_OR_EXPLICIT_APPLY_REQUIRED');
 const raw=await readFile(args[1]);if(raw.length>16384)throw Error('PRICING_SNAPSHOT_TOO_LARGE');
 const text=new TextDecoder('utf-8',{fatal:true}).decode(raw);
 prepareProductionPricingSecret(text);
 const report=check?{code:'PRODUCTION_PRICING_STRUCTURALLY_VALID',environment:'production',networkCalled:false,evidenceAudited:false,readyForPayments:false}:installProductionPricingSecret(text,{confirmWorker:args[3]});
 console.log(JSON.stringify(report));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){main().catch(error=>{const code=String(error?.code||error?.message||'');console.error(JSON.stringify({code:/^[A-Z][A-Z0-9_]{0,79}$/.test(code)?code:'PRICING_PROVISIONING_FAILED',quoteVerified:false,readyForPayments:false}));process.exitCode=1;});}
