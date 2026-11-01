import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const origin='https://feature-domain-stages5-10-integration-20261030-ngeblogging.triapriyogibahari7.workers.dev',base='/api/admin/commerce/domains/sandbox-snap-probe';
async function load(){
 const calls=[],context=vm.createContext({URL,Request,Response,Headers,console,fetch:()=>{throw Error('Unexpected network');}});
 const synthetic=exports=>new vm.SyntheticModule(Object.keys(exports),function(){for(const [k,v]of Object.entries(exports))this.setExport(k,v);},{context});
 const adapter=kind=>async(request,env,opts)=>{calls.push({kind,request,env,opts});return new Response(kind,{status:kind==='admin'?201:202});};
 const old=name=>async(...args)=>{calls.push({kind:name,args});return null;};
 const modules=new Map([
 ['../server/domain-isolated-sandbox-probe.mjs',synthetic({PREVIEW_ORIGIN:origin})],
 ['../server/domain-isolated-sandbox-handler.mjs',synthetic({isolatedSandboxProbeResponse:adapter('admin')})],
 ['../server/domain-isolated-sandbox-notification.mjs',synthetic({isolatedSandboxNotificationResponse:adapter('notification')})],
 ['../server/domain-sandbox-status-probe.mjs',synthetic({domainSandboxStatusProbeResponse:old('oldProbe')})],
 ['../server/domain-checkout-preview-handler.mjs',synthetic({domainCheckoutPreviewResponse:old('oldCheckout')})],
 ['../server/domain-payment-notification-handler.mjs',synthetic({domainPaymentNotificationResponse:old('oldNotification')})],
 ['../server/domain-quote-preview-handler.mjs',synthetic({domainQuotePreviewResponse:old('oldQuote')})],
 ['../server/domain-order-preview-handler.mjs',synthetic({domainOrderPreviewResponse:old('oldOrder')})],
 ['../server/registrar-diagnostic-handler.mjs',synthetic({registrarDiagnosticResponse:old('oldRegistrar')})],
 ['./domain-stage5-preview-router.mjs',synthetic({stage5PreviewResponse:old('stage5')})],
 ['./worker-v69.mjs',synthetic({default:{fetch:async(...args)=>{calls.push({kind:'base',args});return new Response('base-body',{headers:{'x-base-preserved':'yes'}});}}})],
 ['../server/payment-diagnostic-page.mjs',synthetic({paymentDiagnosticPage:old('paymentPage')})],
 ['../server/midtrans-catalog-api.mjs',synthetic({paths:new Set(['/api/midtrans-fixture']),handleMidtrans:async()=>new Response('legacy-midtrans')})],
 ['../server/legal-pages.mjs',synthetic({legalResponse:()=>null,legalDiscovery:async(_r,response)=>response})]
 ]);
 const router=new vm.SourceTextModule(await readFile(new URL('../cloudflare/domain-isolated-sandbox-router.mjs',import.meta.url),'utf8'),{context});modules.set('./domain-isolated-sandbox-router.mjs',router);
 const worker=new vm.SourceTextModule(await readFile(new URL('../cloudflare/worker-v70.mjs',import.meta.url),'utf8'),{context});
 await worker.link(spec=>{if(!modules.has(spec))throw Error('Unexpected import '+spec);return modules.get(spec);});await worker.evaluate();
 return {calls,worker:worker.namespace.default,route:router.namespace.isolatedSandboxPreviewResponse};
}
function req(path=base,{host=origin,method='POST',body='{}'}={}){return new Request(host+path,{method,...(method==='POST'?{body,headers:{'content-type':'application/json',origin}}:{})});}
for(const suffix of ['', '/status','/notification'])test('Worker closes '+suffix+' even with enabled env',async()=>{const f=await load();const r=await f.worker.fetch(req(base+suffix),{DOMAIN_SANDBOX_SNAP_PROBE_ENABLED:'true'},{});assert.equal(r.status,503);const d=await r.json();assert.equal(d.code,'ISOLATED_SANDBOX_PROBE_ROUTED_DISABLED');assert.equal(d.runtimeEnabled,false);assert.equal(d.paymentCreated,false);assert.equal(r.headers.get('cache-control'),'no-store');assert.equal(r.headers.get('x-ngeblogging-isolated-probe-router'),'guarded-v1');assert.equal(f.calls.length,0);});
test('request body cannot open internal readiness gate',async()=>{const f=await load();const r=await f.worker.fetch(req(base,{body:'{"runtimeReady":true,"notificationReceiverReady":true}'}),{DOMAIN_SANDBOX_SNAP_PROBE_ENABLED:'true'},{});assert.equal(r.status,503);assert.equal(f.calls.length,0);});
for(const spec of [{method:'GET',status:405},{host:'https://ngeblogging.com',status:404}])test('early boundary '+JSON.stringify(spec),async()=>{const f=await load();assert.equal((await f.worker.fetch(req(base,spec),{},{})).status,spec.status);assert.equal(f.calls.length,0);});
test('unknown reserved subpath returns 404',async()=>{const f=await load();assert.equal((await f.worker.fetch(req(base+'/unknown'),{},{})).status,404);assert.equal(f.calls.length,0);});
test('query rejected before delegation',async()=>{const f=await load();assert.equal((await f.worker.fetch(req(base+'?runtimeReady=true'),{},{})).status,400);assert.equal(f.calls.length,0);});
test('router readiness defaults closed',async()=>{const f=await load();assert.equal((await f.route(req(),{DOMAIN_SANDBOX_SNAP_PROBE_ENABLED:'true'})).status,503);assert.equal(f.calls.length,0);});
test('closed environment still blocks internal ready option',async()=>{const f=await load();assert.equal((await f.route(req(),{DOMAIN_SANDBOX_SNAP_PROBE_ENABLED:'false'},{runtimeReady:true})).status,503);assert.equal(f.calls.length,0);});
for(const suffix of ['', '/status','/notification'])test('explicit internal open dispatch contract (mock adapters) '+suffix,async()=>{const f=await load();const request=req(base+suffix),env={DOMAIN_SANDBOX_SNAP_PROBE_ENABLED:'true'};const r=await f.route(request,env,{runtimeReady:true});const c=f.calls[0];assert.equal(f.calls.length,1);assert.equal(c.request,request);assert.equal(c.env,env);assert.equal(c.kind,suffix==='/notification'?'notification':'admin');assert.equal(r.status,suffix==='/notification'?202:201);if(c.kind==='admin')assert.equal(c.opts.notificationReceiverReady,true);});
test('legacy checkout dispatch unchanged (mock downstream)',async()=>{const f=await load();const r=await f.worker.fetch(req('/api/commerce/domains/checkout'),{},{});assert.equal(await r.text(),'base-body');assert.ok(f.calls.some(c=>c.kind==='oldCheckout'));assert.equal(f.calls.some(c=>['admin','notification'].includes(c.kind)),false);});
test('legacy Midtrans route unchanged (mock downstream)',async()=>{const f=await load();const r=await f.worker.fetch(req('/api/midtrans-fixture'),{},{});assert.equal(await r.text(),'legacy-midtrans');assert.equal(f.calls.some(c=>['admin','notification'].includes(c.kind)),false);});
test('static asset path preserved',async()=>{const f=await load();const r=await f.worker.fetch(req('/assets/example.js',{method:'GET'}),{ASSETS:{fetch:async()=>new Response('asset-body',{headers:{'content-type':'application/javascript'}})}},{});assert.equal(await r.text(),'asset-body');assert.equal(r.headers.get('x-ngeblogging-static-fast-path'),'true');assert.equal(f.calls.some(c=>c.kind==='base'),false);});
test('base Worker receives original request, environment and context',async()=>{const f=await load(),request=req('/api/health',{method:'GET'}),env={},ctx={};const r=await f.worker.fetch(request,env,ctx);assert.equal(r.headers.get('x-base-preserved'),'yes');const b=f.calls.find(c=>c.kind==='base');assert.equal(b.args[0],request);assert.equal(b.args[1],env);assert.equal(b.args[2],ctx);});
test('guard HTML internally fetches canonical asset without browser redirect',async()=>{const f=await load(),path='/assets/isolated-probe-guard-check-v1.html',request=new Request(origin+path,{headers:{'x-fixture':'preserved'}}),seen=[];const r=await f.worker.fetch(request,{ASSETS:{fetch:async x=>{seen.push(x);return new URL(x.url).pathname===path.slice(0,-5)?new Response('<h1>guard page</h1>',{headers:{'content-type':'text/html'}}):new Response(null,{status:307,headers:{location:path.slice(0,-5)}});}}},{});assert.equal(r.status,200);assert.equal(await r.text(),'<h1>guard page</h1>');assert.equal(r.headers.get('location'),null);assert.equal(r.headers.get('cache-control'),'no-store, max-age=0, must-revalidate');assert.equal(request.url,origin+path);assert.equal(seen.length,1);assert.equal(seen[0].url,origin+path.slice(0,-5));assert.equal(seen[0].headers.get('x-fixture'),'preserved');});
test('guard HTML HEAD preserves method and has no response body',async()=>{const f=await load();const r=await f.worker.fetch(req('/assets/isolated-probe-guard-check-v1.html',{method:'HEAD'}),{ASSETS:{fetch:async x=>{assert.equal(x.method,'HEAD');assert.equal(new URL(x.url).pathname,'/assets/isolated-probe-guard-check-v1');return new Response('<h1>guard</h1>',{headers:{'content-type':'text/html'}});}}},{});assert.equal(r.status,200);assert.equal(r.body,null);assert.equal(r.headers.get('cache-control'),'no-store, max-age=0, must-revalidate');});
for(const path of ['/assets/unrelated.mjs','/assets/isolated-probe-guard-check-v1'])test('generic HTML fallback remains blocked '+path,async()=>{const f=await load();const r=await f.worker.fetch(req(path,{method:'GET'}),{ASSETS:{fetch:async x=>{assert.equal(new URL(x.url).pathname,path);return new Response('<h1>fallback</h1>',{headers:{'content-type':'text/html'}});}}},{});assert.equal(r.status,404);assert.equal(r.headers.get('x-ngeblogging-static-fallback-blocked'),'true');});
