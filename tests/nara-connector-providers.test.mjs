import test from 'node:test';
import assert from 'node:assert/strict';
import { readConnectorMetadata } from '../server/nara-connector-providers.mjs';
const accountId='a'.repeat(32), zoneId='b'.repeat(32), token='test-token';
const response = data => new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json' } });
test('GitHub reads configured repository and omits raw upstream fields',async()=>{
 const result=await readConnectorMetadata({provider:'github',repository:'team/repo'},token,async(url,options)=>{
  assert.equal(url,'https://api.github.com/repos/team/repo'); assert.equal(options.method,'GET'); assert.equal(options.redirect,'manual');
  return response({full_name:'team/repo',private:true,token:'DO_NOT_RETURN'});
 });
 assert.equal(result.resources[0].name,'team/repo'); assert.ok(!JSON.stringify(result).includes('DO_NOT_RETURN'));
});
test('Supabase checks actual requested project, not login status',async()=>{
 const projectRef='abcdefghijklmnopqrst';
 const result=await readConnectorMetadata({provider:'supabase',projectRef},token,async url=>{
  assert.equal(url,`https://api.supabase.com/v1/projects/${projectRef}`);return response({ref:projectRef,name:'Work',status:'ACTIVE_HEALTHY'});
 }); assert.equal(result.verifiedCapability,'project-metadata:read');
 await assert.rejects(readConnectorMetadata({provider:'supabase',projectRef},token,async()=>response({ref:'other'})),/TARGET_MISMATCH/);
});
test('Cloudflare lists Worker names without exposing other fields',async()=>{
 const result=await readConnectorMetadata({provider:'cloudflare',accountId},token,async()=>response({success:true,result:[{id:'worker',secret:'DO_NOT_RETURN'}]}));
 assert.deepEqual(result.resources,[{name:'worker'}]);
});
test('One and WAF require account-zone match and both API capabilities',async()=>{
 const urls=[];
 const result=await readConnectorMetadata({provider:'cloudflare-one-waf',accountId,zoneId},token,async url=>{
  urls.push(url);return response({success:true,result:url.endsWith(`/zones/${zoneId}`)?{id:zoneId,account:{id:accountId}}:[]});
 }); assert.equal(urls.length,3); assert.equal(result.verifiedCapability,'access-apps-and-zone-rulesets:read');
 await assert.rejects(readConnectorMetadata({provider:'cloudflare-one-waf',accountId,zoneId},token,async()=>response({success:true,result:{id:zoneId,account:{id:'c'.repeat(32)}}})),/TARGET_MISMATCH/);
});
test('Browser session inspection never claims successful rendering',async()=>{
 const result=await readConnectorMetadata({provider:'cloudflare-browser-rendering',accountId},token,async url=>{
  assert.ok(url.endsWith('/browser-rendering/devtools/session'));return response({success:true,result:[{sessionId:'DO_NOT_RETURN'}]});
 });assert.equal(result.renderingVerified,false); assert.equal(result.sessionCountInResponse,1); assert.ok(!JSON.stringify(result).includes('DO_NOT_RETURN'));
});
test('invalid targets and credentials fail before any network request',async()=>{
 const never=()=>{throw Error('NETWORK_WAS_CALLED');};
 for(const config of [{provider:'github',repository:'x/..'},{provider:'cloudflare',accountId:'http://localhost'},{provider:'unknown'}])await assert.rejects(readConnectorMetadata(config,token,never),/INVALID_CONNECTOR_TARGET/);
 await assert.rejects(readConnectorMetadata({provider:'github',repository:'x/y'},'token with space',never),/INVALID_CONNECTOR_TARGET/);
});
test('redirects, access failures, non-JSON and oversized bodies fail closed',async()=>{
 const config={provider:'github',repository:'x/y'};
 for(const [res,code] of [[new Response(null,{status:302,headers:{location:'https://evil.example'}}),'REDIRECT_REJECTED'],[new Response('secret upstream token',{status:403}),'ACCESS_DENIED'],[new Response('not json'),'INVALID_RESPONSE'],[new Response('x'.repeat(524289),{headers:{'content-type':'application/json'}}),'RESPONSE_TOO_LARGE']]) await assert.rejects(readConnectorMetadata(config,token,async()=>res),new RegExp(code));
});
test('stream failures never leak raw upstream errors',async()=>{
 const stream=new ReadableStream({start(controller){controller.error(new Error('SECRET_UPSTREAM_DETAIL'));}});
 await assert.rejects(readConnectorMetadata({provider:'github',repository:'x/y'},token,async()=>new Response(stream,{headers:{'content-type':'application/json'}})),{message:'CONNECTOR_UPSTREAM_UNAVAILABLE'});
});
