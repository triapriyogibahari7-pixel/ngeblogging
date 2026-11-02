import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectPaidDomainInstallation as inspect} from '../server/domain-paid-installation-reader.mjs';
globalThis.fetch=()=>{throw Error('LIVE_NETWORK_FORBIDDEN');};
const id='DOM-'+'a'.repeat(40),owner='11111111-1111-1111-1111-111111111111',site='22222222-2222-2222-2222-222222222222',quoteId='33333333-3333-3333-3333-333333333333',other='44444444-4444-4444-4444-444444444444',now=Date.parse('2026-11-02T07:00:00Z'),at='2026-11-02T06:00:00Z',ref='/accounts/095e57b46e7ba7f6b188480d9e4e5fe7/registrar/registrations/example.com';
function fixture(mode='good'){
 const env={DOMAIN_INSTALLATION_PREFLIGHT_ENABLED:'true',DOMAIN_ORDER_ENV:'production',SUPABASE_URL:'https://polvmlrhqoiflumibfqs.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'synthetic-private-key'},calls=[],seen={};
 const order={order_id:id,user_id:owner,quote_id:quoteId,environment:'production',currency:'IDR',amount_idr:350000,payment_state:mode==='unpaid'?'pending':'paid',registration_state:'registered',review_reason:null,paid_at:at,registered_at:at,midtrans_transaction_id:'fixture-tx',registrar_domain_ref:ref};
 const registration={order_id:id,user_id:owner,quote_id:quoteId,domain:'example.com',amount_idr:350000,state:'succeeded',provider_state:'succeeded',attempt_id:other,evidence_sha256:'b'.repeat(64),provider_resource_ref:ref,post_started_at:at,provider_updated_at:at};
 const fetchImpl=async(target,options)=>{
  const u=new URL(target),table=u.pathname.split('/').at(-1);seen[table]=(seen[table]||0)+1;calls.push({table,url:u.href});
  assert.equal(u.origin,'https://polvmlrhqoiflumibfqs.supabase.co');assert.equal(options.method,'GET');assert.equal(options.redirect,'manual');assert.equal(options.credentials,'omit');assert.equal(options.headers.authorization,'Bearer synthetic-private-key');assert.ok(!u.searchParams.get('select').includes('*'));assert.ok(!u.searchParams.get('select').includes('payload'));assert.ok(!u.searchParams.get('select').includes('contacts'));
  if(mode==='timeout')return new Promise(()=>{});
  if(mode==='redirect')return new Response('{}',{status:302,headers:{location:'https://untrusted.example'}});
  if(mode==='oversized')return Response.json([{padding:'x'.repeat(33000)}]);
  if(mode==='private-error')return new Response('synthetic-private-key',{status:403});
  let rows;
  if(table==='domain_purchase_orders'){assert.equal(u.searchParams.get('order_id'),'eq.'+id);rows=mode==='ambiguous'?[order,order]:[{...order,...(mode==='changed-order'&&seen[table]>1?{payment_state:'refunded'}:{})}];}
  else if(table==='domain_order_site_bindings')rows=mode==='no-binding'?[]:[{order_id:id,user_id:owner,site_id:site,environment:'production'}];
  else if(table==='sites')rows=[{id:site,owner_id:mode==='foreign-site'||(mode==='changed-owner'&&seen[table]>1)?other:owner}];
  else if(table==='domain_sale_quotes')rows=[{id:quoteId,user_id:owner,environment:'production',currency:'IDR',sale_price_idr:350000,provider_id:'cloudflare',operation:'registration',years:1,domain:mode==='invalid-domain'?'bad/path':'example.com'}];
  else if(table==='domain_registration_jobs')rows=[registration];
  else if(table==='domain_payment_events')rows=mode==='no-events'?[]:[{order_id:id,environment:'production',provider:'midtrans',currency:'IDR',amount_idr:350000,transaction_id:'fixture-tx',verified_state:'paid'}];
  else if(table==='site_domains')rows=mode==='conflict'?[{id:other,site_id:other,hostname:'example.com',provider:'cloudflare-full-zone'}]:[];
  else throw Error('unexpected mock table');
  return Response.json(rows);
 };
 return {env,calls,options:{fetchImpl,clock:()=>now}};
}
const run=async mode=>{const f=fixture(mode);return {...f,value:await inspect(f.env,id,f.options)};};
test('valid evidence reader performs only bounded GETs and returns a non-atomic plan',async()=>{const f=await run('good');assert.equal(f.value.eligible,true);assert.equal(f.value.installationStarted,false);assert.equal(f.value.installationConfirmed,false);assert.equal(f.value.snapshotAtomic,false);assert.equal(f.calls.length,10);assert.equal(f.value.siteId,site);assert.ok(!JSON.stringify(f.value).includes('synthetic-private-key'));});
test('disabled preflight makes no requests',async()=>{const f=fixture();delete f.env.DOMAIN_INSTALLATION_PREFLIGHT_ENABLED;assert.equal((await inspect(f.env,id,f.options)).code,'INSTALLATION_PREFLIGHT_DISABLED');assert.equal(f.calls.length,0);});
test('invalid configuration or order identifier makes no requests',async()=>{const f=fixture();assert.equal((await inspect(f.env,'invalid',f.options)).eligible,false);f.env.SUPABASE_URL='https://untrusted.example';assert.equal((await inspect(f.env,id,f.options)).eligible,false);assert.equal(f.calls.length,0);});
test('unpaid order stops immediately',async()=>{const f=await run('unpaid');assert.equal(f.value.code,'INSTALLATION_CONFIRMATIONS_REQUIRED');assert.equal(f.calls.length,1);});
test('missing binding and foreign current owner fail closed',async()=>{assert.equal((await run('no-binding')).value.code,'INSTALLATION_SITE_BINDING_REQUIRED');assert.equal((await run('foreign-site')).value.code,'INSTALLATION_SITE_OWNER_REQUIRED');});
test('missing payment events and conflicting mapping cannot plan installation',async()=>{assert.equal((await run('no-events')).value.code,'INSTALLATION_PAYMENT_EVIDENCE_REQUIRED');assert.equal((await run('conflict')).value.code,'INSTALLATION_DOMAIN_CONFLICT');});
test('changes discovered on final order and owner reads block the plan',async()=>{for(const mode of ['changed-order','changed-owner'])assert.equal((await run(mode)).value.code,'INSTALLATION_EVIDENCE_CHANGED');});
test('redirects are rejected without following credentials',async()=>{const f=await run('redirect');assert.equal(f.value.code,'INSTALLATION_EVIDENCE_UNAVAILABLE');assert.equal(f.calls.length,1);});
test('oversized and ambiguous responses are rejected',async()=>{for(const mode of ['oversized','ambiguous'])assert.equal((await run(mode)).value.code,'INSTALLATION_EVIDENCE_UNAVAILABLE');});
test('upstream errors never disclose secret values',async()=>{const f=await run('private-error');assert.equal(f.value.eligible,false);assert.ok(!JSON.stringify(f.value).includes('synthetic-private-key'));});
test('invalid quote hostname never reaches mapping query',async()=>{const f=await run('invalid-domain');assert.equal(f.value.code,'INSTALLATION_QUOTE_UNVERIFIED');assert.ok(!f.calls.some(c=>c.table==='site_domains'));});
test('pre-aborted requests perform no database reads',async()=>{const f=fixture(),c=new AbortController();c.abort();assert.equal((await inspect(f.env,id,{...f.options,signal:c.signal})).eligible,false);assert.equal(f.calls.length,0);});
test('timeout does not wait forever for a noncooperating mock',async()=>{const f=fixture('timeout');const value=await inspect(f.env,id,{...f.options,timeoutMs:10});assert.equal(value.code,'INSTALLATION_EVIDENCE_UNAVAILABLE');assert.equal(f.calls.length,1);});
