import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import {mkdtemp,mkdir,rm,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {createIsolatedTransferRuntime} from '../server/domain-transfer-isolated-runtime.mjs';
import {command} from './stage5-cloudflare-native-build.mjs';

export async function runBrowserTransferIntegration({db,actors}){
 assert.equal((await db.query('SELECT current_database() AS n')).rows[0].n,'stage5_auth_test');
 const A='00000000-0000-0000-0000-000000000001',B='00000000-0000-0000-0000-000000000002',D='00000000-0000-0000-0000-000000000103';
 const report={scope:'Real Chromium and actual React transfer flow/client over same-origin loopback HTTP with real local Auth/PostgREST; catalog schema slice, not full Studio/full schema or hosted gateway',tests:[],productionConnection:false,newSupabaseResource:false,rpcCalls:0,backendRequests:0,sqlCommitsObserved:0};
 const work=await mkdtemp('/tmp/ngeblogging-browser-'),deps=join(work,'deps');
 const clean={PATH:process.env.PATH,HOME:work,TMPDIR:work,LANG:'C.UTF-8',CI:'true'};
 let origin,runtime,bundle,browser,page,mode='normal';
 const json=(out,data,status=200)=>{out.writeHead(status,{'content-type':'application/json','cache-control':'no-store'});out.end(JSON.stringify(data));};
 const context=async()=>{const id=(await db.query('SELECT site_id FROM public.site_domains WHERE id=$1',[D])).rows[0]?.site_id;assert.ok([A,B].includes(id));return {domainId:D,sourceSiteId:id,targetSiteId:id===A?B:A};};
 const storage='http://127.0.0.1:54321';
 const backend=async(input,init={})=>{
  const url=new URL(input);assert.equal(url.origin,storage);
  const auth=url.pathname==='/auth/v1/user',rpc=url.pathname==='/rest/v1/rpc/move_site_domain_v2',read=['/rest/v1/sites','/rest/v1/site_members','/rest/v1/site_domains'].includes(url.pathname);
  assert.ok(auth&&init.method==='GET'||rpc&&init.method==='POST'||read&&init.method==='GET','BROWSER_BACKEND_ROUTE_FORBIDDEN');
  report.backendRequests++;if(rpc)report.rpcCalls++;
  const headers=new Headers(init.headers);headers.delete('host');headers.delete('apikey');
  return fetch((auth?'http://127.0.0.1:59999/user':'http://127.0.0.1:53000'+url.pathname.slice('/rest/v1'.length))+url.search,{...init,headers,redirect:'error',cache:'no-store'});
 };
 const server=createServer(async(incoming,outgoing)=>{
  try{
   const url=new URL(incoming.url,origin);
   if(incoming.method==='GET'&&url.pathname==='/'){outgoing.writeHead(200,{'content-type':'text/html','cache-control':'no-store','content-security-policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:"});outgoing.end('<!doctype html><html lang="id"><meta charset="utf-8"><title>Stage 5 Browser Test</title><style>body{font:16px system-ui;background:#eff6ff;color:#16345e;padding:28px}dialog{border:1px solid #bfd3f6;border-radius:14px;max-width:680px}button,input,select{font:inherit;padding:10px;margin:8px}button{background:#1256d8;color:white;border:0;border-radius:7px}button:disabled{opacity:.4}label{display:block}h1,h2{color:#1256d8}</style><h1>Uji integrasi dialog domain</h1><div id="app"></div><script src="/app.js" defer></script></html>');return;}
   if(incoming.method==='GET'&&url.pathname==='/app.js'){outgoing.writeHead(200,{'content-type':'application/javascript','cache-control':'no-store'});outgoing.end(bundle);return;}
   if(incoming.method==='GET'&&url.pathname==='/bootstrap'){json(outgoing,{token:actors.a.token,userId:actors.a.id,context:await context(),mode});return;}
   if(!['/api/domains/move','/api/domains/move-state'].includes(url.pathname)){json(outgoing,{code:'NOT_FOUND'},404);return;}
   const chunks=[];let size=0;for await(const chunk of incoming){size+=chunk.length;assert.ok(size<=8192,'BROWSER_REQUEST_TOO_LARGE');chunks.push(chunk);}
   const request=new Request(url,{method:incoming.method,headers:incoming.headers,...(!['GET','HEAD'].includes(incoming.method)?{body:Buffer.concat(chunks)}:{})});
   const response=await runtime(request),bytes=Buffer.from(await response.arrayBuffer());
   if(mode==='lost'&&incoming.method==='POST'&&url.pathname==='/api/domains/move'&&response.status===200){outgoing.destroy();return;}
   outgoing.writeHead(response.status,Object.fromEntries(response.headers));outgoing.end(incoming.method==='HEAD'?undefined:bytes);
  }catch{if(!outgoing.headersSent)json(outgoing,{code:'BROWSER_TEST_SERVER_FAILURE'},500);else outgoing.destroy();}
 });
 const test=async(name,fn)=>{await fn();report.tests.push({name,passed:true});};
 try{
  await mkdir(deps);await writeFile(join(deps,'package.json'),JSON.stringify({private:true,dependencies:{esbuild:'0.25.0','playwright-core':'1.49.1','@sparticuz/chromium':'131.0.1'}}));
  await command('npm',['install','--prefix',deps,'--ignore-scripts','--no-package-lock','--no-audit','--no-fund','--registry=https://registry.npmjs.org'],{cwd:deps,env:{...clean,HOME:process.env.HOME||clean.HOME}});
  const require=createRequire(join(deps,'package.json')),esbuild=require('esbuild'),chromium=require('@sparticuz/chromium'),{chromium:playwright}=require('playwright-core');
  const entry=`import React from 'react';import {createRoot} from 'react-dom/client';
import Flow from ${JSON.stringify(resolve('src/DomainTransferFlow.jsx'))};
import {createIsolatedPanelTransport} from ${JSON.stringify(resolve('src/lib/domain-transfer-panel-client.mjs'))};
(async()=>{const b=await fetch('/bootstrap',{cache:'no-store'}).then(r=>r.json());
const client=createIsolatedPanelTransport({enabled:true,environment:'isolated-test',origin:location.origin,approvedTestOrigin:location.origin,getToken:async()=>b.token,isCurrent:()=>true});
const snapshot=await client.loadState(b.context);const targetStates={[b.context.targetSiteId]:{loaded:b.mode!=='unloaded',domains:snapshot.targetDomains}};
createRoot(document.getElementById('app')).render(React.createElement(Flow,{source:snapshot.sourceSite,domain:snapshot.domain,sites:[snapshot.sourceSite,snapshot.targetSite],userId:b.userId,sessionKey:'real-local-auth',snapshotKey:'initial',targetStates,enabled:true,onMove:client.onMove,loadState:client.loadState,onReconciled:data=>{window.__observedPhase=data.phase;},onClose:()=>{document.getElementById('app').textContent='Ditutup';}}));window.__browserReady=true;
})().catch(e=>{window.__bootFailure=e.code||e.name;document.getElementById('app').textContent='BOOT_FAILED';});`;
  const built=await esbuild.build({stdin:{contents:entry,resolveDir:process.cwd(),loader:'js'},bundle:true,write:false,format:'iife',platform:'browser',target:'es2022',nodePaths:[resolve('node_modules')],logLevel:'silent'});bundle=built.outputFiles[0].text;
  await new Promise((done,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',done);});origin='http://127.0.0.1:'+server.address().port;
  runtime=createIsolatedTransferRuntime({enabled:true,environment:'isolated-test',allowedOrigin:origin,databaseUrl:storage,approvedDatabaseOrigin:storage,publishableKey:'sb_publishable_local_test_gateway',fetchImpl:backend,requestId:()=> 'browser-transfer-test'});
  const executablePath=await chromium.executablePath();
  browser=await playwright.launch({executablePath,args:chromium.args.filter(a=>!/(disable-web-security|disable-site-isolation|IsolateOrigins)/.test(a)),headless:true,env:{...clean,LD_LIBRARY_PATH:process.env.LD_LIBRARY_PATH||'',FONTCONFIG_PATH:process.env.FONTCONFIG_PATH||''}});
  report.browserVersion=browser.version();report.browserWebSecurityDisabled=false;
  const browserContext=await browser.newContext({viewport:{width:1280,height:900}});
  await browserContext.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  page=await browserContext.newPage();page.setDefaultTimeout(15000);
  const open=async next=>{mode=next;await page.goto(origin,{waitUntil:'networkidle'});await page.locator('dialog[open], #app:has-text("BOOT_FAILED")').first().waitFor();assert.equal(await page.evaluate(()=>window.__bootFailure),undefined,'BROWSER_BOOT_FAILED');await page.locator('dialog[open]').waitFor();return context();};
  const stateAs=async(token,ctx)=>page.evaluate(async({token,ctx})=>{const url=new URL('/api/domains/move-state',location.origin);url.search=new URLSearchParams(ctx);const r=await fetch(url,{headers:token?{authorization:'Bearer '+token}:{},cache:'no-store'});return {status:r.status,body:await r.json()};},{token,ctx});
  const fill=async ctx=>{await page.locator('select').selectOption(ctx.targetSiteId);await page.locator('input').fill('example.test');};
  const atTarget=async()=>{await page.getByRole('status').filter({hasText:'Domain sudah berada di situs tujuan'}).waitFor();assert.equal(await page.evaluate(()=>window.__observedPhase),'at_target');};
  let ctx=await open('normal');
  await test('browser unsigned state request is rejected before RPC',async()=>{const before=report.rpcCalls,r=await stateAs(null,ctx);assert.equal(r.status,401);assert.equal(report.rpcCalls,before);});
  await test('browser tampered real Auth token is rejected',async()=>{const parts=actors.a.token.split('.');parts[2]=(parts[2][0]==='A'?'B':'A')+parts[2].slice(1);const r=await stateAs(parts.join('.'),ctx);assert.equal(r.status,401);});
  await test('browser unrelated signed Auth user cannot read state',async()=>{const r=await stateAs(actors.b.token,ctx);assert.equal(r.status,404);assert.equal(r.body.snapshot,undefined);});
  await test('actual React form blocks wrong hostname without POST',async()=>{const before=report.rpcCalls;await fill(ctx);await page.locator('input').fill('wrong.test');assert.equal(await page.locator('button[type=submit]').isDisabled(),true);assert.equal(report.rpcCalls,before);});
  await test('actual React form blocks unloaded target without POST',async()=>{ctx=await open('unloaded');const before=report.rpcCalls;await fill(ctx);assert.equal(await page.locator('button[type=submit]').isDisabled(),true);assert.equal(report.rpcCalls,before);});
  await test('real browser form submits once and automatic readback observes signed HTTP SQL commit',async()=>{ctx=await open('normal');await fill(ctx);assert.equal(await page.locator('button[type=submit]').isEnabled(),true);const before=report.rpcCalls;await page.evaluate(()=>{const form=document.querySelector('dialog form');form.requestSubmit();form.requestSubmit();});await atTarget();assert.equal(report.rpcCalls,before+1);assert.equal((await db.query('SELECT site_id FROM public.site_domains WHERE id=$1',[D])).rows[0].site_id,ctx.targetSiteId);report.sqlCommitsObserved++;});
  await test('browser lost response locks submit and explicit read reconciles without replay',async()=>{ctx=await open('lost');await fill(ctx);const before=report.rpcCalls;await page.locator('button[type=submit]').click();await page.getByText('Hasil belum pasti.',{exact:false}).waitFor();assert.equal(await page.locator('button[type=submit]').isDisabled(),true);await page.evaluate(()=>document.querySelector('dialog form').requestSubmit());assert.equal(report.rpcCalls,before+1);await page.getByRole('button',{name:'Muat ulang status',exact:true}).click();await atTarget();assert.equal(report.rpcCalls,before+1);assert.equal((await db.query('SELECT site_id FROM public.site_domains WHERE id=$1',[D])).rows[0].site_id,ctx.targetSiteId);report.sqlCommitsObserved++;});
  assert.equal(report.tests.length,7);assert.equal(report.rpcCalls,2);assert.equal(report.sqlCommitsObserved,2);report.passed=true;report.passedCount=7;
 }finally{
  try{if(browser){await browser.close();report.browserClosed=!browser.isConnected();}}finally{
   try{if(server.listening){server.closeAllConnections();await new Promise((done,reject)=>server.close(e=>e?reject(e):done()));}report.httpServerStopped=!server.listening;}finally{await rm(work,{recursive:true,force:true});report.privateWorkdirRemoved=true;}
  }
 }
 report.limits=['Actual transfer flow/dialog, not full Studio shell or legacy domain panel','Catalog schema slice; not combined with full production signup/profile/capacity schema','Real local Auth JWT and real browser same-origin HTTP; loopback adapter replaces hosted publishable-key gateway','No production database, provider/DNS/TLS propagation, edge cache eviction or release approval'];return report;
}
