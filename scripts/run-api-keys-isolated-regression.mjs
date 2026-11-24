import {execFileSync,spawnSync} from "node:child_process";
import {mkdtempSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
const expected=process.argv[2]||process.env.WORKERS_CI_COMMIT_SHA||"";
for(const key of Object.keys(process.env))if(!["PATH","HOME","TMPDIR","TMP","TEMP","LANG","LC_ALL","TZ"].includes(key))delete process.env[key];
const report={expectedCommit:expected,realHostnamesCreated:0,productionCredentialsPassed:false,liveRuntimeAudit:false,phases:[],passed:false};
let work;
try{
 if(!/^[a-f0-9]{40}$/i.test(expected))throw Error("EXPECTED_COMMIT_REQUIRED");
 report.commit=execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8",timeout:10000}).trim();
 if(report.commit.toLowerCase()!==expected.toLowerCase())throw Error("SOURCE_COMMIT_MISMATCH");
 work=mkdtempSync(join(tmpdir(),"api-keys-regression-"));
 const env={PATH:process.env.PATH||"",HOME:work,TMPDIR:work,CI:"true",NODE_ENV:"test",LANG:"C.UTF-8",WRANGLER_SEND_METRICS:"false"};
 const deadline=Date.now()+720000;
 function run(name,args,production=false){
  const remaining=deadline-Date.now();
  if(remaining<=0){report.phases.push({name,passed:false,error:"RUNNER_DEADLINE"});return;}
  const r=spawnSync(process.execPath,args,{env:{...env,NODE_ENV:production?"production":"test"},encoding:"utf8",maxBuffer:16777216,timeout:Math.min(180000,remaining),shell:false});
  const out=String(r.stdout||"")+String(r.stderr||"");
  const counts=[...out.matchAll(/^# tests (\d+)$/gm)];
  const passed=r.status===0&&!r.error&&!r.signal;
  const phase={name,passed,exitCode:r.status,tests:counts.length?Number(counts.at(-1)[1]):null,error:r.error?.message,signal:r.signal};
  report.phases.push(phase);
  console.log("API_KEYS_ISOLATED_PHASE "+JSON.stringify(phase));
  console.log(out.slice(passed?-1600:-12000).replace(/ngb_live_[a-f0-9]{32,}/gi,"[REDACTED_API_KEY]"));
 }
 run("api-keys",["--test","--test-reporter=tap","tests/developer-api-branding.test.mjs","tests/api-keys-ui-isolation.test.mjs"]);
 for(const group of ["search","quotes","checkout","payments","registration","dns","transfer","isolation"])run("domain-"+group,["scripts/domain-quality/"+group+".mjs"]);
 run("prebuild-auth",["scripts/auth-capacity-model-v162.mjs","--output","public/auth-capacity-v162.json"],true);
 run("prebuild-layout",["scripts/studio-layout-model-v176.mjs","--output","public/studio-layout-v176.json"],true);
 run("vite-build",["node_modules/vite/bin/vite.js","build"],true);
 run("worker-dry-run",["node_modules/.bin/wrangler","deploy","--config","wrangler.production.jsonc","--dry-run","--outdir",join(work,"bundle")],true);
 report.passed=report.phases.length===13&&report.phases.every(x=>x.passed);
}catch(e){report.error=e.message;}
finally{if(work)rmSync(work,{recursive:true,force:true});}
console.log("API_KEYS_DOMAIN_REGRESSION_REPORT "+JSON.stringify(report));
console.log("NO_WORKER_UPLOAD_OR_DEPLOY_NO_LIVE_DOMAIN_OPERATIONS");
process.exitCode=report.passed?0:1;
