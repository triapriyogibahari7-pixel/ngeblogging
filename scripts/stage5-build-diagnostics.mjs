// Preview diagnostics only: publishing a shell must never mask acceptance failure.
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const BRANCH='feature/domain-stages5-10-integration-20261030';
const JSON_PLUGIN='vite-plugin-stage5-native-report-v1';
function scrub(value){
  if(Array.isArray(value))return value.map(scrub);
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,v])=>[key,/secret|password|authorization|api.?key|access.?token/i.test(key)?'[REDACTED]':scrub(v)]));
  if(typeof value==='string')return value.replace(/Bearer\s+[^\s"']+/gi,'Bearer [REDACTED]').replace(/(?:sb_secret_|ghp_|github_pat_)[A-Za-z0-9_]+/g,'[REDACTED]').slice(0,6000);
  return value;
}
export async function runStage5BuildDiagnostics(task,{env=process.env,cwd=process.cwd()}={}){
  if(env.WORKERS_CI!=='1'||env.WORKERS_CI_BRANCH!==BRANCH)return;
  const sha=env.WORKERS_CI_COMMIT_SHA;assert.match(sha||'',/^[0-9a-f]{40}$/,'DIAGNOSTIC_COMMIT_REQUIRED');
  const evidence=resolve(cwd,'public/stage5-native',sha+'.json'),started=Date.now();let nativeReport=null;
  const writeFailure=async(error,stage)=>{
    try{const value=JSON.parse(await readFile(resolve(cwd,'output/stage5-native/result.json'),'utf8'));if(Date.parse(value.date)>=started)nativeReport=scrub(value);}catch{}
    const report={date:new Date().toISOString(),passed:false,nativeAcceptancePassed:false,diagnosticOnly:true,previewBuildMayContinue:true,stage,cloudflareBuild:{branch:BRANCH,commit:sha,buildId:env.WORKERS_CI_BUILD_UUID||null},error:scrub({name:error?.name||'Error',message:error?.message||String(error),stack:error?.stack}),nativeReport,productionConnection:false,activeTransferEnabled:false,stage4:'OPEN',stage5:'OPEN',note:'The preview exists to expose diagnostics. This is not native acceptance or release approval.'};
    await mkdir(resolve(cwd,'public/stage5-native'),{recursive:true});await writeFile(evidence,JSON.stringify(report,null,2)+'\n');return report;
  };
  const failurePlugin={name:JSON_PLUGIN,apply:'build',generateBundle(){this.error('NATIVE_ACCEPTANCE_NOT_PROVEN');}};
  try{
    await task();const proof=JSON.parse(await readFile(evidence,'utf8'));
    assert.equal(proof.passed,true);assert.equal(proof.catalog?.passedCount,33);assert.equal(proof.catalog?.failedCount,0);assert.equal(proof.nativeConcurrencyPassed,3);assert.equal(proof.nativeSessionsClosed,true);assert.equal(proof.nativeServerStopped,true);assert.equal(proof.temporaryFilesRemoved,true);assert.equal(proof.productionConnection,false);assert.equal(proof.cloudflareBuild?.commit,sha);
    return {plugins:[failurePlugin],proof};
  }catch(error){
    const report=await writeFailure(error,'native-precheck-or-acceptance');return {plugins:[failurePlugin],diagnostic:report};
  }
}
export function makeStage5PreviewOnlyConfig(result){
  const plugins=Array.isArray(result?.plugins)?result.plugins:[],proof=result?.proof,diagnostic=result?.diagnostic;
  const isPass=proof?.passed===true&&proof?.catalog?.passedCount===33&&proof?.catalog?.failedCount===0&&proof?.nativeConcurrencyPassed===3&&proof?.nativeServerStopped===true&&proof?.temporaryFilesRemoved===true;
  if(isPass)return {build:{},plugins};
  const bytes=new TextEncoder().encode(JSON.stringify(diagnostic||{passed:false,nativeAcceptancePassed:false,diagnosticOnly:true,stage5:'OPEN'}));
  return {build:{},plugins:[...plugins,{name:'stage5-native-diagnostic-json-v1',apply:'build',generateBundle(){this.emitFile({type:'asset',fileName:'stage5-native/diagnostic.json',source:bytes});}}]};
}
