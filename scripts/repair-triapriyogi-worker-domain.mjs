import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
export const TARGET=Object.freeze({accountId:'095e57b46e7ba7f6b188480d9e4e5fe7',zoneId:'d46ebbf5bae36d4babe2a4604b4106a0',zoneName:'triapriyogi.com',service:'ngeblogging',hostnames:Object.freeze(['triapriyogi.com','www.triapriyogi.com'])});
const normalize=value=>String(value||'').trim().toLowerCase().replace(/\.$/,'');
const STAGES=new Set(['READ_ZONE','PRECHECK_BINDING_APEX','PRECHECK_BINDING_WWW','ATTACH_APEX','ATTACH_WWW','VERIFY_BINDING_APEX','VERIFY_BINDING_WWW','READ_DNS_APEX','READ_DNS_WWW']);
export function safeRepairError(error){
 const message=String(error?.message||'');
 if(new Set(['BUILD_COMMIT_UNVERIFIED','BUILD_DOMAIN_API_TOKEN_REQUIRED','REPAIR_TARGET_MISMATCH','CLOUDFLARE_TOKEN_REQUIRED','ZONE_IDENTITY_MISMATCH','ZONE_NOT_ACTIVE','WORKER_DOMAIN_RESPONSE_UNVERIFIED','WORKER_DOMAIN_AMBIGUOUS']).has(message))return message;
 const api=/^(CLOUDFLARE_REQUEST_REJECTED_HTTP_\d{3}|CLOUDFLARE_RESPONSE_UNVERIFIED)_(.+)$/.exec(message);
 if(api&&STAGES.has(api[2]))return message;
 for(const prefix of ['WORKER_DOMAIN_CONFLICT_','WORKER_DOMAIN_ATTACH_UNVERIFIED_','MANAGED_DNS_RECORD_NOT_CONFIRMED_'])if(message.startsWith(prefix)&&TARGET.hostnames.includes(message.slice(prefix.length)))return message;
 return 'CLOUDFLARE_BUILD_DOMAIN_REPAIR_FAILED';
}
export async function repairTriapriyogi({token,manifest,apply=false,fetchImpl=globalThis.fetch,pause=ms=>new Promise(resolve=>setTimeout(resolve,ms)),onProgress=()=>{}}={}){
 if(JSON.stringify(manifest)!==JSON.stringify(TARGET))throw Error('REPAIR_TARGET_MISMATCH');
 if(typeof token!=='string'||!token.trim()||/\s/.test(token))throw Error('CLOUDFLARE_TOKEN_REQUIRED');
 const api=async(path,{method='GET',body,stage}={})=>{
  if(!STAGES.has(stage))throw Error('CLOUDFLARE_RESPONSE_UNVERIFIED');
  const response=await fetchImpl('https://api.cloudflare.com/client/v4'+path,{method,redirect:'error',signal:AbortSignal.timeout(15000),headers:{authorization:'Bearer '+token,accept:'application/json',...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
  if(!response.ok)throw Error('CLOUDFLARE_REQUEST_REJECTED_HTTP_'+response.status+'_'+stage);
  const data=await response.json().catch(()=>null);if(data?.success!==true)throw Error('CLOUDFLARE_RESPONSE_UNVERIFIED_'+stage);return data.result;
 };
 const zone=await api('/zones/'+TARGET.zoneId,{stage:'READ_ZONE'});
 if(zone?.id!==TARGET.zoneId||normalize(zone.name)!==TARGET.zoneName||zone.account?.id!==TARGET.accountId)throw Error('ZONE_IDENTITY_MISMATCH');
 if(zone.status!=='active')throw Error('ZONE_NOT_ACTIVE');
 const tag=hostname=>hostname===TARGET.hostnames[0]?'APEX':'WWW';
 const lookup=async(hostname,purpose)=>{
  const rows=await api('/accounts/'+TARGET.accountId+'/workers/domains?hostname='+encodeURIComponent(hostname),{stage:purpose+'_BINDING_'+tag(hostname)});
  if(!Array.isArray(rows))throw Error('WORKER_DOMAIN_RESPONSE_UNVERIFIED');
  const matches=rows.filter(row=>normalize(row.hostname)===hostname);
  if(matches.length>1)throw Error('WORKER_DOMAIN_AMBIGUOUS');
  const row=matches[0];
  if(row&&(row.service!==TARGET.service||row.zone_id!==TARGET.zoneId||(row.environment&&row.environment!=='production')))throw Error('WORKER_DOMAIN_CONFLICT_'+hostname);
  return row||null;
 };
 const before=[];for(const hostname of TARGET.hostnames)before.push({hostname,binding:await lookup(hostname,'PRECHECK')});
 if(!apply)return {mode:'dry-run',target:TARGET,existing:before.map(row=>({hostname:row.hostname,attached:!!row.binding})),publicDnsVerified:false};
 const repaired=[];
 for(const hostname of TARGET.hostnames){
  await api('/accounts/'+TARGET.accountId+'/workers/domains',{method:'PUT',stage:'ATTACH_'+tag(hostname),body:{hostname,service:TARGET.service,zone_id:TARGET.zoneId,zone_name:TARGET.zoneName}});
  let binding=null;for(const delay of [0,250,750,1500]){if(delay)await pause(delay);binding=await lookup(hostname,'VERIFY');if(binding?.id)break;}
  if(!binding?.id)throw Error('WORKER_DOMAIN_ATTACH_UNVERIFIED_'+hostname);
  repaired.push({hostname,service:binding.service,bindingId:binding.id,managedDnsRecordConfirmed:false});
  onProgress({stage:'WORKER_BINDING_CONFIRMED',hostname});
 }
 for(const item of repaired){
  let ready=false;for(const delay of [0,250,750,1500]){
   if(delay)await pause(delay);
   const records=await api('/zones/'+TARGET.zoneId+'/dns_records?name='+encodeURIComponent(item.hostname),{stage:'READ_DNS_'+tag(item.hostname)});
   if(!Array.isArray(records))throw Error('CLOUDFLARE_RESPONSE_UNVERIFIED_READ_DNS_'+tag(item.hostname));
   ready=records.some(row=>normalize(row.name)===item.hostname&&['A','AAAA','CNAME'].includes(row.type)&&row.proxied===true);if(ready)break;
  }
  if(!ready)throw Error('MANAGED_DNS_RECORD_NOT_CONFIRMED_'+item.hostname);
  item.managedDnsRecordConfirmed=true;onProgress({stage:'MANAGED_DNS_RECORD_CONFIRMED',hostname:item.hostname});
 }
 return {mode:'applied',target:TARGET,repaired,publicDnsVerified:false,note:'Worker binding and managed DNS records confirmed via provider API. Public DNS propagation and HTTPS access still require independent checks.'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{
  const manifest=JSON.parse(await readFile(new URL('../ops/repair-triapriyogi-worker-domain-20261103.json',import.meta.url),'utf8'));
  const report=await repairTriapriyogi({token:process.env.CLOUDFLARE_DOMAIN_API_TOKEN||process.env.CLOUDFLARE_API_TOKEN,manifest,apply:process.argv.includes('--apply'),onProgress:event=>console.log(event.stage+':'+event.hostname)});
  console.log(JSON.stringify(report,null,2));
 }catch(error){console.error(safeRepairError(error));process.exitCode=1;}
}
