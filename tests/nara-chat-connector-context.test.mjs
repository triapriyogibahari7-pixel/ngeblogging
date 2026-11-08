import test from 'node:test';
import assert from 'node:assert/strict';
import { enrichNaraConnectorContext as enrich } from '../server/nara-chat-connector-context.mjs';
const id='11111111-1111-4111-8111-111111111111';
const event=(extra={})=>({httpMethod:'POST',headers:{authorization:'Bearer test'},body:JSON.stringify({model:'nara-max',intelligence:'xhigh',message:'Periksa repositori Github',...extra})});
test('natural request reads through admin endpoint and supplies evidence to model context',async()=>{
 const calls=[];const output=await enrich(event(),{},async request=>{calls.push(request.url);assert.equal(request.headers.get('origin'),'https://ngeblogging.com');return request.method==='GET'?Response.json({connections:[{id,provider:'github',label:'Repo',enabled:true,status:'connected'}]}):Response.json({data:{verifiedCapability:'repository-metadata:read',resources:[{name:'owner/repo'}]}});});
 assert.equal(calls.length,2);const input=JSON.parse(output.body);assert.equal(input.context.naraConnectorEvidence.results[0].status,'read_succeeded');
});
test('non-admin natural requests never receive connector results',async()=>{
 const original=event();const output=await enrich(original,{},async()=>Response.json({code:'CONNECTOR_ADMIN_REQUIRED'},{status:403}));assert.equal(output,original);
});
test('explicit non-admin requests fail closed',async()=>{await assert.rejects(enrich(event({connectorReads:[{connectionId:id,request:{}}]}),{},async()=>Response.json({code:'CONNECTOR_ADMIN_REQUIRED'},{status:403})),error=>error.status===403);});
test('ambiguous connections are not guessed',async()=>{
 let reads=0;const output=await enrich(event(),{},async request=>{if(request.method==='POST')reads++;return Response.json({connections:[{id,provider:'github',enabled:true,status:'connected'},{id:'22222222-2222-4222-8222-222222222222',provider:'github',enabled:true,status:'connected'}]});});
 assert.equal(reads,0);assert.equal(JSON.parse(output.body).context.naraConnectorEvidence.selection[0].status,'choose_connection');
});
test('other modes retain existing behavior',async()=>{const original=event({model:'nara-mini'});assert.equal(await enrich(original,{},()=>{throw Error('must not call');}),original);});
