import test from 'node:test';
import assert from 'node:assert/strict';
import {preparePaidDomainInstallation as prepare} from '../server/domain-installation-claim-coordinator.mjs';
globalThis.fetch=()=>{throw Error('LIVE_NETWORK_FORBIDDEN');};
const id='DOM-'+'a'.repeat(40),owner='11111111-1111-1111-1111-111111111111',site='22222222-2222-2222-2222-222222222222',qid='33333333-3333-3333-3333-333333333333',other='44444444-4444-4444-4444-444444444444',claimId='55555555-5555-5555-5555-555555555555',now=Date.parse('2026-11-02T07:00:00Z'),at='2026-11-02T06:00:00Z',ref='/accounts/095e57b46e7ba7f6b188480d9e4e5fe7/registrar/registrations/example.com';
function fixture(mode='good'){
 const env={DOMAIN_INSTALLATION_PREFLIGHT_ENABLED:'true',DOMAIN_INSTALLATION_CLAIM_ENABLED:'true',DOMAIN_ORDER_ENV:'production',SUPABASE_URL:'https://polvmlrhqoiflumibfqs.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'synthetic-private-key'},calls=[],seen={};let stored=false;
 const order={order_id:id,user_id:owner,quote_id:qid,environment:'production',currency:'IDR',amount_idr:350000,payment_state:'paid',registration_state:'registered',review_reason:null,paid_at:at,registered_at:at,midtrans_transaction_id:'fixture-tx',registrar_domain_ref:ref};
 const fetchImpl=async(target,options)=>{const u=new URL(target),table=u.pathname.split('/').at(-1);calls.push({method:options.method,path:u.pathname});assert.equal(u.origin,'https://polvmlrhqoiflumibfqs.supabase.co');assert.equal(options.redirect,'manual');assert.equal(options.credentials,'omit');
  if(options.method==='POST'){
   assert.equal(u.pathname,'/rest/v1/rpc/domain_claim_paid_domain_installation');assert.deepEqual(JSON.parse(options.body),{p_order_id:id});
   if(mode==='timeout-claim')return new Promise(()=>{});
   if(mode==='redirect')return new Response('{}',{status:302,headers:{location:'https://untrusted.example'}});
   if(mode==='oversized')return Response.json({padding:'x'.repeat(8300)});
   if(mode==='rejected')return Response.json({ok:false,error:'synthetic-private-key'});
   const reused=stored||mode==='reused';stored=true;
   if(mode==='lost-once'&&!reused)throw Error('synthetic lost response');
   return Response.json({ok:true,order_id:id,user_id:owner,site_id:mode==='wrong-ack'?other:site,domain:'example.com',environment:'production',claim_id:claimId,registration_attempt_id:other,registration_evidence_sha256:'b'.repeat(64),claim_recorded:true,new_claim:!reused,reconciliation_only:reused,state:'claimed',provider_mutation_allowed:false,installation_action_taken:false,installation_confirmed:false});
  }
  assert.equal(options.method,'GET');seen[table]=(seen[table]||0)+1;let rows;
  if(mode==='timeout-preflight')return new Promise(()=>{});
  if(table==='domain_purchase_orders')rows=[{...order,...(mode==='unpaid'||(mode==='post-refund'&&stored)?{payment_state:'refunded'}:{})}];
  else if(table==='domain_order_site_bindings')rows=[{order_id:id,user_id:owner,site_id:site,environment:'production'}];
  else if(table==='sites')rows=[{id:site,owner_id:mode==='post-owner'&&stored?other:owner}];
  else if(table==='domain_sale_quotes')rows=[{id:qid,user_id:owner,environment:'production',currency:'IDR',sale_price_idr:350000,provider_id:'cloudflare',operation:'registration',years:1,domain:'example.com'}];
  else if(table==='domain_registration_jobs')rows=[{order_id:id,user_id:owner,quote_id:qid,domain:'example.com',amount_idr:350000,state:'succeeded',provider_state:'succeeded',attempt_id:other,evidence_sha256:'b'.repeat(64),provider_resource_ref:ref,post_started_at:at,provider_updated_at:at}];
  else if(table==='domain_payment_events')rows=[{order_id:id,environment:'production',provider:'midtrans',currency:'IDR',amount_idr:350000,transaction_id:'fixture-tx',verified_state:'paid'}];
  else if(table==='site_domains')rows=mode==='conflict'?[{id:other,site_id:other,hostname:'example.com',provider:'cloudflare-full-zone'}]:[];
  else throw Error('unexpected read');return Response.json(rows);
 };
 return {env,calls,options:{fetchImpl,clock:()=>now}};
}
const writes=f=>f.calls.filter(c=>c.method==='POST');
test('both explicit gates are required before any request',async()=>{for(const key of ['DOMAIN_INSTALLATION_PREFLIGHT_ENABLED','DOMAIN_INSTALLATION_CLAIM_ENABLED']){const f=fixture();delete f.env[key];assert.equal((await prepare(f.env,id,f.options)).code,'INSTALLATION_PREPARATION_DISABLED');assert.equal(f.calls.length,0);}});
test('invalid input and pre-aborted signals make no requests',async()=>{const f=fixture();assert.equal((await prepare(f.env,'invalid',f.options)).ok,false);const c=new AbortController();c.abort();assert.equal((await prepare(f.env,id,{...f.options,signal:c.signal})).ok,false);assert.equal(f.calls.length,0);});
test('ineligible payment or conflicting mapping cannot claim',async()=>{for(const mode of ['unpaid','conflict']){const f=fixture(mode),r=await prepare(f.env,id,f.options);assert.equal(r.code,'INSTALLATION_PREFLIGHT_NOT_READY');assert.equal(r.claimOutcome,'not_attempted');assert.equal(writes(f).length,0);}});
test('one reservation POST is bracketed by real reader preflights',async()=>{const f=fixture(),r=await prepare(f.env,id,f.options);assert.equal(r.code,'DOMAIN_INSTALLATION_RESERVED');assert.equal(r.claimOutcome,'recorded');assert.equal(r.claim.claimId,claimId);assert.equal(writes(f).length,1);assert.equal(f.calls.length,21);assert.equal(r.providerMutationAllowed,false);assert.equal(r.installationConfirmed,false);});
test('reused claim remains reconciliation-only',async()=>{const f=fixture('reused'),r=await prepare(f.env,id,f.options);assert.equal(r.code,'DOMAIN_INSTALLATION_RECONCILIATION_ONLY');assert.equal(r.reconciliationOnly,true);assert.equal(r.newClaimAllowed,false);});
test('malformed acknowledgement leaves outcome unknown and no automatic retry',async()=>{const f=fixture('wrong-ack'),r=await prepare(f.env,id,f.options);assert.equal(r.code,'INSTALLATION_CLAIM_RECONCILIATION_REQUIRED');assert.equal(r.claimOutcome,'unknown');assert.equal(r.reconciliationOnly,true);assert.equal(writes(f).length,1);});
test('lost response is reconciled on a separate same-order invocation',async()=>{const f=fixture('lost-once'),first=await prepare(f.env,id,f.options);assert.equal(first.claimOutcome,'unknown');assert.equal(writes(f).length,1);const second=await prepare(f.env,id,f.options);assert.equal(second.code,'DOMAIN_INSTALLATION_RECONCILIATION_ONLY');assert.equal(second.claim.claimId,claimId);assert.equal(writes(f).length,2);});
test('owner or payment change after reservation blocks readiness without releasing claim',async()=>{for(const mode of ['post-owner','post-refund']){const f=fixture(mode),r=await prepare(f.env,id,f.options);assert.equal(r.code,'INSTALLATION_CLAIM_RECONCILIATION_REQUIRED');assert.equal(r.claimOutcome,'recorded');assert.equal(r.reconciliationOnly,true);assert.equal(writes(f).length,1);}});
test('SQL rejection code is not copied into output',async()=>{const f=fixture('rejected'),r=await prepare(f.env,id,f.options);assert.equal(r.code,'INSTALLATION_CLAIM_REJECTED');assert.equal(r.claimOutcome,'rejected');assert.ok(!JSON.stringify(r).includes('synthetic-private-key'));});
test('redirects and oversized replies remain unknown, never provider authorization',async()=>{for(const mode of ['redirect','oversized']){const f=fixture(mode),r=await prepare(f.env,id,f.options);assert.equal(r.claimOutcome,'unknown');assert.equal(r.reconciliationOnly,true);assert.equal(r.providerMutationAllowed,false);assert.equal(writes(f).length,1);}});
test('preflight and claim timeouts distinguish whether a reservation may exist',async()=>{const before=fixture('timeout-preflight'),a=await prepare(before.env,id,{...before.options,timeoutMs:50});assert.equal(a.claimOutcome,'not_attempted');assert.equal(writes(before).length,0);const after=fixture('timeout-claim'),b=await prepare(after.env,id,{...after.options,timeoutMs:100});assert.equal(b.claimOutcome,'unknown');assert.equal(b.reconciliationOnly,true);assert.equal(writes(after).length,1);});
