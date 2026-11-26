import {createDnsAdapter} from './domain-dns-cloudflare-adapter.mjs';
import {publicRecord,EDITABLE_TYPES} from '../shared/domain-dns-records.mjs';
// DNS adapter that journals every mutation: pre-change backup, single-use claim, per-zone lock, verified outcome.
const SUPABASE='https://polvmlrhqoiflumibfqs.supabase.co';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const STATUS={DNS_ZONE_OPERATION_LOCKED:409,DNS_CONFIRMATION_OR_SNAPSHOT_CHANGED:409,DNS_OPERATION_NOT_CLAIMABLE:409,DNS_CURRENT_REGISTRATION_REQUIRED:403,DNS_OWNERSHIP_PROOF_STALE:503,PLATFORM_ZONE_FORBIDDEN:403};
const DEFINITE=new Set(['DNS_PROVIDER_REJECTED','DNS_PROVIDER_PERMISSION_REQUIRED','DNS_PROVIDER_RATE_LIMITED','INVALID_ZONE','INVALID_RECORD_ID']);
const fail=(code,status)=>Object.assign(new Error(code),{code,status});
const canon=v=>Array.isArray(v)?'['+v.map(canon).join(',')+']':v&&typeof v==='object'?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canon(v[k])).join(',')+'}':JSON.stringify(v);
const sha=async v=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canon(v))))].map(b=>b.toString(16).padStart(2,'0')).join('');
function norm(r){
 let c=String(r.content??'');
 if(r.type==='TXT'&&c.length>1&&c.startsWith('"')&&c.endsWith('"'))c=c.slice(1,-1);
 if(r.type==='CNAME'||r.type==='MX')c=c.toLowerCase().replace(/\.$/,'');
 if(r.type==='AAAA'){try{c=new URL('http://['+c+']/').hostname.slice(1,-1);}catch{}}
 return {type:r.type,name:String(r.name).toLowerCase(),content:c,ttl:r.proxied?1:r.ttl,proxied:Boolean(r.proxied),priority:r.priority??null};
}
export const recordKey=r=>canon(norm(r));
const keys=list=>list.map(recordKey).sort();
const sameSet=(a,b)=>canon(keys(a))===canon(keys(b));
export function createJournaledDnsAdapter(env,{fetchImpl=globalThis.fetch,signal,journal}={}){
 const raw=createDnsAdapter(env,{fetchImpl,signal}),svc=String(env?.SUPABASE_SERVICE_ROLE_KEY||'');
 const ready=Boolean(journal&&UUID.test(journal.userId||'')&&/^DOM-[a-f0-9]{40}$/.test(journal.orderId||'')&&typeof journal.domain==='string'&&Number.isFinite(Date.parse(journal.registrationCreatedAt))&&Number.isFinite(Date.parse(journal.checkedAt))&&svc&&String(env?.SUPABASE_URL||'').replace(/\/$/,'')===SUPABASE);
 async function rpc(name,args){
  const r=await fetchImpl(SUPABASE+'/rest/v1/rpc/'+name,{method:'POST',redirect:'manual',cache:'no-store',signal,headers:{apikey:svc,authorization:'Bearer '+svc,'content-type':'application/json',accept:'application/json'},body:JSON.stringify(args)});
  let body=null;try{const t=await r.text();body=t?JSON.parse(t):null;}catch{}
  if(r.status===200||r.status===204)return body;
  const m=String(body?.message||'');throw fail(STATUS[m]?m:'DNS_JOURNAL_UNAVAILABLE',STATUS[m]||503);
 }
 const editable=async zoneId=>(await raw.listRecords(zoneId)).filter(r=>EDITABLE_TYPES.includes(r.type)).map(publicRecord);
 const hashOf=list=>sha([...list].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0));
 async function run(zoneId,plan,mutate,verify){
  if(!ready)throw fail('DNS_JOURNAL_UNAVAILABLE',503);
  const before=await editable(zoneId),beforeHash=await hashOf(before),proof={p_registration_created_at:journal.registrationCreatedAt,p_checked_at:journal.checkedAt};
  const opId=await rpc('account_domain_dns_prepare_v1',{p_user_id:journal.userId,p_order_id:journal.orderId,p_domain:journal.domain,p_zone_id:zoneId,p_kind:'dns_records',p_snapshot:{domain:journal.domain,zoneId,records:before},p_before_sha256:beforeHash,p_plan:{domain:journal.domain,zoneId,...plan},...proof,p_restore_source_id:null});
  if(typeof opId!=='string'||!UUID.test(opId))throw fail('DNS_JOURNAL_UNAVAILABLE',503);
  await rpc('account_domain_dns_claim_v1',{p_user_id:journal.userId,p_operation_id:opId,p_current_sha256:await hashOf(await editable(zoneId)),p_confirmation_domain:journal.domain,...proof});
  const finish=(state,after,code,verified)=>rpc('account_domain_dns_finish_v1',{p_user_id:journal.userId,p_operation_id:opId,p_state:state,p_after_sha256:after,p_result_code:code,p_provider_verified:verified});
  const unknown=async code=>{try{await finish('outcome_unknown',null,code,false);}catch{}throw fail('DNS_OUTCOME_UNCONFIRMED',502);};
  let result,thrown=null,after=null,afterHash=null;
  try{result=await mutate();}catch(error){thrown=error;}
  try{after=await editable(zoneId);afterHash=await hashOf(after);}catch{}
  if(afterHash===null)return unknown('DNS_REREAD_FAILED');
  if(thrown){
   if(DEFINITE.has(thrown.code)&&afterHash===beforeHash){try{await finish('failed',afterHash,'DNS_PROVIDER_REJECTED',true);}catch{throw fail('DNS_OUTCOME_UNCONFIRMED',502);}throw thrown;}
   return unknown('DNS_PROVIDER_OUTCOME_UNKNOWN');
  }
  if(!verify(before,after,result))return unknown('DNS_VERIFICATION_FAILED');
  try{await finish('succeeded',afterHash,'DNS_VERIFIED',true);}catch{throw fail('DNS_OUTCOME_UNCONFIRMED',502);}
  return result;
 }
 const others=(list,id)=>list.filter(r=>r.id!==id);
 return {
  findZone:raw.findZone,listRecords:raw.listRecords,getDnssec:raw.getDnssec,setDnssec:raw.setDnssec,
  createRecord:(zoneId,rec)=>run(zoneId,{action:'create',type:rec.type,name:rec.name},()=>raw.createRecord(zoneId,rec),(b,a,c)=>Boolean(c?.id)&&a.some(r=>r.id===c.id&&recordKey(r)===recordKey(rec))&&sameSet(others(a,c.id),b)),
  updateRecord:(zoneId,id,rec)=>run(zoneId,{action:'update',recordId:id,type:rec.type,name:rec.name},()=>raw.updateRecord(zoneId,id,rec),(b,a)=>a.some(r=>r.id===id&&recordKey(r)===recordKey(rec))&&sameSet(others(a,id),others(b,id))),
  deleteRecord:(zoneId,id)=>run(zoneId,{action:'delete',recordId:id},()=>raw.deleteRecord(zoneId,id),(b,a)=>!a.some(r=>r.id===id)&&sameSet(a,others(b,id))),
  runOperation:(zoneId,plan,mutate,verify)=>run(zoneId,plan,()=>mutate(raw),verify)
 };
}
