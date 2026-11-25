// Cloudflare DNS/DNSSEC adapter for purchased domains. Every call is zone-scoped to this account.
const API='https://api.cloudflare.com/client/v4',ACCOUNT='095e57b46e7ba7f6b188480d9e4e5fe7',ID=/^[0-9a-f]{32}$/i;
const fail=(code,status=502)=>Object.assign(new Error(code),{code,status});
export function createDnsAdapter(env,{fetchImpl=globalThis.fetch,signal}={}){
 const token=String(env?.CLOUDFLARE_DOMAIN_API_TOKEN||env?.CLOUDFLARE_API_TOKEN||'').trim();
 if(!token||/\s/.test(token)||(env.CLOUDFLARE_ACCOUNT_ID&&env.CLOUDFLARE_ACCOUNT_ID!==ACCOUNT))throw fail('DNS_PROVIDER_NOT_CONFIGURED',503);
 async function call(path,{method='GET',body}={}){
  const r=await fetchImpl(API+path,{method,redirect:'manual',cache:'no-store',signal,headers:{authorization:'Bearer '+token,accept:'application/json',...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
  let p;try{p=JSON.parse(await r.text());}catch{throw fail('DNS_PROVIDER_INVALID_RESPONSE');}
  if(r.status===401||r.status===403)throw fail('DNS_PROVIDER_PERMISSION_REQUIRED',503);
  if(r.status===429)throw fail('DNS_PROVIDER_RATE_LIMITED',503);
  if(!r.ok||p?.success===false){const msg=String(p?.errors?.[0]?.message||'');throw Object.assign(fail(r.status>=500?'DNS_PROVIDER_UNAVAILABLE':'DNS_PROVIDER_REJECTED',r.status>=500?502:422),{detail:msg.slice(0,200)});}
  return p;
 }
 const zonePath=(zoneId,rest='')=>{if(!ID.test(zoneId))throw fail('INVALID_ZONE',400);return '/zones/'+zoneId+rest;};
 return {
  async findZone(domain){
   const p=await call('/zones?'+new URLSearchParams({name:domain,'account.id':ACCOUNT,per_page:'2'}));
   const z=Array.isArray(p.result)?p.result:[];
   if(z.length!==1||z[0].name!==domain||z[0].account?.id!==ACCOUNT||z[0].type!=='full'||!ID.test(z[0].id))throw fail('ZONE_NOT_FOUND',404);
   return {id:z[0].id,name:z[0].name,status:z[0].status};
  },
  async listRecords(zoneId){
   const out=[];for(let page=1;page<=10;page++){
    const p=await call(zonePath(zoneId,'/dns_records?'+new URLSearchParams({page:String(page),per_page:'100'})));
    out.push(...(p.result||[]));if(page>=(p.result_info?.total_pages||1))return out;
   }
   throw fail('DNS_TOO_MANY_RECORDS',422);
  },
  async createRecord(zoneId,record){return (await call(zonePath(zoneId,'/dns_records'),{method:'POST',body:record})).result;},
  async updateRecord(zoneId,id,record){if(!ID.test(id))throw fail('INVALID_RECORD_ID',400);return (await call(zonePath(zoneId,'/dns_records/'+id),{method:'PATCH',body:record})).result;},
  async deleteRecord(zoneId,id){if(!ID.test(id))throw fail('INVALID_RECORD_ID',400);await call(zonePath(zoneId,'/dns_records/'+id),{method:'DELETE'});},
  async getDnssec(zoneId){const r=(await call(zonePath(zoneId,'/dnssec'))).result||{};return {status:String(r.status||'unknown'),ds:r.ds||null,algorithm:r.algorithm||null,digest:r.digest||null,digestType:r.digest_type||null,keyTag:r.key_tag??null};},
  async setDnssec(zoneId,enabled){const r=(await call(zonePath(zoneId,'/dnssec'),{method:'PATCH',body:{status:enabled?'active':'disabled'}})).result||{};return {status:String(r.status||'unknown'),ds:r.ds||null};}
 };
}
