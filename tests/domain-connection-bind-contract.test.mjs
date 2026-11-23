import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import net from 'node:net';
import {webcrypto} from 'node:crypto';
const deny=()=>{throw Error('LIVE_NETWORK_FORBIDDEN');};
globalThis.fetch=deny;net.Socket.prototype.connect=deny;
const SITE='22222222-2222-4222-8222-222222222222',USER='11111111-1111-4111-8111-111111111111';
const DOMAIN='33333333-3333-4333-8333-333333333333',ZONE='a'.repeat(32),ACCOUNT='b'.repeat(32);
async function load(path,dependencies,fetchImpl=deny){
 const context=vm.createContext({Response,Request,Headers,URL,TextDecoder,AbortController,AbortSignal,setTimeout,clearTimeout,crypto:webcrypto,fetch:fetchImpl,console:{error(){}}});
 const module=new vm.SourceTextModule(readFileSync(new URL(path,import.meta.url),'utf8'),{context,identifier:path});
 await module.link(async name=>{
  const exports=dependencies[name];assert.ok(exports,'Unexpected import: '+name);
  return new vm.SyntheticModule(Object.keys(exports),function(){for(const [key,value]of Object.entries(exports))this.setExport(key,value);},{context});
 });await module.evaluate();return module.namespace;
}
const INPUT={orderId:'DCON-'+'1'.repeat(32),userId:USER,siteId:SITE};
const jobs=[{domainId:DOMAIN,hostname:'customer.example',providerHostnameId:'c'.repeat(32)},{domainId:'44444444-4444-4444-8444-444444444444',hostname:'www.customer.example',providerHostnameId:'d'.repeat(32)}];
async function paid({primaryResult=false,primaryChanged=false,wwwUnavailable=false,duplicateDomain=false}={}){
 const calls=[];
 const provisioned={...INPUT,hostname:'customer.example',jobs};
 const api=await load('../server/domain-connection-install-and-bind.mjs',{'./domain-connection-provider-installation.mjs':{installPaidConnectionProviderPair:async()=>provisioned}});
 const env={CLOUDFLARE_ZONE_ID:ZONE,CLOUDFLARE_ACCOUNT_ID:ACCOUNT,CLOUDFLARE_API_TOKEN:'unit-test-only',CLOUDFLARE_CUSTOM_HOSTNAME_TARGET:'connect.ngeblogging.com',DOMAIN_MIDTRANS_PRODUCTION_MERCHANT_ID:'unit_test',SUPABASE_SERVICE_ROLE_KEY:'unit-test-only'};
 const cf='https://api.cloudflare.com/client/v4/zones/'+ZONE;
 const fetchImpl=async(url,init={})=>{
  calls.push({url,method:init.method||'GET',body:init.body?JSON.parse(init.body):null});
  if(url===cf)return Response.json({success:true,result:{id:ZONE,name:'ngeblogging.com',status:'active',account:{id:ACCOUNT}}});
  if(url===cf+'/custom_hostnames/fallback_origin')return Response.json({success:true,result:{origin:'fallback.ngeblogging.com',status:'active'}});
  const job=jobs.find(j=>url===cf+'/custom_hostnames/'+j.providerHostnameId);
  if(job){if(wwwUnavailable&&job.hostname.startsWith('www.'))return Response.json({success:false},{status:503});return Response.json({success:true,result:{id:job.providerHostnameId,hostname:job.hostname,status:'active',ssl:{status:'active',validation_records:[]}}});}
  if(url==='https://polvmlrhqoiflumibfqs.supabase.co/rest/v1/rpc/domain_connection_install_bind_v1'&&init.method==='POST'){
   const domains=jobs.map(j=>({id:j.domainId,site_id:SITE,hostname:j.hostname,provider_hostname_id:j.providerHostnameId,provider:'cloudflare-custom-hostnames',is_primary:primaryResult,status:'verifying'}));
   if(duplicateDomain)domains[1]={...domains[0]};
   return Response.json({ok:true,orderId:INPUT.orderId,siteId:SITE,hostname:'customer.example',registryBindingCompleted:true,primaryChanged,domains});
  }throw Error('UNEXPECTED_PAID_UPSTREAM '+url);
 };
 return {execute:()=>api.installAndBindPaidConnectionPair(INPUT,env,{fetchImpl}),calls};
}
test('paid binding: valid two-hostname result stays non-primary and does not claim service active',async()=>{
 const p=await paid(),r=await p.execute();assert.equal(r.stage,'registry-bound');assert.equal(r.primaryChanged,false);assert.equal(r.activationChecked,false);assert.equal(r.serviceActive,null);assert.equal(r.domains.length,2);assert.ok(r.domains.every(d=>d.is_primary===false));
 const rpc=p.calls.filter(c=>c.method==='POST');assert.equal(rpc.length,1);assert.equal(rpc[0].body.p_results.length,2);assert.equal(p.calls.some(c=>c.url.includes('/sites?')),false);
});
test('paid binding: rejects RPC result containing primary domain',async()=>{
 const p=await paid({primaryResult:true});await assert.rejects(()=>p.execute(),e=>e.code==='BIND_SAVE_IDENTITY_UNVERIFIED');
});
test('paid binding: rejects RPC claim of primary change',async()=>{
 const p=await paid({primaryChanged:true});await assert.rejects(()=>p.execute(),e=>e.code==='BIND_SAVE_UNVERIFIED');
});
test('paid binding: rejects duplicate domain identity',async()=>{
 const p=await paid({duplicateDomain:true});await assert.rejects(()=>p.execute(),e=>e.code==='BIND_SAVE_IDENTITY_UNVERIFIED');
});
test('paid binding: unavailable www prevents bind RPC rather than claiming pair completed',async()=>{
 const p=await paid({wwwUnavailable:true});await assert.rejects(()=>p.execute(),e=>e.code==='BIND_UPSTREAM_UNAVAILABLE');assert.equal(p.calls.some(c=>c.method==='POST'),false);
});
