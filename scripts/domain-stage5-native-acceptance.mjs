import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
const {Client}=createRequire(import.meta.url)('pg');
assert.equal(process.env.STAGE5_DISPOSABLE_NATIVE,'true','DISPOSABLE_NATIVE_OPT_IN_REQUIRED');
assert.equal(process.env.PGHOST,'127.0.0.1','LOOPBACK_REQUIRED');
assert.equal(process.env.PGPORT,'5432','FIXED_TEST_PORT_REQUIRED');
assert.equal(process.env.PGDATABASE,'domain_transfer_test','TEST_DATABASE_REQUIRED');
assert.equal(process.env.PGUSER,'postgres','TEST_USER_REQUIRED');
assert.equal(process.env.PGPASSWORD,'isolated-ci-only','FIXTURE_PASSWORD_REQUIRED');
const config={host:'127.0.0.1',port:5432,database:'domain_transfer_test',user:'postgres',password:'isolated-ci-only',connectionTimeoutMillis:5000};
const SETUP='cbcfe16210356d37a6bb25c732430f86eaa49cc3',SQL='323fce910fa37599f97aa3176acff85edfed5190',ROOT='https://raw.githubusercontent.com/triapriyogibahari7-pixel/ngeblogging/';
const inputs=new Set(['tests/sql/domain-transfer-v2-smoke.sql','docs/drafts/domain-redirect-rls-v2-prerequisite.sql','docs/drafts/domain-site-transfer-v2.sql','docs/drafts/domain-site-transfer-integrity-v2.sql']);
const gitFile=(sha,path)=>execFileSync('git',['show',sha+':'+path],{encoding:'utf8',maxBuffer:4*1024*1024});
const report={date:new Date().toISOString(),execution:'Native PostgreSQL 17 in disposable CI service, not PGlite/WASM',setupCommit:SETUP,sqlSourceCommit:SQL,tests:[],productionConnection:false,newSupabaseResource:false,authMode:'auth.uid fixture claim shim; not Supabase Auth/PostgREST',nativeSessionsClosed:false};
const html=gitFile(SETUP,'tests/browser/domain-transfer-catalog-matrix.html'),match=html.match(/<script type="module">([\s\S]*?)<\/script>/);assert.ok(match,'CATALOG_MODULE_REQUIRED');
let catalog=match[1];const imports=catalog.match(/^import\s+\{PGlite\}\s+from\s+['"][^'"]+['"];?/gm)||[];assert.equal(imports.length,1,'SINGLE_PGLITE_IMPORT_REQUIRED');catalog=catalog.replace(imports[0],'');
const fakeFetch=async input=>{assert.ok(input.startsWith(ROOT+SQL+'/'),'PINNED_SQL_SOURCE_REQUIRED');const path=input.slice((ROOT+SQL+'/').length);assert.ok(inputs.has(path),'UNEXPECTED_SQL_INPUT');return new Response(gitFile(SQL,path));};
const open=new Set();
async function connect(name){const client=new Client({...config,application_name:name});await client.connect();open.add(client);return client;}
async function close(client){if(!client)return;open.delete(client);await client.end();}
class NativeCatalogDatabase{
  constructor(){this.ready=connect('stage5-native-catalog').then(client=>(this.client=client));}
  async query(text,values){await this.ready;return this.client.query(text,values);}
  async exec(text){await this.ready;return this.client.query(text);}
  async close(){await this.ready;await close(this.client);}
}
const output={dataset:{},textContent:''},document={getElementById:()=>output,querySelectorAll:()=>[]};
let admin;
const tables=['sites','site_members','site_domains','site_domain_redirects'];
const A='00000000-0000-0000-0000-000000000001',B='00000000-0000-0000-0000-000000000002',D='00000000-0000-0000-0000-000000000103',U='00000000-0000-0000-0000-000000000010';
const MOVE='SELECT public.move_site_domain_v2($1::uuid,$2::uuid,$3::uuid,$4::text) AS receipt',args=[D,A,B,'example.test'];
const REGISTER="INSERT INTO public.site_domains(id,site_id,hostname,status,provider,is_primary) VALUES('00000000-0000-0000-0000-000000000104',$1::uuid,'registration-race.test','pending','cloudflare-full-zone',false)";
async function snapshot(){const data={};for(const table of tables){const order=table==='site_members'?'site_id,user_id':'id';data[table]=(await admin.query(`SELECT jsonb_agg(to_jsonb(t)) AS rows FROM (SELECT * FROM public.${table} ORDER BY ${order}) t`)).rows[0].rows||[];}return data;}
let baseline;
async function reset(){await admin.query('BEGIN; TRUNCATE public.site_domain_redirects,public.site_domains,public.site_members,public.sites CASCADE;');try{for(const table of tables)await admin.query(`INSERT INTO public.${table} SELECT * FROM jsonb_populate_recordset(NULL::public.${table},$1::jsonb)`,[JSON.stringify(baseline[table])]);await admin.query('SET CONSTRAINTS ALL IMMEDIATE; COMMIT;');}catch(e){await admin.query('ROLLBACK;');throw e;}}
async function actor(client){await client.query("BEGIN; SET LOCAL statement_timeout='12s'; SET LOCAL lock_timeout='5s'; SET LOCAL ROLE authenticated;");await client.query("SELECT set_config('request.jwt.claim.sub',$1,true)",[U]);}
async function invariants(){const s=await snapshot(),counts=new Map();for(const d of s.site_domains){if(d.hostname!=='ngeblogging.com'&&!d.hostname.endsWith('.ngeblogging.com'))counts.set(d.site_id,(counts.get(d.site_id)||0)+1);}assert.ok([...counts.values()].every(n=>n<=1),'CUSTOM_SLOT_DUPLICATED');for(const site of s.sites){const primary=s.site_domains.filter(d=>d.site_id===site.id&&d.is_primary);assert.equal(primary.length,1,'PRIMARY_COUNT');assert.equal(primary[0].status,'active');assert.equal(site.custom_domain,primary[0].hostname,'SITE_MAPPING');assert.ok(s.site_domains.some(d=>d.site_id===site.id&&d.hostname===site.slug+'.ngeblogging.com'),'FREE_DOMAIN_LOST');}for(const r of s.site_domain_redirects)assert.equal(r.site_id,s.site_domains.find(d=>d.id===r.domain_id)?.site_id,'REDIRECT_MAPPING');return s;}
async function race(name,first,second,expectedCode,winner){
  await reset();let one,two,pending,settled=false;
  try{
    one=await connect('stage5-race-first');two=await connect('stage5-race-second');const pid1=(await one.query('SELECT pg_backend_pid() AS pid')).rows[0].pid,pid2=(await two.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;assert.notEqual(pid1,pid2);
    await actor(one);await first(one);await actor(two);
    pending=(async()=>{try{await second(two);await two.query('SET CONSTRAINTS ALL IMMEDIATE; COMMIT;');return {ok:true};}catch(e){await two.query('ROLLBACK;');return {ok:false,code:e.code};}finally{settled=true;}})();
    let lock;
    for(let i=0;i<60;i++){lock=(await admin.query('SELECT wait_event_type,wait_event FROM pg_stat_activity WHERE pid=$1',[pid2])).rows[0];if(lock?.wait_event_type==='Lock')break;assert.equal(settled,false,'SECOND_SESSION_DID_NOT_CONTEND');await new Promise(r=>setTimeout(r,10));}
    assert.equal(lock?.wait_event_type,'Lock','NATIVE_LOCK_WAIT_NOT_OBSERVED');
    await one.query('SET CONSTRAINTS ALL IMMEDIATE; COMMIT;');const result=await pending;assert.equal(result.ok,false,'BOTH_OPERATIONS_COMMITTED');assert.equal(result.code,expectedCode,'UNEXPECTED_LOSER_CONFLICT');
    const state=await invariants(),domain=state.site_domains.find(d=>d.id===D),registration=state.site_domains.find(d=>d.hostname==='registration-race.test');
    if(winner==='move'){assert.equal(domain.site_id,B);assert.equal(registration,undefined);}else{assert.equal(domain.site_id,A);assert.equal(registration?.site_id,B);assert.equal(registration.status,'pending');}
    report.tests.push({name,passed:true,nativeBackendPids:[pid1,pid2],secondSessionLockWait:lock,loserSqlstate:result.code});
  }catch(e){report.tests.push({name,passed:false,error:e.message,code:e.code});throw e;}
  finally{if(one)await one.query('ROLLBACK').catch(()=>{});if(pending)await pending.catch(()=>{});if(two)await two.query('ROLLBACK').catch(()=>{});await close(one);await close(two);}
}
try{
  admin=await connect('stage5-native-observer');const engine=(await admin.query("SELECT version() AS version,current_database() AS name,current_setting('server_version_num')::int AS num")).rows[0];assert.equal(engine.name,'domain_transfer_test');assert.ok(engine.num>=170000&&engine.num<180000,'NATIVE_PG17_REQUIRED');report.engine=engine;
  const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
  await new AsyncFunction('PGlite','document','fetch',catalog)(NativeCatalogDatabase,document,fakeFetch);
  assert.equal(output.dataset.done,'true','CATALOG_DID_NOT_COMPLETE');const observed=JSON.parse(output.textContent);report.catalog={...observed,originalRunnerScope:observed.scope,scope:'Original catalog assertions against native PostgreSQL via pg client API shim; only driver, document sink and pinned local source reader adapted'};assert.equal(observed.passed,true,JSON.stringify(observed.error||observed.tests.filter(t=>!t.passed)));assert.equal(observed.passedCount,33);assert.equal(observed.failedCount,0);
  baseline=await snapshot();
  await race('two concurrent moves: one commit, stale competitor reloads',c=>c.query(MOVE,args),c=>c.query(MOVE,args),'40001','move');
  await race('move holds slot: concurrent registration rejects duplicate',c=>c.query(MOVE,args),c=>c.query(REGISTER,[B]),'23505','move');
  await race('registration holds slot: concurrent move rolls back',c=>c.query(REGISTER,[B]),c=>c.query(MOVE,args),'23505','registration');
  report.passed=report.tests.length===3&&report.tests.every(t=>t.passed);report.nativeConcurrencyPassed=report.tests.filter(t=>t.passed).length;
}catch(e){report.passed=false;report.error={message:e.message,code:e.code,stack:e.stack};process.exitCode=1;}
finally{
  for(const client of [...open])await close(client).catch(()=>{});report.nativeSessionsClosed=open.size===0;report.limits=['Catalog-aligned schema slice, not complete production tables/signup/profile constraints','Real PostgreSQL sessions and observed table/index lock waits, but fixture auth.uid claim injection, not Supabase Auth/PostgREST','Registration race uses authenticated direct INSERT, not registration HTTP/provider orchestration','Conservative RPC table serialization is not production throughput/lock-scope approval','No native Worker, browser UI, alias/provider/cache propagation, DNS/TLS or deployed end-to-end proof'];report.stage4='OPEN';report.stage5='OPEN';report.releaseHold='No merge or production activation before stage 10 completion, verification and separate owner release approval';
  await mkdir('output/stage5-native',{recursive:true});await writeFile('output/stage5-native/result.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}
