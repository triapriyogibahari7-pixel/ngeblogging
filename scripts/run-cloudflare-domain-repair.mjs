import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {repairTriapriyogi} from './repair-triapriyogi-worker-domain.mjs';
export const REPAIR_BRANCH='fix/connected-domain-audit-network-20261103';
export async function runCloudflareDomainRepair({env=process.env,repair=repairTriapriyogi,loadManifest=async()=>JSON.parse(await readFile(new URL('../ops/repair-triapriyogi-worker-domain-20261103.json',import.meta.url),'utf8'))}={}){
 if(env.WORKERS_CI!=='1')return {mode:'skipped',reason:'NOT_CLOUDFLARE_BUILDS'};
 if(env.WORKERS_CI_BRANCH!==REPAIR_BRANCH)return {mode:'skipped',reason:'OTHER_BRANCH'};
 if(!['deploy','versions upload','preview'].includes(env.WRANGLER_COMMAND))return {mode:'skipped',reason:'NOT_A_DEPLOY_BUILD'};
 if(!/^[a-f0-9]{40}$/i.test(env.WORKERS_CI_COMMIT_SHA||''))throw Error('BUILD_COMMIT_UNVERIFIED');
 const token=String(env.CLOUDFLARE_DOMAIN_API_TOKEN||env.CLOUDFLARE_API_TOKEN||'').trim();
 if(!token)throw Error('BUILD_DOMAIN_API_TOKEN_REQUIRED');
 const manifest=await loadManifest();
 const report=await repair({token,manifest,apply:true});
 return {runner:'cloudflare-workers-builds',commit:env.WORKERS_CI_COMMIT_SHA,...report};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{console.log(JSON.stringify(await runCloudflareDomainRepair(),null,2));}
 catch(error){const message=String(error?.message||'');console.error(/^(?:BUILD_COMMIT_UNVERIFIED|BUILD_DOMAIN_API_TOKEN_REQUIRED|REPAIR_TARGET_MISMATCH|CLOUDFLARE_TOKEN_REQUIRED|ZONE_IDENTITY_MISMATCH|ZONE_NOT_ACTIVE|WORKER_DOMAIN_RESPONSE_UNVERIFIED|WORKER_DOMAIN_AMBIGUOUS|CLOUDFLARE_REQUEST_REJECTED_HTTP_\d{3}|(?:WORKER_DOMAIN_CONFLICT|WORKER_DOMAIN_ATTACH_UNVERIFIED|MANAGED_DNS_RECORD_NOT_CONFIRMED)_(?:www\.)?triapriyogi\.com)$/.test(message)?message:'CLOUDFLARE_BUILD_DOMAIN_REPAIR_FAILED');process.exitCode=1;}
}
