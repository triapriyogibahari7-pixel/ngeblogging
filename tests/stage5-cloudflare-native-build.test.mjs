import vm from 'node:vm';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {selected,nativePath} from '../scripts/stage5-cloudflare-native-build.mjs';
const branch='feature/domain-stages5-10-integration-20261030';
assert.equal(selected({}),false);assert.equal(selected({WORKERS_CI:'1',WORKERS_CI_BRANCH:'main'}),false);assert.equal(selected({WORKERS_CI:'0',WORKERS_CI_BRANCH:branch}),false);assert.equal(selected({WORKERS_CI:'1',WORKERS_CI_BRANCH:branch}),true);
assert.equal(nativePath('/tmp/pkg','native/lib/test'),'/tmp/pkg/native/lib/test');assert.throws(()=>nativePath('/tmp/pkg','../escape'));assert.throws(()=>nativePath('/tmp/pkg','/etc/passwd'));
let hookCalls=0;const transformed=()=>{},branding=()=>{},png=size=>new Uint8Array([size%256]);
const context=vm.createContext({});const mod=new vm.SourceTextModule(await readFile(new URL('../vite.config.js',import.meta.url),'utf8'),{context});
const values={vite:{defineConfig:value=>value},'./scripts/branding-v415.mjs':{transformBrandingHtml:branding},'./scripts/theme-customizer-desktop.mjs':{transformThemeCustomizer:transformed},'./scripts/brand-icons-v415.mjs':{brandPng:png},'./scripts/stage5-cloudflare-native-build.mjs':{runStage5NativeBuild:async()=>{hookCalls++;}}};
await mod.link(spec=>new vm.SyntheticModule(Object.keys(values[spec]),function(){for(const[k,v]of Object.entries(values[spec]))this.setExport(k,v);},{context}));await mod.evaluate();
const serve=await mod.namespace.default({command:'serve'});assert.equal(hookCalls,0);const build=await mod.namespace.default({command:'build'});assert.equal(hookCalls,1);
for(const cfg of [serve,build]){assert.equal(cfg.plugins.length,1);assert.equal(cfg.plugins[0].name,'ngeblogging-account-names-v422');assert.equal(cfg.plugins[0].enforce,'pre');assert.equal(cfg.plugins[0].transform,transformed);assert.equal(cfg.plugins[0].transformIndexHtml,branding);const files=[];cfg.plugins[0].generateBundle.call({emitFile:value=>files.push(value)});assert.equal(files.map(f=>f.fileName).join(','),'brand/icon-180-v415.png,brand/icon-192-v415.png,brand/icon-512-v415.png');}
console.log(JSON.stringify({selectionChecks:4,symlinkBoundaryChecks:3,buildOnlyHook:true,originalPluginPreserved:true,nativeDatabaseExecuted:false}));
