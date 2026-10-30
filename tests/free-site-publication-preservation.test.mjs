import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
const source=await readFile(new URL('../src/DomainPanelV124.jsx',import.meta.url),'utf8');
const start=source.indexOf('  const togglePublication = async () => {'),end=source.indexOf('  const runAudit = async () => {',start);
assert.ok(start>=0&&end>start);
const publication=source.slice(start,end);
const cardStart=source.indexOf('<section className="sv124-card sv124-free-domain">'),cardEnd=source.indexOf('</section>',cardStart);
assert.ok(cardStart>=0&&cardEnd>cardStart);
const card=source.slice(cardStart,cardEnd+'</section>'.length);
function setup(site,busy='',fail=false){const calls=[],updates=[],errors=[],states=[],toasts=[];const context=vm.createContext({site,busy,setBusy:value=>states.push(value),setError:value=>errors.push(value),setToast:value=>toasts.push(value),onSiteUpdate:value=>updates.push(value),setSitePublication:async(id,published)=>{calls.push({id,published});if(fail)throw Error('mock storage unavailable');return {status:published?'active':'draft',is_public:published};}});vm.runInContext(publication.replace('const togglePublication =','globalThis.togglePublication ='),context);return {calls,updates,errors,states,toasts,run:()=>context.togglePublication()};}
test('free publication handler and card match the reviewed unchanged baseline',()=>{const normalized=(publication+card).replace(/\s+/g,' ').trim();assert.equal(createHash('sha256').update(normalized).digest('hex'),'a39418b51c0e950476a670696790e9ca92c113cfc60506d3931831a667ce42ba');});
test('draft free site publishes through existing publication service only',async()=>{const h=setup({id:'site-a',slug:'free-site',status:'draft',is_public:false});await h.run();assert.deepEqual(h.calls,[{id:'site-a',published:true}]);assert.equal(h.updates[0].is_public,true);assert.equal(h.toasts[0],'Subdomain gratis diterbitkan');assert.equal(h.states.at(-1),'');});
test('active free site keeps the Jadikan draf behavior',async()=>{const h=setup({id:'site-a',status:'active',is_public:true});await h.run();assert.deepEqual(h.calls,[{id:'site-a',published:false}]);assert.equal(h.updates[0].is_public,false);assert.equal(h.toasts[0],'Situs kembali menjadi draf');});
test('busy or missing site does not change publication',async()=>{for(const [site,busy] of [[null,''],[{id:'site-a'},'register']]){const h=setup(site,busy);await h.run();assert.equal(h.calls.length,0);}});
test('publication storage failure is not shown as success',async()=>{const h=setup({id:'site-a',status:'draft',is_public:false},'',true);await h.run();assert.equal(h.updates.length,0);assert.equal(h.toasts.length,0);assert.equal(h.errors.at(-1),'mock storage unavailable');assert.equal(h.states.at(-1),'');});
test('Buka, Aktif/Draf and the free-preview link remain in the card',()=>{for(const text of ['>Buka</a>','?ngeblogging-free-preview=1','published ? "Aktif" : "Draf"','published ? "Jadikan draf" : "Terbitkan"','onClick={togglePublication}'])assert.ok(card.includes(text),text);});
