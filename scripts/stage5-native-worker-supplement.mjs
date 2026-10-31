import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
export async function runNativeWorkerIntegration({db,actors}){
 assert.equal((await db.query('SELECT current_database() AS n')).rows[0].n,'stage5_auth_test');
 const workerSource=await readFile('scripts/stage5-native-worker-entry.mjs','utf8');
 const require=createRequire(resolve('package.json')),{Miniflare,Response:MFResponse}=require('miniflare');
 assert.equal(JSON.parse(await readFile('node_modules/miniflare/package.json','utf8')).version,'4.20260721.0');
 assert.equal(JSON.parse(await readFile('node_modules/workerd/package.json','utf8')).version,'1.20260721.1');
 const A='00000000-0000-0000-0000-000000000001',B='00000000-0000-0000-0000-000000000002',D='00000000-0000-0000-0000-000000000103',markerA='SOURCE_ONLY_'+A,markerB='TARGET_ONLY_'+B;
 const report={scope:'Native workerd test entry with real local Auth/PostgREST/RLS and database-backed controlled HTML; not active eight-wrapper entry or built client acceptance',tests:[],productionConnection:false,activeEntryChanged:false,miniflareVersion:'4.20260721.0',workerdVersion:'1.20260721.1',sourceBlobs:{},renderViewReads:0,backendReads:0};
 await db.query("CREATE TABLE public.tenant_content_probe(site_id uuid PRIMARY KEY REFERENCES public.sites(id),marker text NOT NULL);ALTER TABLE public.tenant_content_probe ENABLE ROW LEVEL SECURITY;GRANT SELECT ON public.tenant_content_probe TO anon;CREATE POLICY content_probe_public ON public.tenant_content_probe FOR SELECT TO anon USING(EXISTS(SELECT 1 FROM public.sites s WHERE s.id=tenant_content_probe.site_id AND s.status='active' AND s.is_public));CREATE VIEW public.tenant_render_probe WITH(security_invoker=true) AS SELECT d.site_id,d.hostname,c.marker FROM public.site_domains d JOIN public.sites s ON s.id=d.site_id JOIN public.tenant_content_probe c ON c.site_id=s.id WHERE d.status='active' AND s.status='active' AND s.is_public;GRANT SELECT ON public.tenant_render_probe TO anon");
 await db.query('INSERT INTO public.tenant_content_probe(site_id,marker) VALUES($1,$2),($3,$4)',[A,markerA,B,markerB]);await db.query("NOTIFY pgrst,'reload schema'");
 const rest='http://127.0.0.1:53000';let ready=false;for(let i=0;i<60;i++){const r=await fetch(rest+'/tenant_render_probe?select=site_id',{signal:AbortSignal.timeout(5000)});if(r.status===200){ready=true;break;}await new Promise(r=>setTimeout(r,250));}assert.equal(ready,true,'RENDER_VIEW_NOT_READY');
 const modules=[{type:'ESModule',path:resolve('scripts/stage5-native-worker-entry.mjs'),contents:workerSource}];
 for(const name of ['domain-tenant-html-boundary.mjs','domain-transfer-fresh-only-test-resolver.mjs','domain-transfer-redirect-pipeline.mjs','domain-transfer-redirect-lookup.mjs']){const path=resolve('server/drafts',name),bytes=await readFile(path);report.sourceBlobs[name]=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');modules.push({type:'ESModule',path,contents:bytes.toString('utf8')});}
 assert.equal(report.sourceBlobs['domain-tenant-html-boundary.mjs'],'7b1b673cf2ff6ffee8b29b755a3f819ee94efce1');
 let beforeContent=null,mf;
 const test=async(name,fn)=>{await fn();report.tests.push({name,passed:true});};
 try{
  mf=new Miniflare({host:'127.0.0.1',port:0,cf:false,modules,outboundService:()=>{throw Error('UNEXPECTED_OUTBOUND_NETWORK');},serviceBindings:{BACKEND:async request=>{
   const u=new URL(request.url);assert.equal(u.origin,'https://storage.test');const auth=u.pathname==='/auth/v1/user',rpc=u.pathname==='/rest/v1/rpc/move_site_domain_v2',read=['/rest/v1/sites','/rest/v1/site_domains','/rest/v1/site_domain_redirects','/rest/v1/tenant_render_probe'].includes(u.pathname);
   assert.ok((auth&&request.method==='GET')||(rpc&&request.method==='POST')||(read&&request.method==='GET'),'BACKEND_ROUTE_NOT_ALLOWED');
   report.backendReads++;if(u.pathname.endsWith('/tenant_render_probe')){report.renderViewReads++;if(beforeContent){const fn=beforeContent;beforeContent=null;await fn();}}
   const headers=new Headers(request.headers);headers.delete('host');headers.delete('apikey');if(read)headers.delete('authorization');
   const base=auth?'http://127.0.0.1:59999':rest,path=auth?'/user':u.pathname.slice('/rest/v1'.length);
   const response=await fetch(base+path+u.search,{method:request.method,headers,body:request.method==='POST'?await request.text():undefined,redirect:'error',signal:AbortSignal.timeout(10000)});
   return new MFResponse(await response.arrayBuffer(),{status:response.status,headers:Object.fromEntries(response.headers)});
  }}});
  await mf.ready;
  const call=(url='https://example.test/',options={})=>mf.dispatchFetch(url,options);
  await test('same-origin Worker Auth proxy validates real signed user',async()=>{const r=await call('https://example.test/auth/v1/user',{headers:{authorization:'Bearer '+actors.a.token}});assert.equal(r.status,200);assert.equal((await r.json()).id,actors.a.id);});
  const args={p_domain_id:D,p_source_site_id:A,p_target_site_id:B,p_confirm_hostname:'example.test'},rpc=token=>call('https://example.test/rest/v1/rpc/move_site_domain_v2',{method:'POST',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},body:JSON.stringify(args)});
  await test('same-origin unsigned transfer RPC is rejected',async()=>{assert.equal((await rpc()).status,401);});
  await test('same-origin stale transfer preserves exact reload contract',async()=>{const before=(await db.query('SELECT to_jsonb(d) AS row FROM public.site_domains d WHERE id=$1',[D])).rows[0].row,r=await rpc(actors.a.token),body=await r.json();assert.equal(r.status,500);assert.equal(body.code,'40001');assert.equal(body.message,'DOMAIN_SOURCE_CHANGED_RELOAD_STATE');assert.deepEqual((await db.query('SELECT to_jsonb(d) AS row FROM public.site_domains d WHERE id=$1',[D])).rows[0].row,before);});
  for(const method of ['GET','HEAD'])await test('native Worker hides private tenant without content lookup '+method,async()=>{const before=report.renderViewReads,r=await call(undefined,{method});assert.equal(r.status,404);assert.equal(r.headers.get('cache-control'),'no-store');assert.equal(await r.text(),method==='HEAD'?'':'Not found');assert.equal(report.renderViewReads,before);});
  await test('native Worker public source renders only source-owned content',async()=>{const r=await call('https://source.ngeblogging.com/'),body=await r.text();assert.equal(r.status,200);assert.ok(body.includes(markerA)&&!body.includes(markerB));});
  await db.query('UPDATE public.sites SET is_public=true WHERE id=$1',[B]);
  await test('native Worker transferred public host renders target content',async()=>{const r=await call(),body=await r.text();assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store');assert.ok(body.includes(markerB)&&!body.includes(markerA));});
  await test('request query and tenant header cannot switch rendered identity',async()=>{const r=await call('https://example.test/?siteId='+A,{headers:{'x-site-id':A,'x-tenant-site-id':A}}),body=await r.text();assert.equal(r.status,200);assert.ok(body.includes(markerB)&&!body.includes(markerA));});
  await test('visibility change before content read stops HTML response',async()=>{beforeContent=()=>db.query('UPDATE public.sites SET is_public=false WHERE id=$1',[B]);const r=await call(),body=await r.text();assert.equal(r.status,404);assert.ok(!body.includes(markerA)&&!body.includes(markerB));assert.equal(beforeContent,null);});
  await db.query('UPDATE public.sites SET is_public=true WHERE id=$1',[B]);
  await db.query('REVOKE SELECT ON public.site_domains FROM anon');
  try{
   await test('native Worker backend permission failure is terminal 503',async()=>{const before=report.renderViewReads,r=await call();assert.equal(r.status,503);assert.equal(r.headers.get('cache-control'),'no-store');assert.equal(await r.text(),'Service unavailable');assert.equal(report.renderViewReads,before);});
   await test('shared JavaScript bypass does not return HTML or query backend',async()=>{const before=report.backendReads,r=await call('https://example.test/__shared.js');assert.equal(r.status,200);assert.equal(r.headers.get('content-type'),'application/javascript');assert.equal(await r.text(),'export const shared=true;');assert.equal(report.backendReads,before);});
  }finally{await db.query('GRANT SELECT ON public.site_domains TO anon');}
  await test('unexposed same-origin REST route stays closed',async()=>{const before=report.backendReads,r=await call('https://example.test/rest/v1/sites');assert.equal(r.status,404);assert.equal(report.backendReads,before);});
  assert.equal(report.tests.length,12);report.passed=true;report.passedCount=12;
 }finally{if(mf){await mf.dispose();report.workerdDisposed=true;}}
 report.limits=['Standalone isolated native Worker entry, not production wrapper chain or built Studio client','Controlled database-backed renderer and test-only view; not production content schema','Same-origin test gateway uses a loopback transport adapter, not hosted Supabase gateway','No general snapshot consistency proof; only one controlled visibility transition tested','No provider, edge cache eviction, DNS/TLS or release approval'];return report;
}
