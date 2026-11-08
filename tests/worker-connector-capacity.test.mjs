import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
const script=new URL('../scripts/prepare-worker-connector-capacity.mjs',import.meta.url).pathname;
function trial({count=61,worker='ngeblogging',keep=false,vars={},branch='main',duplicate=false,fail=false,noPlan=false}={}){
 const dir=mkdtempSync(join(tmpdir(),'nara-capacity-'));
 try{
  mkdirSync(join(dir,'scripts'));
  writeFileSync(join(dir,'wrangler.jsonc'),JSON.stringify({name:worker,keep_vars:keep,vars}));
  const plan=JSON.stringify({worker,variablesAfter:count,removed:[]});
  const line='[worker-vars] PLAN '+plan;
  writeFileSync(join(dir,'scripts/deploy-worker-free-limit.mjs'),fail?'process.exitCode=1;':noPlan?'':`console.log(${JSON.stringify(line)});${duplicate?`console.log(${JSON.stringify(line)});`:''}`);
  return spawnSync(process.execPath,[script],{cwd:dir,env:{PATH:process.env.PATH,WORKERS_CI:'1',WORKERS_CI_BRANCH:branch},encoding:'utf8',timeout:10000});
 }finally{rmSync(dir,{recursive:true,force:true});}
}
test('60 preserves the four-slot reserve',()=>{const r=trial({count:60});assert.equal(r.status,0,r.stderr);assert.match(r.stdout,/"reserveSatisfied":true/);});
test('61 permits capacity with three free slots and a non-blocking warning',()=>{const r=trial();assert.equal(r.status,0,r.stderr);assert.match(r.stdout,/"freeSlotsAt64":3/);assert.match(r.stdout,/"blocking":false/);assert.match(r.stdout,/"reserveSatisfied":false/);assert.match(r.stdout,/"deploymentVerified":false/);});
test('62 through 64 remain within the hard capacity limit',()=>{for(const count of [62,63,64]){const r=trial({count});assert.equal(r.status,0,r.stderr);assert.match(r.stdout,new RegExp('"freeSlotsAt64":'+(64-count)));}});
test('65 is rejected rather than bypassing the Worker limit',()=>{const r=trial({count:65});assert.notEqual(r.status,0);assert.match(r.stderr,/STOP_NO_DEPLOY/);assert.match(r.stdout,/"overLimitBy":1/);});
test('invalid, duplicate and absent plans fail closed',()=>{for(const options of [{count:-1},{count:1.5},{worker:'other'},{duplicate:true},{noPlan:true}])assert.notEqual(trial(options).status,0);});
test('preparation failure and unsafe prepared configuration still stop deployment',()=>{for(const options of [{fail:true},{keep:true},{count:0,vars:{EXTRA:'test'}}])assert.notEqual(trial(options).status,0);});
test('non-production builds skip the preparation process',()=>{const r=trial({branch:'preview',fail:true});assert.equal(r.status,0);assert.match(r.stdout,/SKIPPED_NON_PRODUCTION/);});
