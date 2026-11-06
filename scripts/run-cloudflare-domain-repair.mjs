import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {repairTriapriyogi,safeRepairError} from './repair-triapriyogi-worker-domain.mjs';
export const REPAIR_BRANCH='fix/connected-domain-audit-network-20261103';
export const ORDER_PATCH_BRANCH='fix/order-local-release-domain-mobile';
export const ORDER_PATCH_TESTS=['tests/cloudflare-order-patch-runner.test.mjs','tests/domain-order-actions.test.mjs','tests/domain-recovery-entry.test.mjs','tests/domain-scoped-direct-checkout.test.mjs'];
export async function prepareMainDomainProvider({env=process.env,run=spawnSync}={}){
 if(env.WORKERS_CI!=='1'||env.WORKERS_CI_BRANCH!=='main')return {mode:'skipped',reason:'NOT_MAIN_WORKERS_BUILD'};
 if(!/^[a-f0-9]{40}$/i.test(env.WORKERS_CI_COMMIT_SHA||''))throw Error('BUILD_COMMIT_UNVERIFIED');
 if(env.WRANGLER_CI_OVERRIDE_NAME&&env.WRANGLER_CI_OVERRIDE_NAME!=='ngeblogging')throw Error('WORKER_OVERRIDE_MISMATCH');
 if(env.CLOUDFLARE_ACCOUNT_ID&&env.CLOUDFLARE_ACCOUNT_ID!=='095e57b46e7ba7f6b188480d9e4e5fe7')throw Error('ACCOUNT_ENV_MISMATCH');
 const configUrl=new URL('../wrangler.jsonc',import.meta.url);
 const current=JSON.parse(await readFile(configUrl,'utf8'));
 const production=JSON.parse(await readFile(new URL('../wrangler.production.jsonc',import.meta.url),'utf8'));
 if(current.name!=='ngeblogging'||production.name!=='ngeblogging')throw Error('DOMAIN_BUILD_TARGET_MISMATCH');
 if(production.main!=='./cloudflare/domain-recovery-worker-v2.mjs')throw Error('DOMAIN_PRODUCTION_ENTRY_UNEXPECTED');
 const keys=['CUSTOM_DOMAIN_PROVIDER','CLOUDFLARE_SAAS_ENABLED','CLOUDFLARE_CUSTOM_HOSTNAMES_READY','CLOUDFLARE_CUSTOM_HOSTNAME_TARGET','CLOUDFLARE_CUSTOM_ORIGIN','CLOUDFLARE_WORKER_SERVICE','CUSTOM_DOMAIN_DNS_V67'];
 for(const key of keys)if(typeof production.vars?.[key]!=='string')throw Error('DOMAIN_PRODUCTION_CONFIG_INCOMPLETE');
 const provider=production.vars.CUSTOM_DOMAIN_PROVIDER;
 if(!['cloudflare-full-zone','cloudflare-custom-hostnames'].includes(provider))throw Error('DOMAIN_PROVIDER_UNSUPPORTED');
 const saas=provider==='cloudflare-custom-hostnames';
 if(production.vars.CLOUDFLARE_SAAS_ENABLED!==(saas?'true':'false')||production.vars.CLOUDFLARE_CUSTOM_HOSTNAMES_READY!==(saas?'true':'false'))throw Error('DOMAIN_PROVIDER_FLAGS_INCONSISTENT');
 if(saas){
  if(production.vars.CLOUDFLARE_CUSTOM_HOSTNAME_TARGET!=='connect.ngeblogging.com'||production.vars.CLOUDFLARE_CUSTOM_ORIGIN!=='connect.ngeblogging.com')throw Error('SAAS_ORIGIN_CONFIG_MISMATCH');
  const checked=run(process.execPath,[new URL('./saas-build-preflight-stage5.mjs',import.meta.url).pathname],{cwd:new URL('../',import.meta.url),env,stdio:'inherit',shell:false,timeout:60000});
  if(checked.error||checked.signal||checked.status!==0)throw Error('SAAS_PREFLIGHT_FAILED_NO_DEPLOY');
 }
 const vars={...current.vars};
 for(const key of keys)vars[key]=production.vars[key];
 await writeFile(configUrl,JSON.stringify({...current,main:production.main,vars},null,2)+'\n',{mode:0o600});
 return {mode:'prepared',provider,entrypoint:production.main,saasPreflight:saas?'passed':'not-required-full-zone',configurationOnly:true,migrationsPerformed:false};
}
async function saveOrderPatchReport(report){
 const text=JSON.stringify(report,null,2)+'\n';
 await mkdir(new URL('../public/',import.meta.url),{recursive:true});
 await writeFile(new URL('../public/order-local-patch-checks.json',import.meta.url),text);
 const dist=new URL('../dist/',import.meta.url);
 try{await access(dist);}catch{return;}
 await writeFile(new URL('order-local-patch-checks.json',dist),text);
}
export async function runCloudflareOrderPatchChecks({env=process.env,run=spawnSync,save=saveOrderPatchReport}={}){
 if(env.WORKERS_CI!=='1'||env.WORKERS_CI_BRANCH!==ORDER_PATCH_BRANCH)return {mode:'skipped',reason:'NOT_ORDER_PATCH_BUILD'};
 const commit=env.WORKERS_CI_COMMIT_SHA||'';
 if(!/^[a-f0-9]{40}$/i.test(commit))throw Error('BUILD_COMMIT_UNVERIFIED');
 const result=run(process.execPath,['--test',...ORDER_PATCH_TESTS],{cwd:new URL('../',import.meta.url),stdio:'inherit',timeout:300000});
 const passed=result?.status===0&&!result.error&&!result.signal;
 const report={schema:1,runner:'cloudflare-workers-builds',branch:ORDER_PATCH_BRANCH,commit,tests:ORDER_PATCH_TESTS,passed,scope:'mocked-contract-tests-only',browserChecksPerformed:false,productionVerified:false};
 await save(report);
 if(!passed)throw Error('ORDER_PATCH_TESTS_FAILED');
 return {mode:'verified',...report};
}
export async function runCloudflareDomainRepair({env=process.env,repair=repairTriapriyogi,loadManifest=async()=>JSON.parse(await readFile(new URL('../ops/repair-triapriyogi-worker-domain-20261103.json',import.meta.url),'utf8'))}={}){
 if(env.WORKERS_CI!=='1')return {mode:'skipped',reason:'NOT_CLOUDFLARE_BUILDS'};
 if(env.WORKERS_CI_BRANCH!==REPAIR_BRANCH)return {mode:'skipped',reason:'OTHER_BRANCH'};
 if(!['deploy','versions upload','preview'].includes(env.WRANGLER_COMMAND))return {mode:'skipped',reason:'NOT_A_DEPLOY_BUILD'};
 if(!/^[a-f0-9]{40}$/i.test(env.WORKERS_CI_COMMIT_SHA||''))throw Error('BUILD_COMMIT_UNVERIFIED');
 const token=String(env.CLOUDFLARE_DOMAIN_API_TOKEN||env.CLOUDFLARE_API_TOKEN||'').trim();
 if(!token)throw Error('BUILD_DOMAIN_API_TOKEN_REQUIRED');
 const manifest=await loadManifest();
 const report=await repair({token,manifest,apply:true,onProgress:event=>console.log(event.stage+':'+event.hostname)});
 return {runner:'cloudflare-workers-builds',commit:env.WORKERS_CI_COMMIT_SHA,...report};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{const main=await prepareMainDomainProvider();if(main.mode!=='skipped')console.log(JSON.stringify(main));const checks=await runCloudflareOrderPatchChecks();console.log(JSON.stringify(checks.mode==='skipped'?await runCloudflareDomainRepair():checks,null,2));}
 catch(error){console.error(safeRepairError(error));process.exitCode=1;}
}
