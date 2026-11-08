import test from 'node:test';
import assert from 'node:assert/strict';
import { readConnectorTool as read, isConnectorToolInput } from '../server/nara-connector-read-tools.mjs';
const accountId='a'.repeat(32),zoneId='b'.repeat(32),token='test-token-not-real';
const config=provider=>({provider,label:'Test',...(provider==='supabase'?{projectRef:'a'.repeat(20)}:provider==='github'?{repository:'owner/repo'}:{accountId,...(provider==='cloudflare-one-waf'?{zoneId}:{})})});
test('Worker deployments use fixed account and GET; secrets are not projected',async()=>{
 const result=await read(config('cloudflare'),token,{operation:'cloudflare.deployments',worker:'ngeblogging'},async(url,options)=>{assert.equal(url,'https://api.cloudflare.com/client/v4/accounts/'+accountId+'/workers/scripts/ngeblogging/deployments');assert.equal(options.method,'GET');return Response.json({success:true,result:{deployments:[{id:'deployment',secret:token,versions:[{version_id:'version',percentage:100}]}]}});});
 assert.equal(result.entries[0].id,'deployment');assert.ok(!JSON.stringify(result).includes(token));
});
test('Supabase function read omits arbitrary provider fields',async()=>{
 const result=await read(config('supabase'),token,{operation:'supabase.functions'},async()=>Response.json([{id:'function',slug:'hello',name:'Hello',status:'ACTIVE',version:1,secret:token}]));assert.equal(result.entries[0].slug,'hello');assert.equal(result.entries[0].secret,undefined);
});
test('WAF uses configured zone and browser session check does not claim rendering',async()=>{
 const waf=await read(config('cloudflare-one-waf'),token,{operation:'waf.rulesets'},async url=>{assert.ok(url.endsWith('/zones/'+zoneId+'/rulesets'));return Response.json({success:true,result:[{id:'rule',name:'Rule',phase:'http_request_firewall_custom'}]});});assert.equal(waf.entries[0].id,'rule');
 const browser=await read(config('cloudflare-browser-rendering'),token,{operation:'browser.sessions'},async()=>Response.json({success:true,result:[]}));assert.equal(browser.renderingVerified,false);assert.equal(browser.sessionCountInResponse,0);
});
test('rejects provider mismatch and caller-supplied URL or account',async()=>{
 assert.equal(isConnectorToolInput({operation:'browser.sessions',url:'https://example.com'}),false);
 await assert.rejects(read(config('supabase'),token,{operation:'cloudflare.versions',worker:'ngeblogging'}),/CONNECTOR_INVALID_REQUEST/);
 await assert.rejects(read(config('cloudflare'),token,{operation:'cloudflare.deployments',worker:'../other'}),/CONNECTOR_INVALID_REQUEST/);
});
test('upstream denial is not a successful connection result',async()=>{await assert.rejects(read(config('supabase'),token,{operation:'supabase.functions'},async()=>Response.json({error:'denied'},{status:403})),/CONNECTOR_ACCESS_DENIED/);});
