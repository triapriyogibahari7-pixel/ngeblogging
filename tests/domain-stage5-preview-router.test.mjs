import vm from 'node:vm';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const HOST='feature-domain-stages5-10-integration-20261030-ngeblogging.triapriyogibahari7.workers.dev';
const report={date:'2026-10-31',scope:'Patched v70 + preview router + actual isolated entry and disabled runtime; protected backend constructors and legacy dependencies are fixture sentinels',tests:[],backendConstructors:0,networkAttempts:0};let legacy=0;
const forbidden=()=>{report.backendConstructors++;throw Error('Backend construction forbidden');};
const context=vm.createContext({Request,Response,Headers,URL,Set,Object,fetch:()=>{report.networkAttempts++;throw Error('Network forbidden');}});
const synthetic=values=>new vm.SyntheticModule(Object.keys(values),function(){for(const[k,v]of Object.entries(values))this.setExport(k,v);},{context});
const module=async path=>new vm.SourceTextModule(await readFile(new URL('../'+path,import.meta.url),'utf8'),{context,identifier:path});
const runtime=await module('server/domain-transfer-isolated-runtime.mjs');await runtime.link(spec=>synthetic(spec.endsWith('domain-transfer-handler.mjs')?{createDomainTransferHandler:forbidden}:spec.endsWith('domain-transfer-state-handler.mjs')?{createTransferStateHandler:forbidden}:{createIsolatedTransferAdapters:forbidden}));
const isolated=await module('cloudflare/worker-domain-stage5-isolated.mjs');await isolated.link(()=>runtime);
const router=await module('cloudflare/domain-stage5-preview-router.mjs');await router.link(()=>isolated);
const worker=await module('cloudflare/worker-v70.mjs');const stubs={
 './worker-v69.mjs':{default:{fetch:async()=>{legacy++;return new Response('LEGACY',{headers:{'content-type':'text/plain','cache-control':'no-store'}});}}},
 '../server/payment-diagnostic-page.mjs':{paymentDiagnosticPage:async()=>null},
 '../server/midtrans-catalog-api.mjs':{paths:new Set(),handleMidtrans:forbidden},
 '../server/legal-pages.mjs':{legalResponse:()=>null,legalDiscovery:async(request,response)=>response}
};await worker.link(spec=>spec==='./domain-stage5-preview-router.mjs'?router:synthetic(stubs[spec]));await worker.evaluate();
const call=(url,method='GET',env={})=>worker.namespace.default.fetch(new Request(url,{method}),env,{});
async function test(name,fn){try{await fn();report.tests.push({name,passed:true});}catch(e){report.tests.push({name,passed:false,error:e.message});}}
await test('branch preview read-state reaches actual disabled stage5 runtime',async()=>{const before=legacy,r=await call('https://'+HOST+'/api/domains/move-state');assert.equal(r.status,503);assert.equal((await r.json()).code,'STAGE5_DISABLED');assert.equal(r.headers.get('x-stage5-preview'),'isolated-disabled-v1');assert.equal(legacy,before);});
await test('branch preview POST move cannot mutate database',async()=>{const r=await call('https://'+HOST+'/api/domains/move','POST');assert.equal(r.status,503);assert.equal((await r.json()).code,'STAGE5_DISABLED');});
await test('HEAD is bodyless and no-store',async()=>{const r=await call('https://'+HOST+'/api/domains/move-state','HEAD');assert.equal(r.status,503);assert.equal(await r.text(),'');assert.equal(r.headers.get('cache-control'),'no-store');});
await test('environment bindings cannot enable the preview route',async()=>{const r=await call('https://'+HOST+'/api/domains/move','POST',{STAGE5_TRANSFER_ENABLED:'true',STAGE5_ENVIRONMENT:'isolated-test',STAGE5_TEST_SUPABASE_URL:'https://polvmlrhqoiflumibfqs.supabase.co',SUPABASE_URL:'https://polvmlrhqoiflumibfqs.supabase.co'});assert.equal(r.status,503);assert.equal((await r.json()).code,'STAGE5_DISABLED');});
await test('production apex and platform hosts remain on legacy path',async()=>{for(const host of ['ngeblogging.com','www.ngeblogging.com','studio.ngeblogging.com','api.ngeblogging.com','source.ngeblogging.com']){const r=await call('https://'+host+'/api/domains/move-state');assert.equal(await r.text(),'LEGACY');assert.equal(r.headers.get('x-stage5-preview'),null);}});
await test('main workers.dev hostname is not selected',async()=>{assert.equal(await (await call('https://ngeblogging.triapriyogibahari7.workers.dev/api/domains/move-state')).text(),'LEGACY');});
await test('other branch preview is not selected',async()=>{assert.equal(await (await call('https://other-ngeblogging.triapriyogibahari7.workers.dev/api/domains/move-state')).text(),'LEGACY');});
await test('immutable version hostname is not mistaken for branch alias',async()=>{assert.equal(await (await call('https://65a39fe8-ngeblogging.triapriyogibahari7.workers.dev/api/domains/move-state')).text(),'LEGACY');});
await test('non-HTTPS or nondefault port is not selected',async()=>{for(const url of ['http://'+HOST+'/api/domains/move-state','https://'+HOST+':444/api/domains/move-state'])assert.equal(await (await call(url)).text(),'LEGACY');});
await test('health and neighboring domain APIs retain legacy behavior',async()=>{for(const path of ['/api/health','/api/domains/list','/api/domains/move-state/extra'])assert.equal(await (await call('https://'+HOST+path)).text(),'LEGACY');});
await test('static asset fast path remains intact',async()=>{const r=await call('https://'+HOST+'/assets/app-12345678.js','GET',{ASSETS:{fetch:async()=>new Response('export const ok=true;',{headers:{'content-type':'application/javascript'}})}});assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'public, max-age=31536000, immutable');assert.equal(r.headers.get('x-stage5-preview'),null);});
await test('no backend factory or network access occurred',async()=>{assert.equal(report.backendConstructors,0);assert.equal(report.networkAttempts,0);});
report.passedCount=report.tests.filter(t=>t.passed).length;report.failedCount=report.tests.filter(t=>!t.passed).length;report.passed=report.failedCount===0;report.productionConnection=false;report.activeTransferEnabled=false;report.limits=['Node VM sentinels, not full legacy chain or native Worker execution','This only verifies disabled routing and isolation, not successful transfer or native Auth/PostgREST','Live Cloudflare build/branch-preview marker verification is still required'];console.log(JSON.stringify(report,null,2));if(!report.passed)process.exitCode=1;
