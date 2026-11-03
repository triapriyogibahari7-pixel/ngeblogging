import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
export const TARGET=Object.freeze({accountId:'095e57b46e7ba7f6b188480d9e4e5fe7',zoneId:'d46ebbf5bae36d4babe2a4604b4106a0',zoneName:'triapriyogi.com',service:'ngeblogging',hostnames:Object.freeze(['triapriyogi.com','www.triapriyogi.com'])});
const normalize=value=>String(value||'').trim().toLowerCase().replace(/\.$/,'');
export async function repairTriapriyogi({token,manifest,apply=false,fetchImpl=globalThis.fetch}={}){
 if(JSON.stringify(manifest)!==JSON.stringify(TARGET))throw Error('REPAIR_TARGET_MISMATCH');
 if(typeof token!=='string'||!token.trim()||/\s/.test(token))throw Error('CLOUDFLARE_TOKEN_REQUIRED');
 const api=async(path,{method='GET',body}={})=>{
  const response=await fetchImpl('https://api.cloudflare.com/client/v4'+path,{method,redirect:'error',signal:AbortSignal.timeout(15000),headers:{authorization:'Bearer '+token,accept:'application/json',...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
  const data=await response.json();if(!response.ok||data.success!==true)throw Error('CLOUDFLARE_REQUEST_REJECTED_HTTP_'+response.status);return data.result;
 };
 const zone=await api('/zones/'+TARGET.zoneId);
 if(zone?.id!==TARGET.zoneId||normalize(zone.name)!==TARGET.zoneName||zone.account?.id!==TARGET.accountId)throw Error('ZONE_IDENTITY_MISMATCH');
 if(zone.status!=='active')throw Error('ZONE_NOT_ACTIVE');
 const lookup=async hostname=>{
  const rows=await api('/accounts/'+TARGET.accountId+'/workers/domains?hostname='+encodeURIComponent(hostname));
  if(!Array.isArray(rows))throw Error('WORKER_DOMAIN_RESPONSE_UNVERIFIED');
  const matches=rows.filter(row=>normalize(row.hostname)===hostname);
  if(matches.length>1)throw Error('WORKER_DOMAIN_AMBIGUOUS');
  const row=matches[0];
  if(row&&(row.service!==TARGET.service||row.zone_id!==TARGET.zoneId||(row.environment&&row.environment!=='production')))throw Error('WORKER_DOMAIN_CONFLICT_'+hostname);
  return row||null;
 };
 const before=[];for(const hostname of TARGET.hostnames)before.push({hostname,binding:await lookup(hostname)});
 if(!apply)return {mode:'dry-run',target:TARGET,existing:before.map(row=>({hostname:row.hostname,attached:!!row.binding})),publicDnsVerified:false};
 const repaired=[];
 for(const hostname of TARGET.hostnames){
  await api('/accounts/'+TARGET.accountId+'/workers/domains',{method:'PUT',body:{hostname,service:TARGET.service,zone_id:TARGET.zoneId,zone_name:TARGET.zoneName}});
  const binding=await lookup(hostname);if(!binding?.id)throw Error('WORKER_DOMAIN_ATTACH_UNVERIFIED_'+hostname);
  const records=await api('/zones/'+TARGET.zoneId+'/dns_records?name='+encodeURIComponent(hostname));
  if(!Array.isArray(records)||!records.some(row=>normalize(row.name)===hostname&&['A','AAAA','CNAME'].includes(row.type)&&row.proxied===true))throw Error('MANAGED_DNS_RECORD_NOT_CONFIRMED_'+hostname);
  repaired.push({hostname,service:binding.service,bindingId:binding.id,managedDnsRecordConfirmed:true});
 }
 return {mode:'applied',target:TARGET,repaired,publicDnsVerified:false,note:'Worker binding and managed DNS records confirmed via provider API. Public DNS propagation and HTTPS access still require independent checks.'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{
  const manifest=JSON.parse(await readFile(new URL('../ops/repair-triapriyogi-worker-domain-20261103.json',import.meta.url),'utf8'));
  const report=await repairTriapriyogi({token:process.env.CLOUDFLARE_DOMAIN_API_TOKEN||process.env.CLOUDFLARE_API_TOKEN,manifest,apply:process.argv.includes('--apply')});
  console.log(JSON.stringify(report,null,2));
 }catch(error){console.error(error.message);process.exitCode=1;}
}
