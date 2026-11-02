import {spawn,execFileSync} from 'node:child_process';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
export const COMMERCE_BRANCH='feat/domain-commerce-cloudflare-prod-20261102';
const SHA=/^[a-f0-9]{40}$/i,UUID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const fail=code=>{throw Object.assign(Error(code),{code});};
export const OFFLINE_TESTS=Object.freeze(['tests/domain-commerce-build-gate.test.mjs','tests/domain-worker-fetch.test.mjs','tests/domain-customer-auth.test.mjs','tests/domain-customer-heading.test.mjs','tests/domain-customer-display-regression.test.mjs','tests/domain-customer-purchase-intent.test.mjs']);
const NATIVE_TEST='tests/domain-auth-native-runtime.test.mjs';
export const BUILD_INPUTS=Object.freeze([...OFFLINE_TESTS,NATIVE_TEST,'tests/fixtures/domain-auth-native.worker.mjs','server/domain-worker-fetch.mjs','server/domain-customer-auth-bridge.mjs','server/domain-customer-price-check.mjs','server/domain-customer-review.mjs','server/domain-customer-quote-runtime.mjs','server/cloudflare-registration-quote-provider.mjs','scripts/domain-commerce-cloudflare-build.mjs','vite.config.js','package.json','package-lock.json','src/DomainCustomerSearch.jsx','src/domain-customer-search.css']);
export function commerceBuildContext(env,localBranch=''){
 const platform=env.WORKERS_CI==='1'?'cloudflare':env.GITHUB_ACTIONS==='true'?'github':'local';
 const branch=platform==='cloudflare'?env.WORKERS_CI_BRANCH:platform==='github'?(env.GITHUB_HEAD_REF||env.GITHUB_REF_NAME):localBranch;
 if(platform!=='local'&&(typeof branch!=='string'||!/^[A-Za-z0-9._/-]{1,128}$/.test(branch)))fail('DOMAIN_BUILD_BRANCH_METADATA_INVALID');
 const selected=branch===COMMERCE_BRANCH||branch==='main';
 const expectedCommit=platform==='cloudflare'?env.WORKERS_CI_COMMIT_SHA:platform==='github'?env.GITHUB_SHA:null;
 if(selected&&platform!=='local'&&!SHA.test(expectedCommit||''))fail('DOMAIN_BUILD_COMMIT_METADATA_INVALID');
 return {selected,platform,branch:branch||null,expectedCommit};
}
export function verifyCommerceCommit(context,actual){if(!SHA.test(actual||'')||(context.expectedCommit&&context.expectedCommit.toLowerCase()!==actual.toLowerCase()))fail('DOMAIN_BUILD_COMMIT_MISMATCH');return actual.toLowerCase();}
export function isolatedCommerceEnvironment(work,env){return {PATH:env.PATH||'',HOME:work,TMPDIR:work,TMP:work,TEMP:work,CI:'true',NODE_ENV:'test',WRANGLER_SEND_METRICS:'false',LANG:'C.UTF-8',...(env.SystemRoot?{SystemRoot:env.SystemRoot}:{})};}
export function redactCommerceLog(value){return String(value).replace(/Bearer\s+[^\s"']+/gi,'Bearer [REDACTED]').replace(/(?:sb_secret_|sb_publishable_|ghp_|github_pat_)[A-Za-z0-9_-]+/g,'[REDACTED]').replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,'[REDACTED_JWT]');}
function validateCounts(value,min){
 const keys=['tests','pass','fail','cancelled','skipped','todo'];
 if(!value||keys.some(k=>!Number.isSafeInteger(value[k])||value[k]<0)||value.tests<min||value.pass!==value.tests||keys.slice(2).some(k=>value[k]!==0))fail('DOMAIN_BUILD_TEST_EVIDENCE_INVALID');
 return Object.fromEntries(keys.map(k=>[k,value[k]]));
}
export function commerceTapEvidence(output,min=1){
 const counts={};for(const key of ['tests','pass','fail','cancelled','skipped','todo']){const matches=[...output.matchAll(new RegExp('^# '+key+' (\\d+)\\s*$','gm'))];counts[key]=matches.length?Number(matches.at(-1)[1]):NaN;}
 return validateCounts(counts,min);
}
async function executeTests(files,{root,env,stage}){
 return new Promise((done,reject)=>{
  const grouped=process.platform!=='win32',child=spawn(process.execPath,['--test','--test-reporter=tap',...files],{cwd:root,env,detached:grouped,stdio:['ignore','pipe','pipe']});
  let stdout='',size=0,settled=false,forced=null,reason=null;const pending={out:'',err:''};
  const kill=signal=>{try{if(grouped&&Number.isInteger(child.pid))process.kill(-child.pid,signal);else child.kill(signal);}catch{}};
  const stop=code=>{reason=reason||code;kill('SIGTERM');if(!forced)forced=setTimeout(()=>kill('SIGKILL'),1000);};
  const interrupted=()=>stop('INTERRUPTED'),timer=setTimeout(()=>stop('TIMEOUT'),180000);
  const finish=error=>{if(settled)return;settled=true;clearTimeout(timer);clearTimeout(forced);process.removeListener('SIGTERM',interrupted);process.removeListener('SIGINT',interrupted);for(const key of ['out','err'])if(pending[key])process[key==='out'?'stdout':'stderr'].write(redactCommerceLog(pending[key])+'\n');error?reject(error):done(stdout);};
  process.once('SIGTERM',interrupted);process.once('SIGINT',interrupted);
  const capture=key=>chunk=>{size+=chunk.length;if(size>8*1024*1024){stop('OUTPUT_LIMIT');return;}const text=chunk.toString('utf8');if(key==='out')stdout+=text;const lines=(pending[key]+text).split(/\r?\n/);pending[key]=lines.pop();for(const line of lines)process[key==='out'?'stdout':'stderr'].write(redactCommerceLog(line)+'\n');};
  child.stdout.on('data',capture('out'));child.stderr.on('data',capture('err'));
  child.on('error',()=>finish(Error('DOMAIN_BUILD_'+stage+'_SPAWN_FAILED')));
  child.on('close',code=>finish(reason||code!==0?Error('DOMAIN_BUILD_'+stage+'_'+(reason||'FAILED')):null));
 });
}
export async function runDomainCommerceBuildGate({env=process.env,root=process.cwd()}={}){
 const git=args=>execFileSync('git',args,{cwd:root,env,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
 let localBranch='';try{localBranch=git(['symbolic-ref','--quiet','--short','HEAD']);}catch{}
 const context=commerceBuildContext(env,localBranch);if(!context.selected)return {selected:false,platform:context.platform,branch:context.branch};
 const [major,minor]=process.versions.node.split('.').map(Number);if(major<22||(major===22&&minor<12))fail('DOMAIN_BUILD_NODE_VERSION_UNSUPPORTED');
 const commit=verifyCommerceCommit(context,git(['rev-parse','HEAD'])),startedAt=new Date().toISOString();
 const work=await mkdtemp(join(tmpdir(),'ngeblogging-commerce-build-'));let offline,native;
 try{
  const clean=isolatedCommerceEnvironment(work,env);
  offline=commerceTapEvidence(await executeTests(OFFLINE_TESTS,{root,env:clean,stage:'OFFLINE'}),34);
  native=commerceTapEvidence(await executeTests([NATIVE_TEST],{root,env:clean,stage:'NATIVE'}),9);
 }finally{await rm(work,{recursive:true,force:true});}
 const inputs={};for(const file of BUILD_INPUTS)inputs[file]=createHash('sha256').update(await readFile(resolve(root,file))).digest('hex');
 console.log('[domain-commerce-build] PASS '+JSON.stringify({commit,platform:context.platform,offline:offline.pass,native:native.pass}));
 return {selected:true,schemaVersion:1,commit,branch:context.branch,platform:context.platform,buildId:UUID.test(env.WORKERS_CI_BUILD_UUID||'')?env.WORKERS_CI_BUILD_UUID:null,startedAt,finishedAt:new Date().toISOString(),validation:{offline,native},inputs};
}
export function domainCommerceBuildProofPlugin(report){
 if(report?.selected!==true||report.schemaVersion!==1||!SHA.test(report.commit||'')||![COMMERCE_BRANCH,'main'].includes(report.branch)||!['cloudflare','github','local'].includes(report.platform))fail('DOMAIN_BUILD_PROOF_INVALID');
 const validation={offline:validateCounts(report.validation?.offline,34),native:validateCounts(report.validation?.native,9)},inputs={};
 for(const file of BUILD_INPUTS){if(typeof report.inputs?.[file]!=='string'||!/^[a-f0-9]{64}$/.test(report.inputs[file]))fail('DOMAIN_BUILD_INPUT_DIGEST_INVALID');inputs[file]=report.inputs[file];}
 const proof={schemaVersion:1,commit:report.commit.toLowerCase(),branch:report.branch,platform:report.platform,buildId:UUID.test(report.buildId||'')?report.buildId:null,startedAt:report.startedAt,finishedAt:report.finishedAt,validation,inputs,doesNotVerify:['live-configuration','live-authentication','registrar-account-access','real-payments','live-domain-registration','production-browser-layout','postgresql-migrations-and-concurrency']};
 return {name:'domain-commerce-validated-build-proof',apply:'build',generateBundle(){const source=JSON.stringify(proof,null,2)+'\n';for(const fileName of ['release-v20261102.json','assets/domain-commerce-build-'+proof.commit+'.json'])this.emitFile({type:'asset',fileName,source});}};
}
