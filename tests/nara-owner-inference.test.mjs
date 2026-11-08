import test from 'node:test';
import assert from 'node:assert/strict';
import {runNaraOwnerInference} from '../server/nara-owner-inference.mjs';
const owner={id:'91d4b436-6d7a-4e46-93f5-1ecdc6d33fb3',email:'triapriyogibahari7@gmail.com',email_confirmed_at:'2026-07-21T10:49:16Z'};
function setup(user=owner){const calls=[];const input={env:{AI:{run:async(model,payload)=>{calls.push({model,payload});return {response:calls.length===1?'draft':'reviewed'};}},SUPABASE_SERVICE_ROLE_KEY:'FAKE_SERVICE_TOKEN'},user,authProject:'https://polvmlrhqoiflumibfqs.supabase.co',selection:{model:'nara-max',intelligence:'xhigh',hasImage:false},model:'existing-model',messages:[{role:'user',content:'Write code'}],image:null,maxTokens:4000,temperature:.18};return{input,calls};}
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json'}});
test('designated active owner receives two-pass inference on the existing model',async()=>{const s=setup();let checks=0;const result=await runNaraOwnerInference(s.input,async(url,options)=>{checks++;assert.equal(options.redirect,'manual');assert.equal(JSON.parse(options.body).p_actor,owner.id);return json({admin:true});});assert.equal(result.response,'reviewed');assert.equal(s.calls.length,2);assert.equal(checks,2);assert.ok(s.calls.every(call=>call.model==='existing-model'));assert.equal(s.calls[1].payload.max_tokens,4000);});
test('ordinary user remains single-pass without service authorization calls',async()=>{const s=setup({...owner,id:'other'});const result=await runNaraOwnerInference(s.input,async()=>{throw Error('SHOULD_NOT_CALL');});assert.equal(result.response,'draft');assert.equal(s.calls.length,1);});
test('ordinary owner selection stays single-pass',async()=>{const s=setup();s.input.selection={model:'nara-mini',intelligence:'standard',hasImage:false};await runNaraOwnerInference(s.input,async()=>{throw Error('SHOULD_NOT_CALL');});assert.equal(s.calls.length,1);});
test('inactive admin gets no second inference',async()=>{const s=setup();await runNaraOwnerInference(s.input,async()=>json({message:'CONNECTOR_ADMIN_REQUIRED'},400));assert.equal(s.calls.length,1);});
test('revocation after draft blocks review and does not return draft',async()=>{const s=setup();let checks=0;await assert.rejects(runNaraOwnerInference(s.input,async()=>++checks===1?json({admin:true}):json({message:'CONNECTOR_ADMIN_REQUIRED'},400)),/PRIVATE_NARA_AUTH_UNAVAILABLE/);assert.equal(s.calls.length,1);});
test('authorization failure does not start inference or expose raw errors',async()=>{const s=setup();await assert.rejects(runNaraOwnerInference(s.input,async()=>{throw Error('PRIVATE_UPSTREAM_DETAIL');}),{message:'PRIVATE_NARA_AUTH_UNAVAILABLE'});assert.equal(s.calls.length,0);});
test('structured response objects are not fabricated as answer strings',async()=>{const s=setup({...owner,id:'other'});s.input.env.AI.run=async()=>({result:{not:'answer'}});await assert.rejects(runNaraOwnerInference(s.input),/NARA_EMPTY_MODEL_ANSWER/);});
test('image payload is retained without claiming real vision success',async()=>{const s=setup();s.input.image='MOCK_IMAGE_ONLY';s.input.selection.hasImage=true;await runNaraOwnerInference(s.input,async()=>json({admin:true}));assert.ok(s.calls.every(call=>call.payload.image==='MOCK_IMAGE_ONLY'));});

import {handleWorkersAiNara} from '../server/workers-ai-nara.mjs';
const sessionToken='header.'+Buffer.from(JSON.stringify({iss:'https://polvmlrhqoiflumibfqs.supabase.co/auth/v1'})).toString('base64url')+'.signature';
async function handlerTrial(t,allowed){
 const s=setup(),saved=globalThis.fetch;t.after(()=>{globalThis.fetch=saved;});
 globalThis.fetch=async url=>{
  if(url.endsWith('/auth/v1/user'))return json(owner);
  if(url.endsWith('/consume_nara_quota'))return json({allowed,reason:allowed?null:'PLAN_REQUIRED',account_plan:'pro',remaining:10});
  if(url.endsWith('/nara_connector_storage_v1'))return json({admin:true});
  throw Error('UNEXPECTED_NETWORK_TARGET');
 };
 s.input.env.SUPABASE_URL='https://polvmlrhqoiflumibfqs.supabase.co';s.input.env.SUPABASE_PUBLISHABLE_KEY='sb_publishable_fixture';s.input.env.CF_AI_MODEL_MAX='existing-model';
 const request=new Request('https://ngeblogging.com/api/nara',{method:'POST',headers:{authorization:'Bearer '+sessionToken,'content-type':'application/json'},body:JSON.stringify({message:'Write code',model:'nara-max',intelligence:'xhigh'})});
 return {response:await handleWorkersAiNara(request,s.input.env,'request-test'),calls:s.calls};
}
test('Workers handler invokes the owner inference path after accepted quota',async t=>{
 const trial=await handlerTrial(t,true);assert.equal(trial.response.status,200);const data=await trial.response.json();assert.equal(data.answer,'reviewed');assert.equal(data.model,'nara-max');assert.equal(data.intelligence,'xhigh');assert.equal(trial.calls.length,2);
});
test('Workers handler still blocks Pro inference when the quota service denies it',async t=>{
 const trial=await handlerTrial(t,false);assert.equal(trial.response.status,403);assert.equal(trial.calls.length,0);assert.equal((await trial.response.json()).code,'PLAN_REQUIRED');
});
