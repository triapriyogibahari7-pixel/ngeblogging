import test from 'node:test';
import assert from 'node:assert/strict';
import {createTransferController} from '../src/lib/domain-transfer-confirmation.mjs';
import {createDomainTransferHandler} from '../server/domain-transfer-handler.mjs';
import {createIsolatedTransferAdapters} from '../server/domain-transfer-supabase-adapter.mjs';
// Actual three modules with stateful HTTP/RPC simulation. No PostgreSQL, React DOM or provider E2E.
const a='00000000-0000-0000-0000-000000000001',b='00000000-0000-0000-0000-000000000002',d='00000000-0000-0000-0000-000000000003',u='00000000-0000-0000-0000-000000000010';
const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json',...headers}});
function setup(options={}){
 const calls=[],states=[],http=[];
 const sites=[{id:a,owner_id:u,slug:'source',status:'active',custom_domain:'example.test'},{id:b,owner_id:u,slug:'target',status:'active',custom_domain:'target.ngeblogging.com'}];
 const domain={id:d,site_id:a,hostname:'example.test',provider:'cloudflare-full-zone',status:options.status||'active',is_primary:!options.status};
 const free=[{id:'free-a',site_id:a,hostname:'source.ngeblogging.com'},{id:'free-b',site_id:b,hostname:'target.ngeblogging.com'}];
 const input={userId:u,source:{...sites[0]},target:{...sites[1]},domain:{...domain},confirmation:'example.test',targetLoaded:true,targetDomains:[{...free[1]}]};
 let rpcCalls=0;
 const fetchImpl=async(url,init)=>{
  const q=new URL(url);assert.equal(q.origin,'http://127.0.0.1:54321');assert.equal(init.headers.authorization,'Bearer user-session');calls.push({path:q.pathname,method:init.method});
  if(q.pathname==='/auth/v1/user')return options.authFailure?json({error:'denied'},401):json({id:u});
  if(q.pathname.endsWith('/sites')){const id=q.searchParams.get('id').slice(3);return json(sites.filter(s=>s.id===id));}
  if(q.pathname.endsWith('/site_members')){const id=q.searchParams.get('site_id').slice(3);return json([{site_id:id,user_id:u,role:options.adminOnly?'admin':'owner'}]);}
  if(q.pathname.endsWith('/site_domains')){
   if(q.searchParams.has('id'))return json([{...domain}]);
   const rows=[...free,domain].filter(row=>row.site_id===q.searchParams.get('site_id').slice(3));
   if(options.occupied)rows.push({id:'occupied',site_id:b,hostname:'occupied.test'});
   return json(rows,200,options.missingCount?{}:{'content-range':`0-${rows.length-1}/${rows.length}`});
  }
  if(q.pathname==='/rest/v1/rpc/move_site_domain_v2'){
   rpcCalls++;assert.deepEqual(JSON.parse(init.body),{p_domain_id:d,p_source_site_id:a,p_target_site_id:b,p_confirm_hostname:'example.test'});
   if(options.rpcFailure)return json({error:'mock storage rejection'},500);
   // Simulated commit, not an implementation or proof of PostgreSQL atomicity.
   domain.site_id=b;if(domain.is_primary){sites[0].custom_domain='source.ngeblogging.com';sites[1].custom_domain=domain.hostname;}
   if(options.lostRpcResponse)throw Error('response lost after simulated commit');
   return json({status:'moved',domainId:d,sourceSiteId:a,targetSiteId:b,redirectsMoved:0});
  }
  throw Error('Unexpected simulated request');
 };
 const adapters=createIsolatedTransferAdapters({environment:'isolated-test',databaseUrl:'http://127.0.0.1:54321',approvedTestOrigin:'http://127.0.0.1:54321',publishableKey:'sb_publishable_test_only',fetchImpl});
 const handle=createDomainTransferHandler({...adapters,enabled:true,environment:'isolated-test',allowedOrigin:'https://stage5.test',requestId:()=> 'chain-test'});
 const send=async args=>{
  const response=await handle(new Request('https://stage5.test/api/domains/move',{method:'POST',headers:{origin:'https://stage5.test',authorization:'Bearer user-session','content-type':'application/json'},body:JSON.stringify(args)}));
  const payload=await response.json();http.push({status:response.status,payload});
  if(!response.ok)throw Object.assign(new Error(payload.code),{payload,status:response.status});
  if(options.lostClientResponse)throw Error('client response lost after handler success');
  return payload;
 };
 const controller=createTransferController(send,{onState:s=>states.push(s)});
 return {input,controller,adapters,states,http,calls,sites,domain,free,get rpcCalls(){return rpcCalls;}};
}
test('actual controller, handler and adapter agree on successful contract',async()=>{const h=setup();const result=await h.controller.submit(h.input);assert.equal(result.status,'moved');assert.equal(h.rpcCalls,1);assert.equal(h.domain.site_id,b);assert.equal(h.sites[0].custom_domain,'source.ngeblogging.com');assert.equal(h.sites[1].custom_domain,'example.test');assert.equal(h.free.length,2);assert.equal(h.states.at(-1).routingVerified,false);assert.equal(h.calls.length,8);});
test('same-tick submissions across the chain reach RPC once',async()=>{const h=setup();const first=h.controller.submit(h.input);await assert.rejects(h.controller.submit(h.input),/RELOAD_REQUIRED_OR_BUSY/);await first;assert.equal(h.rpcCalls,1);});
test('server owner membership blocks a client-valid request',async()=>{const h=setup({adminOnly:true});await assert.rejects(h.controller.submit(h.input),/TRANSFER_RECONCILIATION_REQUIRED/);assert.equal(h.rpcCalls,0);assert.equal(h.http[0].status,403);assert.equal(h.http[0].payload.mutationAttempted,false);assert.equal(h.domain.site_id,a);});
test('server occupied-target detection wins over stale empty frontend state',async()=>{const h=setup({occupied:true});await assert.rejects(h.controller.submit(h.input));assert.equal(h.rpcCalls,0);assert.equal(h.http[0].status,409);assert.equal(h.http[0].payload.code,'TARGET_HAS_DOMAIN_OR_UNREVIEWED_MAPPING');});
test('missing target count fails closed before RPC',async()=>{const h=setup({missingCount:true});await assert.rejects(h.controller.submit(h.input));assert.equal(h.rpcCalls,0);assert.equal(h.http[0].payload.mutationAttempted,false);});
test('Auth rejection stops before storage reads and mutation',async()=>{const h=setup({authFailure:true});await assert.rejects(h.controller.submit(h.input));assert.equal(h.calls.length,1);assert.equal(h.rpcCalls,0);assert.equal(h.http[0].status,401);});
test('RPC failure never causes detach, register or replay',async()=>{const h=setup({rpcFailure:true});await assert.rejects(h.controller.submit(h.input));assert.equal(h.rpcCalls,1);assert.equal(h.domain.site_id,a);assert.equal(h.http[0].payload.mutationOutcome,'unknown');await assert.rejects(h.controller.submit(h.input),/RELOAD_REQUIRED_OR_BUSY/);assert.equal(h.rpcCalls,1);assert.ok(h.calls.every(c=>!c.path.includes('register')&&!c.path.includes('remove')));});
test('lost RPC response preserves unknown UI and reread discovers simulated commit',async()=>{const h=setup({lostRpcResponse:true});await assert.rejects(h.controller.submit(h.input));assert.equal(h.controller.phase,'unknown');assert.equal(h.domain.site_id,b);assert.equal(h.http[0].payload.reloadRequired,true);const s=await h.adapters.loadSnapshot({token:'user-session',userId:u,domainId:d,sourceSiteId:a,targetSiteId:b});assert.equal(s.domain.site_id,b);await assert.rejects(h.controller.submit(h.input),/RELOAD_REQUIRED_OR_BUSY/);assert.equal(h.rpcCalls,1);});
test('lost client response after handler success does not imply rollback',async()=>{const h=setup({lostClientResponse:true});await assert.rejects(h.controller.submit(h.input));assert.equal(h.http[0].status,200);assert.equal(h.domain.site_id,b);assert.equal(h.controller.phase,'unknown');assert.equal(h.rpcCalls,1);});
test('pending and verifying remain nonprimary across the chain',async()=>{for(const status of ['pending','verifying']){const h=setup({status});await h.controller.submit(h.input);assert.equal(h.domain.status,status);assert.equal(h.domain.is_primary,false);assert.equal(h.sites[1].custom_domain,'target.ngeblogging.com');assert.equal(h.rpcCalls,1);}});
