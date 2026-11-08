import test from 'node:test';
import assert from 'node:assert/strict';
import { enrichNaraConnectorContext as enrich } from '../server/nara-chat-connector-context.mjs';
const owner={id:'91d4b436-6d7a-4e46-93f5-1ecdc6d33fb3',email:'triapriyogibahari7@gmail.com',email_confirmed_at:'2026-11-08T00:00:00Z'};
const env={SUPABASE_URL:'https://polvmlrhqoiflumibfqs.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test'};
const id=index=>index.toString(16).padStart(8,'0')+'-1111-4111-8111-111111111111';
const event=(extra={})=>({httpMethod:'POST',headers:{authorization:'Bearer test'},body:JSON.stringify({model:'nara-max',intelligence:'xhigh',message:'Periksa lima konektor',...extra})});
const fetcher=async()=>Response.json(owner);
test('canonical five-provider resource reads use the shared collector',async()=>{
 const reads=[{connectionId:id(1),read:{operation:'github-file',path:'src/a.js'}},{connectionId:id(2),read:{operation:'supabase-schema'}},{connectionId:id(3),read:{operation:'worker-settings',script:'ngeblogging'}},{connectionId:id(4),read:{operation:'waf-ruleset',rulesetId:'a'.repeat(32)}},{connectionId:id(5),read:{operation:'browser-sessions'}}];
 let verified=false;const output=await enrich(event({connectorReads:reads}),env,{fetcher,collect:async options=>{assert.equal(options.resourceReads.length,5);assert.deepEqual(options.resourceReads,reads);return {evidence:{results:[],connectionLimit:5},verify:async()=>{verified=true;}};}});
 assert.equal(verified,true);const payload=JSON.parse(output.body);assert.equal(payload.connectorReads,undefined);assert.equal(payload.context.naraConnectorEvidence.connectionLimit,5);
});
test('legacy request format fails explicitly and never authenticates',async()=>{await assert.rejects(enrich(event({connectorReads:[{connectionId:id(1),request:{operation:'github.file',path:'a.js'}}]}),env,{fetcher:()=>{throw Error('must not call');}}),error=>error.status===400);});
test('non-owner cannot trigger collector',async()=>{
 let called=false;const dependencies={fetcher:async()=>Response.json({...owner,email:'other@example.com'}),collect:async()=>{called=true;throw Error('must not collect');}};
 const original=event();assert.equal(await enrich(original,env,dependencies),original);
 await assert.rejects(enrich(event({connectorReads:[]}),env,dependencies),error=>error.status===403);assert.equal(called,false);
});
test('natural request uses metadata collection without inventing resource reads',async()=>{let captured;await enrich(event(),env,{fetcher,collect:async options=>{captured=options.resourceReads;return {evidence:{results:[]},verify:async()=>{}};}});assert.deepEqual(captured,[]);});
test('large results are explicitly omitted from model context',async()=>{const output=await enrich(event(),env,{fetcher,collect:async()=>({evidence:{providerStates:[{provider:'github',status:'read'}],results:[{connectionId:id(1),provider:'github',status:'read',data:{content:'x'.repeat(20000)}}]},verify:async()=>{}})});const evidence=JSON.parse(output.body).context.naraConnectorEvidence;assert.equal(evidence.results[0].usedInContext,false);assert.equal(evidence.providerStates[0].status,'read-omitted-evidence-budget');});
test('other modes retain existing behavior',async()=>{const original=event({model:'nara-mini'});assert.equal(await enrich(original,env,{fetcher:()=>{throw Error('must not call');}}),original);});
