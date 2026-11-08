import test from 'node:test';
import assert from 'node:assert/strict';
import { readGitHubRepositoryTool as read } from '../server/nara-github-repository-tool.mjs';
import { createConnectorEndpoint } from '../server/nara-connector-endpoint.mjs';
const config={provider:'github',repository:'triapriyogibahari7-pixel/ngeblogging'};
const token='test-token-not-real';
test('reads file content at explicit ref and redacts connector credential',async()=>{
 const content='export const value = 42; // '+token;
 const result=await read(config,token,{operation:'github.file',path:'src/test.js',ref:'main'},async(url,options)=>{
  assert.equal(new URL(url).searchParams.get('ref'),'main');assert.equal(options.method,'GET');assert.equal(options.headers.authorization,'Bearer '+token);
  return Response.json({type:'file',path:'src/test.js',size:new TextEncoder().encode(content).length,encoding:'base64',content:btoa(content),sha:'abc'});
 });
 assert.match(result.content,/value = 42/);assert.ok(!result.content.includes(token));assert.equal(result.truncated,false);
});
test('rejects secret paths, traversal and caller-provided repository',async()=>{
 for(const input of [{operation:'github.file',path:'.env.local'},{operation:'github.file',path:'../secret.js'},{operation:'github.file',path:'src/a.js',repository:'other/repo'}]) await assert.rejects(read(config,token,input,()=>{throw Error('must not fetch');}),/CONNECTOR_(SENSITIVE_PATH|INVALID_REQUEST)/);
});
test('directory response declares its truncation',async()=>{
 const result=await read(config,token,{operation:'github.directory'},async()=>Response.json(Array.from({length:201},(_,i)=>({name:String(i),path:String(i),type:'file',sha:'abc'}))));
 assert.equal(result.entries.length,200);assert.equal(result.truncated,true);
});
const actor='91d4b436-6d7a-4e46-93f5-1ecdc6d33fb3',id='11111111-1111-4111-8111-111111111111';
function endpoint(admin=true,disconnect=false){
 const row={id,owner_id:actor,key_version:'v1',enabled:true,status:'connected',revision:1,config,credential:'cipher'};
 return createConnectorEndpoint({authenticate:async()=>({id:actor,email_confirmed_at:'2026-11-08'}),storage:async(_,action)=>action==='admin'?{admin}:action==='get'&&disconnect?{...row,enabled:false}:row,normalize:value=>value,open:async()=>token,key:()=>'',readRepository:async()=>({content:'const value=42;'}),readMetadata:async()=>({}),seal:async()=>'',newId:()=>id});
}
function request(){return new Request('https://ngeblogging.com/api/nara/connectors/'+id+'/read',{method:'POST',headers:{origin:'https://ngeblogging.com','content-type':'application/json'},body:JSON.stringify({operation:'github.file',path:'src/a.js'})});}
test('active endpoint returns repository read result',async()=>{const response=await endpoint()(request());assert.equal(response.status,200);assert.equal((await response.json()).data.content,'const value=42;');});
test('admin denial and disconnect prevent result disclosure',async()=>{assert.equal((await endpoint(false)(request())).status,403);assert.equal((await endpoint(true,true)(request())).status,409);});
