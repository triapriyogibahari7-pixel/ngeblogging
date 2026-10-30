import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const source=await readFile(new URL('../src/DomainPanelV124.jsx',import.meta.url),'utf8');
function section(start,end){const a=source.indexOf(start),b=source.indexOf(end,a+start.length);assert.ok(a>=0&&b>a);return source.slice(a,b);}
const deadline=section('function withDeadline(','\nasync function accessToken(');
const guard=section('  const beginOperation =','  const mutate =');
const publication=section('  const togglePublication = async () => {','  const runAudit =');
const card=section('<section className="sv124-card sv124-free-domain">','</section>')+'</section>';
// Semantic checks replace a stale whole-handler hash; current guards are executed.
function setup(site,busy='',operation=null){
  const calls=[],updates=[],errors=[],states=[],toasts=[];let context;
  context=vm.createContext({site,busy,siteRef:{current:site?.id},siteGeneration:{current:0},mutationLock:{current:false},loadGeneration:{current:0},REQUEST_TIMEOUT:20,window:{setTimeout,clearTimeout},setBusy:value=>states.push(value),setError:value=>errors.push(value),setToast:value=>toasts.push(value),onSiteUpdate:value=>updates.push(value),setSitePublication:async(id,published)=>{calls.push({id,published});if(operation)return operation(context,published);return {status:published?'active':'draft',is_public:published};}});
  vm.runInContext(deadline+guard+publication.replace('const togglePublication =','globalThis.togglePublication ='),context);
  return {context,calls,updates,errors,states,toasts,run:()=>context.togglePublication()};
}
test('free publication still calls only the existing publication service',()=>{assert.match(publication,/setSitePublication\(site\.id, !published\)/);assert.doesNotMatch(publication,/domainApi|supabase\.|\/api\/domains/);for(const field of ['slug','custom_domain','ownership_verification'])assert.ok(!publication.includes(field));});
test('draft free site publishes through existing publication service only',async()=>{const h=setup({id:'site-a',slug:'free-site',status:'draft',is_public:false});await h.run();assert.deepEqual(h.calls,[{id:'site-a',published:true}]);assert.equal(h.updates[0].is_public,true);assert.equal(h.updates[0].slug,'free-site');assert.equal(h.toasts[0],'Subdomain gratis diterbitkan');assert.equal(h.states.at(-1),'');});
test('active free site keeps the Jadikan draf behavior',async()=>{const h=setup({id:'site-a',status:'active',is_public:true});await h.run();assert.deepEqual(h.calls,[{id:'site-a',published:false}]);assert.equal(h.updates[0].is_public,false);assert.equal(h.toasts[0],'Situs kembali menjadi draf');});
test('busy or missing site does not change publication',async()=>{for(const [site,busy] of [[null,''],[{id:'site-a'},'register']]){const h=setup(site,busy);await h.run();assert.equal(h.calls.length,0);}});
test('publication storage failure is not shown as success',async()=>{const h=setup({id:'site-a',status:'draft',is_public:false},'',()=>{throw Error('mock storage unavailable');});await h.run();assert.equal(h.updates.length,0);assert.equal(h.toasts.length,0);assert.equal(h.errors.at(-1),'mock storage unavailable');assert.equal(h.states.at(-1),'');assert.equal(h.context.mutationLock.current,false);});
test('free-preview link and current publication controls remain visible in source',()=>{for(const text of ['>Lihat situs</a>','?ngeblogging-free-preview=1','published ? "Aktif" : "Draf"','published ? "Jadikan draf" : "Terbitkan"','onClick={togglePublication}','disabled={Boolean(busy)}'])assert.ok(card.includes(text),text);});
test('publication deadline rejects a stalled service without a success toast',async()=>{const h=setup({id:'site-a',status:'draft',is_public:false},'',()=>new Promise(()=>{}));await h.run();assert.equal(h.updates.length,0);assert.equal(h.toasts.length,0);assert.match(h.errors.at(-1),/melewati batas waktu/);assert.equal(h.context.mutationLock.current,false);});
test('late publication response cannot update a different active site',async()=>{const h=setup({id:'site-a',status:'draft',is_public:false},'',context=>{context.siteRef.current='site-b';context.siteGeneration.current++;return {status:'active',is_public:true};});await h.run();assert.equal(h.calls.length,1);assert.equal(h.updates.length,0);assert.equal(h.toasts.length,0);});
test('same-tick double click cannot publish twice before state rerenders',async()=>{const h=setup({id:'site-a',status:'draft',is_public:false});await Promise.all([h.run(),h.run()]);assert.equal(h.calls.length,1);assert.equal(h.context.busy,'');assert.equal(h.context.mutationLock.current,false);});
