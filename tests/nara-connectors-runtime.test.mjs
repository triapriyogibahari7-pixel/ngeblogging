import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../server/nara-inference-connectors.mjs',import.meta.url),'utf8');
const inferenceSource=await readFile(new URL('../server/nara-owner-inference.mjs',import.meta.url),'utf8');
const actor='91d4b436-6d7a-4e46-93f5-1ecdc6d33fb3';
const providers=['supabase','github','cloudflare-one-waf','cloudflare','cloudflare-browser-rendering'];
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const rows=()=>providers.map((provider,i)=>({id:id(i+1),owner_id:actor,key_version:'v1',enabled:true,status:'connected',revision:1,credential:{ciphertext:'CIPHER'},config:{provider,label:provider}}));
async function fixture(options={}){
 const data=options.rows||rows();let reads=0,inflight=0,peak=0,revoked=false;const observed=[];
 const context=vm.createContext({Response,Headers,URL,AbortController,AbortSignal,Uint8Array,TextDecoder,Date,setTimeout,clearTimeout});
 const synthetic=values=>new vm.SyntheticModule(Object.keys(values),function(){for(const [k,v]of Object.entries(values))this.setExport(k,v);},{context});
 const dependencies={
 './nara-connector-admin-identity.mjs':synthetic({requireConnectorAdminIdentity:user=>{if(user?.id!==actor)throw Error('CONNECTOR_ADMIN_REQUIRED');}}),
 '../shared/nara-connector-registry.mjs':synthetic({CONNECTOR_CATALOG:providers.map(id=>({id})),normalizeConnection:config=>{if(!providers.includes(config?.provider))throw Error('INVALID_CONNECTION');return config;}}),
 './nara-connector-credentials.mjs':synthetic({openCredential:async()=> 'PROVIDER_SECRET'}),
 './nara-connector-providers.mjs':synthetic({readConnectorMetadata:async config=>{reads++;observed.push(config.provider);inflight++;peak=Math.max(peak,inflight);try{await new Promise(r=>setTimeout(r,2));if(options.failed===config.provider)throw Error(options.failure||'CONNECTOR_ACCESS_DENIED');return {verifiedCapability:'metadata:read',resources:Array.from({length:options.resources||1},()=>({name:'PROVIDER_SECRET',token:'PROVIDER_SECRET'})),firstPageOnly:false,...(config.provider==='cloudflare-browser-rendering'?{renderingVerified:false,sessionCountInResponse:0}:{})};}finally{inflight--;}}})
 };
 const module=new vm.SourceTextModule(source,{context});await module.link(spec=>dependencies[spec]);await module.evaluate();
 const fetcher=async(_url,request)=>{const input=JSON.parse(request.body);assert.equal(input.p_actor,actor);let result;
 if(input.p_action==='admin')result={admin:!revoked};else if(input.p_action==='list')result=data;else{result={...data.find(row=>row.id===input.p_id)};if(options.foreign)result.owner_id='other';if(options.stale&&input.p_action==='get')result.revision=2;}
 return new Response(JSON.stringify(result),{headers:{'content-type':'application/json'}});};
 async function infer(selection){
  const calls=[];
  const policy=synthetic({resolvePrivateNaraRoute:async(user,value,check)=>({enhanced:user.id===actor&&(value.model==='nara-vision'||value.model==='nara-max'||value.intelligence==='xhigh')&&await check(user.id)})});
  const owner=new vm.SourceTextModule(inferenceSource,{context});await owner.link(spec=>spec==='./nara-inference-connectors.mjs'?module:policy);await owner.evaluate();
  const answer=await owner.namespace.runNaraOwnerInference({env:{SUPABASE_SERVICE_ROLE_KEY:'SERVER_SECRET',NARA_CONNECTOR_ENCRYPTION_KEY:'ENCRYPTION_SECRET',AI:{run:async(_model,payload)=>{calls.push(payload);return {response:'fixture answer'};}}},user:{id:actor},authProject:'https://polvmlrhqoiflumibfqs.supabase.co',selection,model:'mock-model',messages:[{role:'system',content:'system'},{role:'user',content:'Read my connector metadata'}],image:selection.hasImage?'MOCK_IMAGE':null,maxTokens:100,temperature:0.1},fetcher);
  return {answer,calls};
 }
 return {infer,select:module.namespace.selectNaraConnectorCandidates,run:args=>module.namespace.collectNaraConnectorContext({env:{SUPABASE_SERVICE_ROLE_KEY:'SERVER_SECRET',NARA_CONNECTOR_ENCRYPTION_KEY:'ENCRYPTION_SECRET'},user:{id:actor},authProject:'https://polvmlrhqoiflumibfqs.supabase.co',deadline:Date.now()+50000,...args},fetcher),revoke:()=>{revoked=true;},get reads(){return reads;},get peak(){return peak;},observed};
}
test('all five providers can be read within a single collection',async()=>{const f=await fixture(),result=await f.run();assert.equal(f.reads,5);assert.equal(result.evidence.connectionLimit,5);assert.ok(result.evidence.providerStates.every(p=>p.status==='read'));});
test('provider diversity prevents duplicate providers crowding out other providers',async()=>{const f=await fixture();const input=rows();input.splice(1,0,{...input[0],id:id(20)});const selected=f.select(input);assert.equal(new Set(selected.selected.map(row=>row.config.provider)).size,5);assert.equal(selected.connectedCount,6);assert.equal(input.length,6);});
test('parallel provider reads are bounded to two',async()=>{const f=await fixture();await f.run();assert.equal(f.peak,2);});
test('disabled connections are not read and are reported not connected',async()=>{const data=rows();data[0].enabled=false;data[0].status='disconnected';const f=await fixture({rows:data}),result=await f.run();assert.equal(f.reads,4);assert.equal(result.evidence.providerStates[0].status,'not-connected');});
test('one provider failure does not fabricate success or block other readable providers',async()=>{const f=await fixture({failed:'github'}),result=await f.run();assert.equal(result.evidence.results.filter(r=>r.status==='read').length,4);assert.equal(result.evidence.results.find(r=>r.provider==='github').reason,'provider-access-denied');});
test('evidence excludes credential fields and redacts provider token',async()=>{const f=await fixture(),result=await f.run();const value=JSON.stringify(result.evidence);for(const secret of ['PROVIDER_SECRET','SERVER_SECRET','ENCRYPTION_SECRET','CIPHER'])assert.ok(!value.includes(secret));assert.ok(value.includes('[REDACTED]'));});
test('foreign owner fails before reading upstream',async()=>{const f=await fixture({foreign:true});await assert.rejects(f.run(),/ACCESS_REVOKED/);assert.equal(f.reads,0);});
test('revision change during a read rejects collection',async()=>{const f=await fixture({stale:true});await assert.rejects(f.run(),/ACCESS_REVOKED/);});
test('revocation invalidates evidence before subsequent inference use',async()=>{const f=await fixture(),result=await f.run();f.revoke();await assert.rejects(result.verify(),/ACCESS_REVOKED/);});
test('insufficient collection budget reports skips without upstream reads',async()=>{const f=await fixture(),result=await f.run({deadline:Date.now()+5000});assert.equal(f.reads,0);assert.equal(result.evidence.results.length,5);assert.ok(result.evidence.results.every(r=>r.status==='not-read-time-budget'));});
test('duplicate IDs and invalid identities are rejected',async()=>{const f=await fixture(),data=rows();data.push(data[0]);assert.throws(()=>f.select(data),/UNAVAILABLE/);await assert.rejects(f.run({user:{id:'other'}}),/ADMIN_REQUIRED/);});
test('resource truncation and browser metadata limits are explicit',async()=>{const f=await fixture({resources:12}),result=await f.run();assert.ok(result.evidence.results.every(r=>r.resources.length===10&&r.truncated));assert.equal(result.evidence.results.find(r=>r.provider==='cloudflare-browser-rendering').renderingVerified,false);});
for(const selection of [{model:'nara-mini',intelligence:'xhigh',hasImage:false},{model:'nara-vision',intelligence:'standard',hasImage:true},{model:'nara-max',intelligence:'standard',hasImage:true}])test('actual inference receives five-provider metadata in both passes: '+selection.model+'/'+selection.intelligence,async()=>{const f=await fixture(),result=await f.infer(selection);assert.equal(f.reads,5);assert.equal(result.calls.length,2);for(const payload of result.calls){const text=JSON.stringify(payload.messages);for(const provider of providers)assert.ok(text.includes(provider));assert.ok(!text.includes('PROVIDER_SECRET'));if(selection.hasImage)assert.equal(payload.image,'MOCK_IMAGE');}});
test('ordinary inference does not collect connectors',async()=>{const f=await fixture(),result=await f.infer({model:'nara-mini',intelligence:'standard',hasImage:false});assert.equal(f.reads,0);assert.equal(result.calls.length,1);});
