import test from 'node:test';
import assert from 'node:assert/strict';
import { handleMidtrans, catalogEnvironment } from '../server/midtrans-catalog-api.mjs';

test('Midtrans catalog exposes Pro and Max using server prices and correct durations', async () => {
 const env={MIDTRANS_ENV:'production',MIDTRANS_SERVER_KEY:'test-only',SUPABASE_URL:'https://example.supabase.co',SUPABASE_PUBLISHABLE_KEY:'test-only',SUPABASE_SERVICE_ROLE_KEY:'test-only'};
 const response=await handleMidtrans(new Request('https://example.com/api/billing/midtrans/config'),env,{fetchImpl:()=>{throw Error('Config must not contact payment provider');}});
 assert.equal(response.status,200);
 const result=await response.json();
 assert.equal(result.ready,true);
 assert.equal(result.environment,'production');
 assert.deepEqual(result.plans.map(({id,amount,durationDays})=>({id,amount,durationDays})),[
  {id:'pro_monthly',amount:300000,durationDays:31},
  {id:'pro_yearly',amount:3000000,durationDays:366},
  {id:'max_monthly',amount:499000,durationDays:31},
  {id:'max_yearly',amount:5000000,durationDays:366},
 ]);
 assert.equal(JSON.parse(catalogEnvironment({MIDTRANS_PLAN_PRICES_JSON:'{}'}).MIDTRANS_PLAN_PRICES_JSON).max_yearly,5000000);
});

test('Missing credentials cannot mark checkout ready',async()=>{
 const response=await handleMidtrans(new Request('https://example.com/api/billing/midtrans/config'),{});
 assert.equal((await response.json()).ready,false);
});
