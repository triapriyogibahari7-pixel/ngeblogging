import test from 'node:test';
import assert from 'node:assert/strict';
import {searchCloudflareRegistrar as search,registrarSuggestionKeyword as keyword} from '../server/cloudflare-registrar-search.mjs';
const env={CLOUDFLARE_REGISTRAR_API_TOKEN:'fixture-only'};
const row={name:'nama.com',registrable:true,tier:'standard',pricing:{currency:'USD',registration_cost:'10.50',renewal_cost:'11.25'}};
function run(query,rows=[row]){const calls=[];return search(env,{query,limit:50},{fetchImpl:async(url,options)=>{calls.push({url,options});return new Response(JSON.stringify({success:true,result:{domains:rows}}));},clock:()=>0}).then(result=>({result,calls}));}
for(const suffix of ['co.id','my.id','web.id','com','online','co.uk'])test('alternatives for nama.'+suffix+' use keyword without the extension',async()=>{const {result,calls}=await run('nama.'+suffix);assert.equal(result.query,'nama.'+suffix);assert.equal(result.searchTerm,'nama');assert.equal(new URL(calls[0].url).searchParams.get('q'),'nama');assert.equal(calls.length,1);assert.equal(result.domains[0].domain,'nama.com');assert.equal(result.purchaseAllowed,false);assert.equal(result.domains[0].mustRecheckBeforePurchase,true);});
test('phrases and plain keywords preserved',()=>{assert.equal(keyword('  nama   blog '),'nama blog');assert.equal(keyword('nama'),'nama');});
test('trailing domain dot does not constrain alternatives',()=>assert.equal(keyword('nama.co.id.'),'nama'));
test('Unicode keyword preserved',()=>assert.equal(keyword('café.co.id'),'café'));
test('unsafe URL and extension-only dot input still rejected',()=>{for(const value of ['https://nama.com','.co.id','nama\ncom','nama?query'])assert.throws(()=>keyword(value));});
test('IPv4 input is not silently converted to a numeric brand',()=>assert.equal(keyword('127.0.0.1'),'127.0.0.1'));
test('empty provider response remains empty rather than fabricating alternatives',async()=>{const {result}=await run('nama.co.id',[]);assert.equal(result.status,'search_results');assert.equal(result.count,0);assert.deepEqual(result.domains,[]);});
test('unsupported returned candidate remains unconfirmed',async()=>{const {result}=await run('nama.co.id',[{name:'nama.co.id',registrable:false,reason:'extension_not_supported_via_api'}]);assert.equal(result.domains[0].searchAvailability,'not_confirmed');assert.equal(result.domains[0].prices,null);});
test('negative price still rejected',async()=>{const {result}=await run('nama.co.id',[{...row,pricing:{...row.pricing,registration_cost:'-1'}}]);assert.equal(result.status,'invalid_response');});
test('duplicate candidates still rejected',async()=>assert.equal((await run('nama.co.id',[row,row])).result.status,'invalid_response'));
test('provider request stays server-side GET with no automatic Check requests',async()=>{const {calls}=await run('nama.co.id');assert.equal(calls.length,1);const url=new URL(calls[0].url);assert.equal(url.hostname,'api.cloudflare.com');assert.ok(url.pathname.endsWith('/registrar/domain-search'));assert.equal(url.searchParams.get('limit'),'50');assert.equal(calls[0].options.method,'GET');assert.equal(calls[0].options.redirect,'manual');assert.equal(calls[0].options.cache,'no-store');});
