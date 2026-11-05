import {readFile,writeFile,unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const ACCOUNT='095e57b46e7ba7f6b188480d9e4e5fe7',BRANCH='fix/order-local-release-domain-mobile',SERVICE='ngeblogging-public-auditor';
export function previewAuditorConfig(config){
 if(config?.name!=='ngeblogging')throw Error('AUDIT_APPLICATION_TARGET_MISMATCH');
 const previews=config.previews||{},services=previews.services||[];
 if(!Array.isArray(services))throw Error('AUDIT_BINDING_CONFIG_INVALID');
 const found=services.filter(value=>value.binding==='PUBLIC_AUDITOR');
 if(found.length>1||found.some(value=>value.service!==SERVICE||value.environment||value.entrypoint))throw Error('AUDIT_BINDING_CONFLICT');
 return {...config,previews:{...previews,services:[...services.filter(value=>value.binding!=='PUBLIC_AUDITOR'),{binding:'PUBLIC_AUDITOR',service:SERVICE}]}};
}
export async function provisionPublicAuditorPreview(){
 const env=process.env;
 if(env.WORKERS_CI!=='1'||env.WORKERS_CI_BRANCH!==BRANCH)return;
 if(!/^[a-f0-9]{40}$/i.test(env.WORKERS_CI_COMMIT_SHA||''))throw Error('AUDIT_BUILD_COMMIT_UNVERIFIED');
 if(env.CLOUDFLARE_ACCOUNT_ID&&env.CLOUDFLARE_ACCOUNT_ID!==ACCOUNT)throw Error('AUDIT_ACCOUNT_MISMATCH');
 const token=env.CLOUDFLARE_API_TOKEN;if(!token)throw Error('AUDIT_BUILD_TOKEN_UNAVAILABLE');
 const clean={PATH:env.PATH||'',HOME:env.HOME||'',CI:'true',NO_COLOR:'1'};
 const test=spawnSync(process.execPath,['--test','tests/domain-public-audit.test.mjs','tests/domain-public-audit-worker-fetch.test.mjs','tests/domain-public-audit-transport.test.mjs','tests/public-auditor-preview-config.test.mjs'],{cwd:process.cwd(),env:clean,stdio:'inherit',timeout:180000});
 if(test.error||test.signal||test.status!==0)throw Error('AUDIT_TESTS_FAILED_NO_DEPLOY');
 const source=JSON.parse(await readFile(resolve('wrangler.public-auditor.jsonc'),'utf8'));
 const allowed=new Set(['$schema','name','main','compatibility_date','compatibility_flags','workers_dev','preview_urls','routes']);
 if(Object.keys(source).some(key=>!allowed.has(key))||source.name!==SERVICE||source.main!=='./cloudflare/public-audit-egress-worker.mjs'||source.workers_dev!==false||source.preview_urls!==false||!Array.isArray(source.routes)||source.routes.length||JSON.stringify(source.compatibility_flags)!=='["global_fetch_strictly_public"]')throw Error('AUDIT_PRIVATE_CONFIG_UNVERIFIED');
 const plans=[];
 for(const path of ['wrangler.jsonc','wrangler.production.jsonc'])plans.push({path,config:previewAuditorConfig(JSON.parse(await readFile(resolve(path),'utf8')))});
 const files=await Promise.all(['cloudflare/public-audit-egress-worker.mjs','server/domain-public-audit-transport.mjs'].map(path=>readFile(resolve(path),'utf8')));
 const digest=createHash('sha256').update(JSON.stringify([source,...files])).digest('hex');
 const endpoint='https://api.cloudflare.com/client/v4/accounts/'+ACCOUNT+'/workers/scripts/'+SERVICE+'/settings';
 async function inventory(){const response=await fetch(endpoint,{method:'GET',redirect:'error',headers:{authorization:'Bearer '+token},signal:AbortSignal.timeout(30000)});if(response.status===404){await response.body?.cancel();return null;}if(!response.ok){await response.body?.cancel();throw Error('AUDIT_INVENTORY_HTTP_'+response.status);}const value=await response.json();if(value.success!==true)throw Error('AUDIT_INVENTORY_REJECTED');return value.result;}
 function verified(settings){return settings?.compatibility_flags?.includes('global_fetch_strictly_public')&&settings.bindings?.some(value=>value.name==='PUBLIC_AUDIT_BUILD_ID'&&value.type==='plain_text'&&value.text===digest);}
 let settings=await inventory(),created=false;
 if(settings&&!verified(settings))throw Error('AUDIT_EXISTING_SERVICE_REVIEW_REQUIRED');
 if(!settings){
  const temporary=resolve('.wrangler-public-auditor-build-'+process.pid+'.json');let written=false;
  try{await writeFile(temporary,JSON.stringify({...source,account_id:ACCOUNT,vars:{PUBLIC_AUDIT_BUILD_ID:digest}}),{flag:'wx',mode:0o600});written=true;const deployed=spawnSync(process.execPath,[resolve('node_modules/wrangler/bin/wrangler.js'),'deploy','--config',temporary,'--name',SERVICE],{cwd:process.cwd(),env:{...clean,CLOUDFLARE_ACCOUNT_ID:ACCOUNT,CLOUDFLARE_API_TOKEN:token},stdio:'pipe',timeout:180000});if(deployed.error||deployed.signal||deployed.status!==0)throw Error('AUDIT_DEPLOY_COMMAND_FAILED');created=true;}finally{if(written)await unlink(temporary).catch(()=>{});}
  settings=await inventory();if(!verified(settings))throw Error('AUDIT_DEPLOY_METADATA_UNVERIFIED');
 }
 for(const plan of plans)await writeFile(resolve(plan.path),JSON.stringify(plan.config,null,2)+'\n');
 const report={schema:1,commit:env.WORKERS_CI_COMMIT_SHA,service:SERVICE,sourceDigest:digest,auditorCreated:created,auditorMetadataVerified:true,previewBindingConfigurationPrepared:true,previewBindingLiveVerified:false,applicationProductionChanged:false,publicSiteAuditPerformed:false};
 await writeFile(resolve('dist/public-auditor-activation.json'),JSON.stringify(report,null,2)+'\n');
 console.log('[public-auditor] '+JSON.stringify(report));
}
