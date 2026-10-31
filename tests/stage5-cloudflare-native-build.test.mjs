import vm from 'node:vm';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {selected,nativePath} from '../scripts/stage5-cloudflare-native-build.mjs';
import {runStage5BuildDiagnostics} from '../scripts/stage5-build-diagnostics.mjs';
const branch='feature/domain-stages5-10-integration-20261030';
assert.equal(selected({}),false);assert.equal(selected({WORKERS_CI:'1',WORKERS_CI_BRANCH:'main'}),false);assert.equal(selected({WORKERS_CI:'0',WORKERS_CI_BRANCH:branch}),false);assert.equal(selected({WORKERS_CI:'1',WORKERS_CI_BRANCH:branch}),true);
assert.equal(nativePath('/tmp/pkg','native/lib/test'),'/tmp/pkg/native/lib/test');assert.throws(()=>nativePath('/tmp/pkg','../escape'));assert.throws(()=>nativePath('/tmp/pkg','/etc/passwd'));
let hookCalls=0;const transformed=()=>{},branding=()=>{},png=size=>new Uint8Array([size%256]);
const context=vm.createContext({});const mod=new vm.SourceTextModule(await readFile(new URL('../vite.config.js',import.meta.url),'utf8'),{context});
const values={vite:{defineConfig:value=>value},'./scripts/branding-v415.mjs':{transformBrandingHtml:branding},'./scripts/theme-customizer-desktop.mjs':{transformThemeCustomizer:transformed},'./scripts/brand-icons-v415.mjs':{brandPng:png},'./scripts/stage5-cloudflare-native-build.mjs':{runStage5NativeBuild:async()=>{}},'./scripts/stage5-build-diagnostics.mjs':{runStage5BuildDiagnostics:async()=>{hookCalls++;}}};
await mod.link(spec=>new vm.SyntheticModule(Object.keys(values[spec]),function(){for(const[k,v]of Object.entries(values[spec]))this.setExport(k,v);},{context}));await mod.evaluate();
const serve=await mod.namespace.default({command:'serve'});assert.equal(hookCalls,0);const build=await mod.namespace.default({command:'build'});assert.equal(hookCalls,1);
for(const cfg of [serve,build]){assert.equal(cfg.plugins.length,1);assert.equal(cfg.plugins[0].name,'ngeblogging-account-names-v422');assert.equal(cfg.plugins[0].enforce,'pre');assert.equal(cfg.plugins[0].transform,transformed);assert.equal(cfg.plugins[0].transformIndexHtml,branding);const files=[];cfg.plugins[0].generateBundle.call({emitFile:value=>files.push(value)});assert.equal(files.map(f=>f.fileName).join(','),'brand/icon-180-v415.png,brand/icon-192-v415.png,brand/icon-512-v415.png');}
const work=await mkdtemp(join(tmpdir(),'stage5-diagnostic-test-')),sha='a'.repeat(40),env={WORKERS_CI:'1',WORKERS_CI_BRANCH:branch,WORKERS_CI_COMMIT_SHA:sha},evidence=join(work,'public/stage5-native',sha+'.json');
try{
 let calls=0;await runStage5BuildDiagnostics(async()=>{calls++;},{env:{...env,WORKERS_CI_BRANCH:'main'},cwd:work});assert.equal(calls,0);
 const failure=await runStage5BuildDiagnostics(async()=>{throw Error('fixture Bearer ghp_NOT_A_REAL_TOKEN');},{env,cwd:work});assert.equal(failure.passed,false);assert.equal(failure.nativeAcceptancePassed,false);assert.equal(failure.diagnosticOnly,true);assert.equal(failure.cleanupStatus,'not-verified-by-diagnostic-wrapper');assert.ok(!(await readFile(evidence,'utf8')).includes('ghp_NOT_A_REAL_TOKEN'));
 const incomplete=await runStage5BuildDiagnostics(async()=>{await writeFile(evidence,JSON.stringify({passed:true}));},{env,cwd:work});assert.equal(incomplete.passed,false);assert.equal(incomplete.diagnosticOnly,true);
 const proof={passed:true,catalog:{passedCount:33,failedCount:0},nativeConcurrencyPassed:3,nativeSessionsClosed:true,nativeServerStopped:true,temporaryFilesRemoved:true,productionConnection:false,cloudflareBuild:{commit:sha}};
 const success=await runStage5BuildDiagnostics(async()=>{await mkdir(join(work,'public/stage5-native'),{recursive:true});await writeFile(evidence,JSON.stringify(proof));},{env,cwd:work});assert.deepEqual(success,proof);
}finally{await rm(work,{recursive:true,force:true});}
console.log(JSON.stringify({selectionChecks:4,symlinkBoundaryChecks:3,buildOnlyHook:true,originalPluginPreserved:true,diagnosticScenarios:4,nativeDatabaseExecuted:false}));
