import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createFreshOnlyTestResolver} from '../server/drafts/domain-transfer-fresh-only-test-resolver.mjs';
import {createPublicTenantLookup,createTenantHtmlBoundary} from '../server/drafts/domain-tenant-html-boundary.mjs';
const SETUP='cbcfe16210356d37a6bb25c732430f86eaa49cc3',SQL='323fce910fa37599f97aa3176acff85edfed5190';
export async function runAuthTransferIntegration({db,http,actors}){
 assert.equal((await db.query('SELECT current_database() AS n')).rows[0].n,'stage5_auth_test','DISPOSABLE_AUTH_DATABASE_REQUIRED');
 const report={scope:'Pinned catalog transfer slice with real Auth-issued JWT, PostgREST and RLS; guard uses anonymous real REST with URL/header adapter and fixture renderer; not full schema or deployed Worker',tests:[],productionConnection:false,authClaimShimUsed:false,providerCacheVerified:false,setupCommit:SETUP,sqlSourceCommit:SQL};
 const gitFile=(sha,path)=>execFileSync('git',['show',sha+':'+path],{encoding:'utf8',maxBuffer:4*1024*1024});
 const html=gitFile(SETUP,'tests/browser/domain-transfer-catalog-matrix.html');
 const matched=html.match(/<script type="module">([\s\S]*?)<\/script>/);assert.ok(matched);
 let code=matched[1];const imports=code.match(/^import\s+\{PGlite\}\s+from\s+['"][^'"]+['"];?/gm)||[];assert.equal(imports.length,1);code=code.replace(imports[0],'');
 const marker=" await check('audited enum labels exactly match the catalog lists'";assert.equal(code.split(marker).length,2);code=code.slice(0,code.indexOf(marker))+'\n}catch(error){throw error;}';
 let preservedClaims=false;
 const adapter={query:(text,values)=>db.query(text,values),exec:async text=>{
  if(text.includes('CREATE FUNCTION auth.uid()')){
   const replace=(from,to)=>{assert.equal(text.split(from).length,2,'AUTH_SETUP_ANCHOR');text=text.replace(from,to);};
   replace('CREATE ROLE anon NOLOGIN;','');replace('CREATE ROLE authenticated NOLOGIN;','');replace('CREATE SCHEMA auth;','');
   replace("CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS\n$$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;",'');preservedClaims=true;
  }
  assert.ok(!text.includes("set_config('request.jwt.claim.sub'"),'CLAIM_INJECTION_FORBIDDEN');return db.query(text);
 }};
 const allowed=new Set(['tests/sql/domain-transfer-v2-smoke.sql','docs/drafts/domain-redirect-rls-v2-prerequisite.sql','docs/drafts/domain-site-transfer-v2.sql','docs/drafts/domain-site-transfer-integrity-v2.sql']);
 const fakeFetch=async input=>{const root='https://raw.githubusercontent.com/triapriyogibahari7-pixel/ngeblogging/'+SQL+'/';assert.ok(input.startsWith(root));const p=input.slice(root.length);assert.ok(allowed.has(p));return new Response(gitFile(SQL,p));};
 const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
 await new AsyncFunction('PGlite','document','fetch',code)(function Existing(){return adapter;},{getElementById:()=>({dataset:{},textContent:''})},fakeFetch);
 assert.equal(preservedClaims,true);assert.ok((await db.query("SELECT pg_get_functiondef('auth.uid()'::regprocedure) AS body")).rows[0].body.includes('request.jwt.claims'));
 const {a:actor,b:other}=actors,A='00000000-0000-0000-0000-000000000001',B='00000000-0000-0000-0000-000000000002',D='00000000-0000-0000-0000-000000000103';
 await db.query('UPDATE public.sites SET owner_id=$1',[actor.id]);await db.query('UPDATE public.site_members SET user_id=$1',[actor.id]);
 await db.query('ALTER TABLE public.sites ADD CONSTRAINT auth_test_site_owner FOREIGN KEY(owner_id) REFERENCES auth.users(id);ALTER TABLE public.site_members ADD CONSTRAINT auth_test_member_user FOREIGN KEY(user_id) REFERENCES auth.users(id)');
 await db.query("NOTIFY pgrst,'reload schema'");
 const rest='http://127.0.0.1:53000';let ready=false;for(let i=0;i<60;i++){const r=await http(rest,'/sites?select=id');if(r.status===200&&r.payload?.length===2){ready=true;break;}await new Promise(r=>setTimeout(r,250));}assert.equal(ready,true,'REST_TRANSFER_SCHEMA_NOT_READY');
 const args={p_domain_id:D,p_source_site_id:A,p_target_site_id:B,p_confirm_hostname:'example.test'},rpc=(token,patch={})=>http(rest,'/rpc/move_site_domain_v2',{token,method:'POST',body:{...args,...patch}}),test=async(name,fn)=>{await fn();report.tests.push({name,passed:true});};
 const state=async()=>{const result={};for(const table of ['sites','site_members','site_domains','site_domain_redirects'])result[table]=(await db.query('SELECT jsonb_agg(to_jsonb(t)) AS rows FROM (SELECT * FROM public.'+table+' ORDER BY '+(table==='site_members'?'site_id,user_id':'id')+') t')).rows[0].rows;return result;};
 await test('unsigned RPC rejected',async()=>{assert.equal((await rpc()).status,401);});
 await test('tampered Auth JWT rejected at RPC',async()=>{const p=actor.token.split('.');p[2]=(p[2][0]==='A'?'B':'A')+p[2].slice(1);assert.equal((await rpc(p.join('.'))).status,401);});
 await test('unrelated real Auth user rejected',async()=>{const r=await rpc(other.token);assert.equal(r.status,403);assert.equal(r.payload.code,'42501');});
 await test('hostname confirmation rejected over REST',async()=>{const r=await rpc(actor.token,{p_confirm_hostname:'wrong.test'});assert.equal(r.status,400);assert.equal(r.payload.code,'22023');});
 await test('HTTP RPC failure rolls back domain, redirect and site mappings',async()=>{const before=await state();await db.query("CREATE FUNCTION private.auth_transfer_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'AUTH_TRANSFER_FORCED_FAILURE';END;$$;CREATE TRIGGER auth_transfer_fail BEFORE UPDATE ON public.site_domain_redirects FOR EACH ROW EXECUTE FUNCTION private.auth_transfer_fail()");try{const r=await rpc(actor.token);assert.equal(r.status,400);assert.equal(r.payload.code,'P0001');assert.deepEqual(await state(),before);}finally{await db.query('DROP TRIGGER auth_transfer_fail ON public.site_domain_redirects;DROP FUNCTION private.auth_transfer_fail()');}});
 await test('real signed owner JWT transfers domain via PostgREST',async()=>{const r=await rpc(actor.token);assert.equal(r.status,200);assert.equal(r.payload.status,'moved');assert.equal(r.payload.redirectsMoved,1);assert.equal(r.payload.providerCacheVerified,false);});
 await test('stale HTTP retry requires reload',async()=>{const before=await state(),r=await rpc(actor.token);assert.equal(r.payload.code,'40001');assert.equal(r.payload.message,'DOMAIN_SOURCE_CHANGED_RELOAD_STATE');assert.equal(r.status,500);assert.deepEqual(await state(),before);});
 await test('owner REST reads confirm mapping, metadata and managed-domain retention',async()=>{const d=await http(rest,'/site_domains?id=eq.'+D,{token:actor.token}),s=await http(rest,'/sites?order=id',{token:actor.token}),r=await http(rest,'/site_domain_redirects?domain_id=eq.'+D,{token:actor.token});assert.equal(d.status,200);assert.equal(d.payload[0].site_id,B);assert.equal(d.payload[0].ownership_verification.additional_hostnames[0].hostname,'www.example.test');assert.equal(s.payload[0].custom_domain,'source.ngeblogging.com');assert.equal(s.payload[1].custom_domain,'example.test');assert.equal(r.payload[0].site_id,B);const free=await db.query("SELECT count(*)::int AS n FROM public.site_domains WHERE hostname IN ('source.ngeblogging.com','target.ngeblogging.com')");assert.equal(free.rows[0].n,2);});
 const anonymousTransport=async(input,options={})=>{const u=new URL(input);assert.equal(u.origin,'https://storage.test');assert.equal(options.method||'GET','GET');assert.ok(u.pathname.startsWith('/rest/v1/'));const headers=new Headers(options.headers);headers.delete('authorization');headers.delete('apikey');return fetch(rest+u.pathname.slice('/rest/v1'.length)+u.search,{...options,headers,redirect:'error',signal:AbortSignal.timeout(10000)});};
 const lookup=createPublicTenantLookup({origin:'https://storage.test',key:'local-adapter-only',fetchImpl:anonymousTransport});
 const resolver=createFreshOnlyTestResolver({enabled:true,environment:'isolated-test',origin:'https://storage.test',fetchImpl:anonymousTransport,cache:{get(){throw Error('CACHE_FORBIDDEN');},set(){throw Error('CACHE_FORBIDDEN');}},namespace:'real-auth-transfer',timeoutMs:5000});
 let renders=0;const guard=createTenantHtmlBoundary({enabled:true,environment:'isolated-test',matchesTenantHtml:()=>true,resolveRedirect:resolver,resolveTenant:lookup,renderTenant:async(req,env,ctx,id)=>{renders++;assert.equal(id.siteId,B);return new Response('FIXTURE_RENDERER:'+id.siteId);}});
 await test('guard validates public target via real anonymous PostgREST',async()=>{const before=renders,r=await guard(new Request('https://example.test/'));assert.equal(r.status,200);assert.equal(renders,before+1);assert.equal(r.headers.get('cache-control'),'no-store');});
 await db.query('UPDATE public.sites SET is_public=false WHERE id=$1',[B]);
 for(const method of ['GET','HEAD'])await test('guard hides transferred private tenant over real RLS '+method,async()=>{const before=renders,r=await guard(new Request('https://example.test/',{method}));assert.equal(r.status,404);assert.equal(r.headers.get('cache-control'),'no-store');assert.equal(await r.text(),method==='HEAD'?'':'Not found');assert.equal(renders,before);const rows=await http(rest,'/site_domain_redirects?source_hostname=eq.go.example.test');assert.equal(rows.status,200);assert.deepEqual(rows.payload,[]);});
 await test('real backend permission failure is terminal 503, not shell',async()=>{await db.query('REVOKE SELECT ON public.site_domains FROM anon');try{const before=renders,r=await guard(new Request('https://example.test/'));assert.equal(r.status,503);assert.equal(r.headers.get('cache-control'),'no-store');assert.equal(renders,before);}finally{await db.query('GRANT SELECT ON public.site_domains TO anon');}});
 assert.equal(report.tests.length,12);report.passedCount=12;report.passed=true;report.ownerForeignKeysToRealAuthUsers=true;report.limits=['Selected catalog slice; profiles/signup/capacity and auto-managed-domain triggers are not all combined','Auth/PostgREST are real local services; URL/header adapter replaces gateway, not backend responses','Fixture HTML renderer; not eight-wrapper or native Worker end-to-end','Sequential tenant reads are not a consistent snapshot','No provider/cache/DNS/TLS propagation or release approval'];return report;
}
