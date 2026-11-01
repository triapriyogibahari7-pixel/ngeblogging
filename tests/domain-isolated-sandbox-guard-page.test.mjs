import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const html=await readFile(new URL('../public/assets/isolated-probe-guard-check-v1.html',import.meta.url),'utf8');
const source=await readFile(new URL('../public'+/src="([^"]+\.mjs)"/.exec(html)[1],import.meta.url),'utf8');
const origin='https://feature-domain-stages5-10-integration-20261030-ngeblogging.triapriyogibahari7.workers.dev',base='/api/admin/commerce/domains/sandbox-snap-probe';
async function run(o={}){
 const calls=[],output={dataset:{}},location={origin,pathname:'/assets/isolated-probe-guard-check-v1.html',search:'',hash:'',...o.location};
 const fetch=async(url,init)=>{
  calls.push({url,init});assert.equal(init.credentials,'omit');assert.equal(init.redirect,'error');assert.equal(init.cache,'no-store');assert.equal('body' in init,false);assert.equal('headers' in init,false);assert.ok(init.signal);assert.ok(url.startsWith(origin+base));
  if(o.networkError)throw Error('network');
  const before=init.method==='GET';const data={code:before?'METHOD_NOT_ALLOWED':'ISOLATED_SANDBOX_PROBE_ROUTED_DISABLED',scope:'isolated_sandbox_probe',runtimeEnabled:false,checkoutCreated:false,paymentCreated:false,customerQuoteCreated:false,domainOrderRecorded:false,registrationStarted:false,costBasisVerified:false,...(before?o.before:o.after)};
  return new Response(JSON.stringify(data),{status:before?(o.getStatus||405):(o.postStatus||503),headers:{'content-type':'application/json','cache-control':'no-store','x-ngeblogging-isolated-probe-router':o.marker||'guarded-v1'}});
 };
 await vm.runInNewContext(source,{location,fetch,AbortController,setTimeout,clearTimeout,document:{getElementById:id=>{assert.equal(id,'isolated-probe-guard-result');return output;}}});
 assert.equal(output.dataset.complete,'true');return {calls,data:JSON.parse(output.textContent)};
}
test('same-origin external script only, no forms or inline scripts',()=>{assert.match(html,/script-src 'self'; connect-src 'self'/);assert.equal((html.match(/<script/g)||[]).length,1);assert.doesNotMatch(html,/<form|<input|onload=/i);assert.doesNotMatch(source,/localStorage|sessionStorage|document\.cookie|authorization/i);});
test('one preflight GET and exactly three empty POSTs',async()=>{const r=await run();assert.equal(r.data.status,'passed');assert.deepEqual(r.calls.map(x=>x.init.method),['GET','POST','POST','POST']);assert.deepEqual(r.calls.slice(1).map(x=>x.url),[origin+base,origin+base+'/status',origin+base+'/notification']);assert.equal(r.data.authenticatedFlowTested,false);assert.equal(r.data.midtransFlowTested,false);});
for(const location of [{origin:'https://ngeblogging.com'},{pathname:'/other'},{search:'?start=true'},{hash:'#start'}])test('location guard '+JSON.stringify(location),async()=>{const r=await run({location});assert.equal(r.calls.length,0);assert.equal(r.data.status,'not_confirmed');});
for(const options of [{getStatus:404},{marker:'other'},{before:{runtimeEnabled:true}},{before:{costBasisVerified:true}},{before:{code:'OTHER'}}])test('preflight aborts without POST '+JSON.stringify(options),async()=>{const r=await run(options);assert.equal(r.calls.length,1);assert.equal(r.data.status,'not_confirmed');});
for(const options of [{postStatus:401},{after:{paymentCreated:true}},{after:{code:'OTHER'}}])test('first mismatched POST stops remaining checks '+JSON.stringify(options),async()=>{const r=await run(options);assert.equal(r.calls.length,2);assert.equal(r.data.status,'not_confirmed');});
test('network error is not success or a retry',async()=>{const r=await run({networkError:true});assert.equal(r.calls.length,1);assert.equal(r.data.status,'not_confirmed');});
