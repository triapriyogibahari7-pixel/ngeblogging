// Preview diagnostics only: an application build is not native acceptance.
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const BRANCH='feature/domain-stages5-10-integration-20261030';
function scrub(value){
  if(Array.isArray(value))return value.map(scrub);
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,v])=>[key,/secret|password|authorization|api.?key|access.?token/i.test(key)?'[REDACTED]':scrub(v)]));
  if(typeof value==='string')return value.replace(/Bearer\s+[^\s"']+/gi,'Bearer [REDACTED]').replace(/(?:sb_secret_|ghp_|github_pat_)[A-Za-z0-9_]+/g,'[REDACTED]').slice(0,6000);
  return value;
}
export async function runStage5BuildDiagnostics(task,{env=process.env,cwd=process.cwd()}={}){
  if(env.WORKERS_CI!=='1'||env.WORKERS_CI_BRANCH!==BRANCH)return;
  const sha=env.WORKERS_CI_COMMIT_SHA;assert.match(sha||'',/^[0-9a-f]{40}$/,'DIAGNOSTIC_COMMIT_REQUIRED');
  const evidence=resolve(cwd,'public/stage5-native',sha+'.json'),started=Date.now();
  try{
    await task();const proof=JSON.parse(await readFile(evidence,'utf8'));
    assert.equal(proof.passed,true);assert.equal(proof.catalog?.passedCount,33);assert.equal(proof.catalog?.failedCount,0);assert.equal(proof.nativeConcurrencyPassed,3);assert.equal(proof.nativeSessionsClosed,true);assert.equal(proof.nativeServerStopped,true);assert.equal(proof.temporaryFilesRemoved,true);assert.equal(proof.productionConnection,false);assert.equal(proof.cloudflareBuild?.commit,sha);
    return proof;
  }catch(error){
    let nativeReport=null;
    try{const value=JSON.parse(await readFile(resolve(cwd,'output/stage5-native/result.json'),'utf8'));if(Date.parse(value.date)>=started)nativeReport=scrub(value);}catch{}
    const report={date:new Date().toISOString(),passed:false,nativeAcceptancePassed:false,diagnosticOnly:true,previewBuildMayContinue:true,cloudflareBuild:{branch:BRANCH,commit:sha,buildId:env.WORKERS_CI_BUILD_UUID||null},error:scrub({name:error.name,message:error.message,stack:error.stack}),nativeReport,cleanupStatus:'not-verified-by-diagnostic-wrapper',productionConnection:false,activeTransferEnabled:false,stage4:'OPEN',stage5:'OPEN',note:'Application preview may build to expose this error. This is not a native pass or production release approval.'};
    await mkdir(resolve(cwd,'public/stage5-native'),{recursive:true});await writeFile(evidence,JSON.stringify(report,null,2)+'\n');console.error('[stage5-native] NATIVE ACCEPTANCE FAILED; publishing diagnostic-only preview, not a pass');return report;
  }
}
