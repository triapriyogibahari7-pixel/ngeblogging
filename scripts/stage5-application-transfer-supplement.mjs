import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createIsolatedTransferRuntime} from '../server/domain-transfer-isolated-runtime.mjs';
import {createIsolatedPanelTransport} from '../src/lib/domain-transfer-panel-client.mjs';
import {createTransferController} from '../src/lib/domain-transfer-confirmation.mjs';
import {moveWithReadback} from '../src/lib/domain-transfer-completion.mjs';
import {classifyTransferSnapshot} from '../src/lib/domain-transfer-reconciliation.mjs';
export async function runApplicationTransferIntegration({db,actors}){
 assert.equal((await db.query('SELECT current_database() AS n')).rows[0].n,'stage5_auth_test');
 const A='00000000-0000-0000-0000-000000000001',B='00000000-0000-0000-0000-000000000002',D='00000000-0000-0000-0000-000000000103';
 const report={scope:'Actual confirmation controller/client and move/read handlers over loopback HTTP, with real local Auth/PostgREST and catalog-slice SQL; not React DOM, active Studio, hosted gateway or full production schema',tests:[],productionConnection:false,newSupabaseResource:false,browserOriginEmulated:true,rpcCalls:0,backendRequests:0};
 let origin,runtime;
 const server=createServer(async(incoming,outgoing)=>{
  try{const chunks=[];let length=0;for await(const chunk of incoming){length+=chunk.length;if(length>8192)throw Error('TEST_REQUEST_TOO_LARGE');chunks.push(chunk);}
   const method=incoming.method,request=new Request(origin+incoming.url,{method,headers:incoming.headers,...(!['GET','HEAD'].includes(method)?{body:Buffer.concat(chunks)}:{})});
   const response=await runtime(request),body=Buffer.from(await response.arrayBuffer());outgoing.writeHead(response.status,Object.fromEntries(response.headers));outgoing.end(method==='HEAD'?undefined:body);
  }catch{outgoing.writeHead(500,{'content-type':'application/json','cache-control':'no-store'});outgoing.end('{"code":"ISOLATED_HTTP_FAILURE"}');}
 });
 const storage='http://127.0.0.1:54321';
 const backend=async(input,init={})=>{
  const url=new URL(input);assert.equal(url.origin,storage);
  const auth=url.pathname==='/auth/v1/user',rpc=url.pathname==='/rest/v1/rpc/move_site_domain_v2',read=['/rest/v1/sites','/rest/v1/site_members','/rest/v1/site_domains'].includes(url.pathname);
  assert.ok(auth&&init.method==='GET'||rpc&&init.method==='POST'||read&&init.method==='GET','APPLICATION_BACKEND_ROUTE_FORBIDDEN');
  report.backendRequests++;if(rpc)report.rpcCalls++;
  const headers=new Headers(init.headers);headers.delete('host');headers.delete('apikey');
  const target=(auth?'http://127.0.0.1:59999/user':'http://127.0.0.1:53000'+url.pathname.slice('/rest/v1'.length))+url.search;
  return fetch(target,{...init,headers,redirect:'error',cache:'no-store'});
 };
 const forward={domainId:D,sourceSiteId:A,targetSiteId:B},reverse={domainId:D,sourceSiteId:B,targetSiteId:A};
 const args=context=>({p_domain_id:D,p_source_site_id:context.sourceSiteId,p_target_site_id:context.targetSiteId,p_confirm_hostname:'example.test'});
 const test=async(name,fn)=>{await fn();report.tests.push({name,passed:true});};
 try{
  await new Promise((done,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',done);});origin='http://127.0.0.1:'+server.address().port;
  runtime=createIsolatedTransferRuntime({enabled:true,environment:'isolated-test',allowedOrigin:origin,databaseUrl:storage,approvedDatabaseOrigin:storage,publishableKey:'sb_publishable_local_test_gateway',fetchImpl:backend,requestId:()=> 'isolated-application-transfer'});
  const transport=async(input,init={})=>{assert.equal(new URL(input).origin,origin);const headers=new Headers(init.headers);if(init.method==='POST')headers.set('origin',origin);return fetch(input,{...init,headers});};
  const client=createIsolatedPanelTransport({enabled:true,environment:'isolated-test',origin,approvedTestOrigin:origin,getToken:async()=>actors.a.token,isCurrent:()=>true,fetchImpl:transport});
  const stateUrl=context=>{const url=new URL('/api/domains/move-state',origin);url.search=new URLSearchParams(context);return url;};
  const rawMove=(context,headers={},patch={})=>fetch(origin+'/api/domains/move',{method:'POST',headers:{origin,authorization:'Bearer '+actors.a.token,'content-type':'application/json',...headers},body:JSON.stringify({...args(context),...patch}),redirect:'error',signal:AbortSignal.timeout(10000)});
  const input=snapshot=>({userId:actors.a.id,domain:snapshot.domain,source:snapshot.sourceSite,target:snapshot.targetSite,targetDomains:snapshot.targetDomains,targetLoaded:snapshot.targetLoaded,confirmation:'example.test'});
  await test('owner reads already transferred state through actual application HTTP',async()=>{const s=await client.loadState(forward);assert.equal(s.domain.site_id,B);assert.equal(s.sourceRole,'owner');assert.equal(s.targetRole,'owner');assert.equal(report.rpcCalls,0);});
  await test('unsigned application state request is rejected before backend',async()=>{const before=report.backendRequests,r=await fetch(stateUrl(forward));assert.equal(r.status,401);assert.equal(r.headers.get('cache-control'),'no-store');assert.equal(report.backendRequests,before);});
  await test('unrelated signed Auth user cannot read owner transfer state',async()=>{const r=await fetch(stateUrl(forward),{headers:{authorization:'Bearer '+actors.b.token}});assert.equal(r.status,404);assert.equal((await r.json()).snapshot,undefined);assert.equal(report.rpcCalls,0);});
  await test('wrong Origin cannot reach storage or mutation',async()=>{const before=report.backendRequests,r=await rawMove(reverse,{origin:'https://outside.test'});assert.equal(r.status,403);assert.equal(report.backendRequests,before);assert.equal(report.rpcCalls,0);});
  await test('controller duplicate submission sends one application move and auto-readback observes SQL commit',async()=>{
   const snapshot=await client.loadState(reverse),before=report.rpcCalls;let readback;
   const controller=createTransferController(request=>moveWithReadback(request,{move:request=>client.onMove(request),read:()=>{readback=client.loadState(reverse);return readback;},isCurrent:()=>true}));
   const pending=controller.submit(input(snapshot));await assert.rejects(controller.submit(input(snapshot)),/RELOAD_REQUIRED_OR_BUSY/);const receipt=await pending;assert.equal(receipt.status,'moved');assert.equal(receipt.providerCacheVerified,false);assert.equal(controller.phase,'moved');assert.equal(report.rpcCalls,before+1);assert.ok(readback);
   const observed=await readback;assert.equal(classifyTransferSnapshot(args(reverse),observed,actors.a.id).phase,'at_target');assert.equal((await db.query('SELECT site_id FROM public.site_domains WHERE id=$1',[D])).rows[0].site_id,A);
  });
  await test('lost HTTP response after real SQL commit reconciles by explicit read without replay',async()=>{
   const snapshot=await client.loadState(forward),before=report.rpcCalls;let dropped=false;
   const lostClient=createIsolatedPanelTransport({enabled:true,environment:'isolated-test',origin,approvedTestOrigin:origin,getToken:async()=>actors.a.token,isCurrent:()=>true,fetchImpl:async(url,init)=>{const r=await transport(url,init);if(init.method==='POST'&&r.status===200){dropped=true;await r.body?.cancel();throw Error('SIMULATED_RESPONSE_LOST_AFTER_SUCCESS');}return r;}});
   const controller=createTransferController(request=>lostClient.onMove(request));await assert.rejects(controller.submit(input(snapshot)),/TRANSFER_RECONCILIATION_REQUIRED/);assert.equal(dropped,true);assert.equal(controller.phase,'unknown');assert.equal(report.rpcCalls,before+1);await assert.rejects(controller.submit(input(snapshot)),/RELOAD_REQUIRED_OR_BUSY/);assert.equal(report.rpcCalls,before+1);
   const observed=await client.loadState(forward);assert.equal(classifyTransferSnapshot(args(forward),observed,actors.a.id).phase,'at_target');assert.equal((await db.query('SELECT site_id FROM public.site_domains WHERE id=$1',[D])).rows[0].site_id,B);
  });
  await test('wrong hostname is rejected by application handler before RPC',async()=>{const before=report.rpcCalls,r=await rawMove(reverse,{}, {p_confirm_hostname:'wrong.test'});assert.equal(r.status,400);const data=await r.json();assert.equal(data.code,'HOSTNAME_CONFIRMATION_MISMATCH');assert.equal(data.mutationAttempted,false);assert.equal(report.rpcCalls,before);});
  await test('stale source is rejected before another RPC and current state remains readable',async()=>{const before=report.rpcCalls,r=await rawMove(forward);assert.equal(r.status,409);const data=await r.json();assert.equal(data.code,'DOMAIN_SOURCE_CHANGED');assert.equal(data.mutationAttempted,false);assert.equal(report.rpcCalls,before);assert.equal((await client.loadState(forward)).domain.site_id,B);});
  assert.equal(report.tests.length,8);assert.equal(report.rpcCalls,2);report.passedCount=8;report.passed=true;
 }finally{if(server.listening){server.closeAllConnections();await new Promise((done,reject)=>server.close(error=>error?reject(error):done()));}report.httpServerStopped=!server.listening;}
 report.limits=['The application runtime is mounted only in a disposable Node HTTP test server, not active Worker routes','Node transport supplies the browser-like POST Origin header; not real browser same-origin/CORS proof','Real Auth-issued JWT and PostgREST/RLS use a catalog schema slice, not full production profile/signup/capacity integration','Modern publishable-key gateway is replaced by explicit loopback URL/header transport; no hosted Supabase gateway proof','Actual confirmation controller/client modules are used, but no React DOM or built Studio acceptance','No production database, DNS/provider/cache changes or release approval'];return report;
}
