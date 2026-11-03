import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {publicAuditContext,readPublicAuditPayload} from '../src/lib/domain-public-audit-view.mjs';
const source=await readFile(new URL('../src/DomainPublicAudit.jsx',import.meta.url),'utf8');
const start=source.indexOf(' async function runAudit(){'),end=source.indexOf('\n const shown=',start);
assert.ok(start>=0&&end>start);
const code=source.slice(start,end).replace('async function runAudit()','globalThis.runAudit=async function runAudit()');
const site={id:'site-a',slug:'fixture',status:'active',is_public:true};
const payload=()=>({site:{id:'site-a'},auditRelease:'public-audit-status-v1-20261103',checkedAt:'2026-11-03T02:00:00Z',results:[{address:'fixture.ngeblogging.com',auditStatus:'passed',reachable:true,https:true,httpStatus:200,latencyMs:2,check:'fixture',contentType:'text/html',connectionStatus:'published'}]});
function setup(options={}){
 const calls=[],results=[],notices=[],states=[],context=publicAuditContext(site,[]);let verifications=0,c;
 c=vm.createContext({site,context,scope:context.scope,scopeRef:{current:context.scope},active:{current:null},disabled:!!options.disabled,AbortController,setTimeout,clearTimeout,JSON,Error,readPublicAuditPayload,setBusy:v=>states.push(v),setNotice:v=>notices.push(v),setResult:v=>results.push(v),getVerifiedSession:async()=>{verifications++;return {verification:'verified',user:{id:options.changeAccount&&verifications>1?'other':'owner'},session:{access_token:'fixture-token'}};},fetch:async(path,init)=>{calls.push({path,init});if(options.error)throw Error('fixture outage');if(options.changeScope)c.scopeRef.current='new-scope';const p=payload();if(options.foreign)p.site.id='site-b';return options.html?new Response('not JSON',{headers:{'content-type':'text/html'}}):Response.json(p);}});
 vm.runInContext(code,c);return {c,calls,results,notices,states,run:()=>c.runAudit()};
}
test('extracted audit controller calls only the read-only audit operation',async()=>{const f=setup();await f.run();assert.equal(f.calls.length,1);assert.equal(f.calls[0].path,'/api/domains/audit');assert.deepEqual(JSON.parse(f.calls[0].init.body),{siteId:'site-a'});assert.equal(f.results.at(-1).audit.allReachable,true);assert.equal(f.c.active.current,null);});
test('disabled audit makes no request',async()=>{const f=setup({disabled:true});await f.run();assert.equal(f.calls.length,0);});
test('context changes suppress stale results',async()=>{const f=setup({changeScope:true});await f.run();assert.equal(f.results.filter(Boolean).length,0);});
test('account changes suppress audit result',async()=>{const f=setup({changeAccount:true});await f.run();assert.equal(f.results.filter(Boolean).length,0);assert.match(f.notices.at(-1),/Sesi akun berubah/);});
test('foreign site payload is rejected',async()=>{const f=setup({foreign:true});await f.run();assert.equal(f.results.filter(Boolean).length,0);assert.match(f.notices.at(-1),/situs aktif/);});
test('non JSON server response is not called successful',async()=>{const f=setup({html:true});await f.run();assert.equal(f.results.filter(Boolean).length,0);assert.match(f.notices.at(-1),/belum dapat diverifikasi/);});
test('audit errors do not mutate domain configuration or report a disconnection',async()=>{const f=setup({error:true});await f.run();assert.equal(f.calls.length,1);assert.equal(f.results.filter(Boolean).length,0);assert.match(f.notices.at(-1),/Status koneksi domain tidak diubah/);assert.equal(f.states.at(-1),false);});
