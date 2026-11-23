import test from 'node:test';
import assert from 'node:assert/strict';
import {handleDomainRequest} from '../server/domain-handler.mjs';
const account='a'.repeat(32),zone='b'.repeat(32);
const siteId='11111111-1111-4111-8111-111111111111',userId='22222222-2222-4222-8222-222222222222',domainId='33333333-3333-4333-8333-333333333333';
const env={CUSTOM_DOMAIN_PROVIDER:'cloudflare-full-zone',CLOUDFLARE_API_TOKEN:'test-token',CLOUDFLARE_ACCOUNT_ID:account,CLOUDFLARE_WORKER_SERVICE:'ngeblogging',SUPABASE_URL:'https://project.supabase.co',SUPABASE_PUBLISHABLE_KEY:'test-key'};
const json=value=>Response.json(value);
for(const primary of [false,true]){
 test(primary?'refresh preserves an existing primary domain':'refresh activates an additional domain without replacing the free-site mapping',async()=>{
  const original=globalThis.fetch,bindings=new Map(),siteWrites=[],otherDomainWrites=[];
  let saved=null;
  const row={id:domainId,site_id:siteId,hostname:'example.com',status:'verifying',provider:'cloudflare-full-zone',provider_hostname_id:zone,provider_status:'pending',ssl_status:'pending',ownership_verification:{},ssl_validation:[],is_primary:primary,verified_at:null};
  globalThis.fetch=async(input,options={})=>{
   const u=new URL(String(input)),method=options.method||'GET';
   if(u.origin==='https://project.supabase.co'){
    if(u.pathname==='/auth/v1/user')return json({id:userId});
    if(u.pathname==='/rest/v1/site_members'&&method==='GET')return json([{role:'owner'}]);
    if(u.pathname==='/rest/v1/site_domains'&&method==='GET')return json([row]);
    if(u.pathname==='/rest/v1/sites'&&method==='GET')return json([{id:siteId,owner_id:userId,slug:'burneoprime',custom_domain:'burneoprime.ngeblogging.com'}]);
    if(u.pathname==='/rest/v1/site_domains'&&method==='PATCH'){
     const body=JSON.parse(options.body);
     if(u.searchParams.get('id')==='eq.'+domainId){saved=body;return json([{...row,...body}]);}
     otherDomainWrites.push(body);return json([]);
    }
    if(u.pathname==='/rest/v1/sites'&&method==='PATCH'){siteWrites.push(JSON.parse(options.body));return json([]);}
   }
   if(u.hostname==='api.cloudflare.com'){
    if(u.pathname==='/client/v4/zones/'+zone&&method==='GET')return json({success:true,result:{id:zone,account:{id:account},name:'example.com',type:'full',status:'active',name_servers:['alice.ns.cloudflare.com','bob.ns.cloudflare.com']}});
    if(u.pathname==='/client/v4/accounts/'+account+'/workers/domains'){
     if(method==='GET'){const found=bindings.get(u.searchParams.get('hostname'));return json({success:true,result:found?[found]:[]});}
     if(method==='PUT'){const b=JSON.parse(options.body),value={...b,id:crypto.randomUUID(),cert_id:crypto.randomUUID()};bindings.set(b.hostname,value);return json({success:true,result:value});}
    }
   }
   if(['dns.google','cloudflare-dns.com'].includes(u.hostname)&&method==='GET'){
    const name=u.searchParams.get('name'),type=u.searchParams.get('type');
    const records={A:[{name,type:1,TTL:60,data:'192.0.2.1'}],AAAA:[{name,type:28,TTL:60,data:'2001:db8::1'}],NS:[{name,type:2,TTL:60,data:'alice.ns.cloudflare.com.'},{name,type:2,TTL:60,data:'bob.ns.cloudflare.com.'}]};
    assert.ok(Object.hasOwn(records,type));return json({Status:0,Answer:records[type]});
   }
   throw Error('Unexpected request: '+method+' '+u);
  };
  try{
   const response=await handleDomainRequest(new Request('https://ngeblogging.com/api/domains/refresh',{method:'POST',headers:{authorization:'Bearer test-session','content-type':'application/json'},body:JSON.stringify({domainId})}),env);
   const result=await response.json();
   assert.equal(response.status,200,JSON.stringify(result));
   assert.ok(saved,'domain state must be persisted');
   assert.equal(saved.status,'active');
   assert.equal(saved.is_primary,primary,'refresh must not promote an additional domain');
   assert.equal(result.domain.id,domainId);
   assert.equal(result.domain.site_id,siteId);
   if(!primary){assert.deepEqual(siteWrites,[],'additional domain must not replace the site mapping');assert.deepEqual(otherDomainWrites,[],'additional domain must not demote other domains');}
   else{assert.ok(siteWrites.some(x=>x.custom_domain==='example.com'));}
  }finally{globalThis.fetch=original;}
 });
}
