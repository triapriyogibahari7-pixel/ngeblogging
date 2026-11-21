import test from 'node:test';
import assert from 'node:assert/strict';
import {attachDefaultWorkerDomains,attachWorkerDomain,deleteFullZone,detachWorkerDomain,fullZoneProviderReady,getOrCreateFullZone,normalizeZoneName,publicZoneState} from '../server/cloudflare-full-zone-provider.mjs';
const ACCOUNT_ID='a'.repeat(32),ZONE_ID='b'.repeat(32);
const ENV={CLOUDFLARE_API_TOKEN:'token-test-tidak-dikirim',CLOUDFLARE_ACCOUNT_ID:ACCOUNT_ID,CLOUDFLARE_WORKER_SERVICE:'ngeblogging'};
function cloudflareResponse(result,status=200){return new Response(JSON.stringify({success:status>=200&&status<300,errors:[],messages:[],result}),{status,headers:{'content-type':'application/json'}});}
async function withMockFetch(mockFetch,callback){const originalFetch=globalThis.fetch;globalThis.fetch=mockFetch;try{return await callback();}finally{globalThis.fetch=originalFetch;}}
test('normalizeZoneName membersihkan domain akar',()=>{assert.equal(normalizeZoneName(' Example.COM. '),'example.com');assert.equal(normalizeZoneName('https://contoh.id'),'contoh.id');});
test('normalizeZoneName menolak www, path, dan subdomain Ngeblogging',()=>{assert.throws(()=>normalizeZoneName('www.example.com'),e=>e?.code==='INVALID_ROOT_DOMAIN');assert.throws(()=>normalizeZoneName('example.com/artikel'),e=>e?.code==='INVALID_DOMAIN');assert.throws(()=>normalizeZoneName('toko.ngeblogging.com'),e=>e?.code==='USE_MANAGED_SUBDOMAIN');});
test('publicZoneState hanya mengembalikan data aman untuk frontend',()=>{const state=publicZoneState({id:ZONE_ID,name:'example.com',status:'pending',name_servers:['alice.ns.cloudflare.com','bob.ns.cloudflare.com'],original_name_servers:['ns1.registrar.example','ns2.registrar.example'],created_on:'2026-07-26T10:00:00Z',activated_on:null,data_rahasia:'tidak-boleh-keluar'});assert.deepEqual(state,{id:ZONE_ID,name:'example.com',status:'pending',active:false,nameServers:['alice.ns.cloudflare.com','bob.ns.cloudflare.com'],originalNameServers:['ns1.registrar.example','ns2.registrar.example'],createdOn:'2026-07-26T10:00:00Z',activatedOn:null});assert.equal('data_rahasia' in state,false);});
test('fullZoneProviderReady memeriksa konfigurasi',()=>{assert.equal(fullZoneProviderReady({}),false);assert.equal(fullZoneProviderReady({CLOUDFLARE_API_TOKEN:'token-test',CLOUDFLARE_ACCOUNT_ID:ACCOUNT_ID}),true);});
test('getOrCreateFullZone memakai zone lama jika sudah ada',async()=>{const calls=[];await withMockFetch(async(url,options={})=>{calls.push({url:String(url),options});return cloudflareResponse([{id:ZONE_ID,name:'example.com',status:'pending',name_servers:['alice.ns.cloudflare.com','bob.ns.cloudflare.com']}]);},async()=>{const result=await getOrCreateFullZone(ENV,'example.com');assert.equal(result.reused,true);assert.equal(result.zone.id,ZONE_ID);assert.equal(result.zone.name,'example.com');});assert.equal(calls.length,1);assert.match(calls[0].url,/\/zones\?/);assert.equal(calls[0].options.method??'GET','GET');});
test('getOrCreateFullZone membuat zone jika belum ditemukan',async()=>{const calls=[];await withMockFetch(async(url,options={})=>{calls.push({url:String(url),options});if((options.method??'GET')==='GET')return cloudflareResponse([]);const body=JSON.parse(options.body);assert.equal(options.method,'POST');assert.equal(body.name,'example.com');assert.equal(body.type,'full');assert.equal(body.account.id,ACCOUNT_ID);return cloudflareResponse({id:ZONE_ID,name:'example.com',status:'pending',name_servers:['alice.ns.cloudflare.com','bob.ns.cloudflare.com']});},async()=>{const result=await getOrCreateFullZone(ENV,'example.com');assert.equal(result.reused,false);assert.equal(result.zone.id,ZONE_ID);assert.equal(result.zone.status,'pending');});assert.equal(calls.length,2);assert.equal(calls[1].options.method,'POST');});
test('attachDefaultWorkerDomains menolak zone yang belum aktif',async()=>{await assert.rejects(()=>attachDefaultWorkerDomains(ENV,{id:ZONE_ID,name:'example.com',status:'pending'}),e=>e?.code==='ZONE_NOT_ACTIVE');});
function attachmentFixture({zonePatch={},addressReady=true}={}){
 const requests=[],verifications=[],sequence=[],dnsQueries=[],attached=new Map();
 const nameservers=['alice.ns.cloudflare.com','bob.ns.cloudflare.com'];
 const mockFetch=async(url,options={})=>{
  const parsed=new URL(String(url)),method=options.method??'GET';
  if(['https://cloudflare-dns.com','https://dns.google'].includes(parsed.origin)){
   assert.equal(method,'GET');assert.equal(options.headers?.authorization,undefined);assert.equal(options.headers?.accept,'application/dns-json');
   assert.equal(parsed.pathname,parsed.origin==='https://dns.google'?'/resolve':'/dns-query');
   const name=parsed.searchParams.get('name'),type=parsed.searchParams.get('type');
   assert.ok(['A','AAAA','NS'].includes(type),'Unexpected DNS query type');
   if(type==='NS'){assert.equal(name,'example.com');assert.ok(attached.size>0);}else assert.ok(attached.has(name),'DNS verification must follow hostname attachment');
   dnsQueries.push({resolver:parsed.hostname,name,type});
   const Answer=type==='NS'?nameservers.map(data=>({name:'example.com',type:2,data:data+'.'})):type==='A'&&addressReady?[{name,type:1,data:'192.0.2.10'}]:[];
   return Response.json({Status:0,Answer});
  }
  assert.equal(parsed.origin,'https://api.cloudflare.com');
  if(parsed.pathname===`/client/v4/zones/${ZONE_ID}`){assert.equal(method,'GET');assert.equal(options.body,undefined);sequence.push('ZONE_GET');return cloudflareResponse({id:ZONE_ID,name:'example.com',status:'active',account:{id:ACCOUNT_ID},name_servers:nameservers,...zonePatch});}
  assert.equal(parsed.pathname,`/client/v4/accounts/${ACCOUNT_ID}/workers/domains`);sequence.push(method);
  if(method==='GET'){assert.equal(options.body,undefined);const hostname=parsed.searchParams.get('hostname');assert.ok(attached.has(hostname),'Verification must follow attachment');verifications.push(hostname);return cloudflareResponse([attached.get(hostname)]);}
  assert.equal(method,'PUT');assert.equal(parsed.search,'');const body=JSON.parse(options.body);
  assert.equal(body.service,'ngeblogging');assert.equal(body.zone_id,ZONE_ID);assert.equal(body.zone_name,'example.com');
  requests.push({url:String(url),method,body});const domain={id:`fixture-domain-${attached.size+1}`,hostname:body.hostname,service:body.service,zone_id:body.zone_id,zone_name:body.zone_name};attached.set(body.hostname,domain);return cloudflareResponse(domain);
 };
 return {mockFetch,requests,verifications,sequence,dnsQueries,attached};
}
test('attachDefaultWorkerDomains memasang apex dan www setelah verifikasi zone dan DNS',async()=>{
 const f=attachmentFixture();
 await withMockFetch(f.mockFetch,async()=>{const result=await attachDefaultWorkerDomains(ENV,{id:ZONE_ID,name:'example.com',status:'active'});assert.equal(result.apex.hostname,'example.com');assert.equal(result.www.hostname,'www.example.com');assert.equal(result.apex.id,f.attached.get('example.com').id);assert.equal(result.www.id,f.attached.get('www.example.com').id);for(const item of [result.apex,result.www]){assert.equal(item.dns_readiness.ready,true);assert.equal(item.dns_readiness.httpsVerified,false);assert.equal(item.dns_readiness.siteContentVerified,false);}});
 assert.equal(f.requests.length,2);assert.deepEqual(f.sequence,['ZONE_GET','PUT','GET','ZONE_GET','PUT','GET']);assert.deepEqual(f.verifications,['example.com','www.example.com']);assert.deepEqual(f.requests.map(r=>r.body.hostname),['example.com','www.example.com']);
 for(const request of f.requests){assert.equal(request.method,'PUT');assert.match(request.url,new RegExp(`/accounts/${ACCOUNT_ID}/workers/domains$`));assert.equal(request.body.service,'ngeblogging');assert.equal(request.body.zone_id,ZONE_ID);assert.equal(request.body.zone_name,'example.com');}
 assert.equal(f.dnsQueries.length,12);
 for(const resolver of ['cloudflare-dns.com','dns.google']){assert.equal(f.dnsQueries.filter(q=>q.resolver===resolver&&q.type==='NS'&&q.name==='example.com').length,2);for(const name of ['example.com','www.example.com'])for(const type of ['A','AAAA'])assert.equal(f.dnsQueries.filter(q=>q.resolver===resolver&&q.name===name&&q.type===type).length,1);}
});
test('attachWorkerDomain menolak akun zone berbeda sebelum memasang binding',async()=>{const f=attachmentFixture({zonePatch:{account:{id:'c'.repeat(32)}}});await withMockFetch(f.mockFetch,()=>assert.rejects(()=>attachWorkerDomain(ENV,{hostname:'example.com',zoneId:ZONE_ID,zoneName:'example.com'}),e=>e?.code==='FULL_ZONE_MISMATCH'));assert.equal(f.requests.length,0);assert.equal(f.dnsQueries.length,0);assert.deepEqual(f.sequence,['ZONE_GET']);});
test('DNS tanpa alamat tidak dinyatakan siap walaupun binding apex sudah dibuat',async()=>{const f=attachmentFixture({addressReady:false});await withMockFetch(f.mockFetch,()=>assert.rejects(()=>attachDefaultWorkerDomains(ENV,{id:ZONE_ID,name:'example.com',status:'active'}),e=>e?.code==='CUSTOM_DOMAIN_DNS_ADDRESS_MISSING'));assert.equal(f.requests.length,1);assert.deepEqual(f.verifications,['example.com']);assert.equal(f.attached.has('example.com'),true);assert.equal(f.attached.has('www.example.com'),false);assert.equal(f.dnsQueries.length,6);});
test('detachWorkerDomain melepaskan hostname dari Worker',async()=>{const id='11111111-1111-4111-8111-111111111111',calls=[];await withMockFetch(async(url,options={})=>{calls.push({url:String(url),method:options.method||'GET'});return cloudflareResponse(null);},async()=>{assert.equal(await detachWorkerDomain(ENV,id),null);});assert.equal(calls.length,1);assert.equal(calls[0].method,'DELETE');assert.equal(calls[0].url,`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/workers/domains/${id}`);});
test('deleteFullZone menghapus zone melalui endpoint yang benar',async()=>{const calls=[];await withMockFetch(async(url,options={})=>{calls.push({url:String(url),method:options.method||'GET'});return cloudflareResponse({id:ZONE_ID});},async()=>{assert.equal((await deleteFullZone(ENV,ZONE_ID)).id,ZONE_ID);});assert.equal(calls.length,1);assert.equal(calls[0].method,'DELETE');assert.equal(calls[0].url,`https://api.cloudflare.com/client/v4/zones/${ZONE_ID}`);});
