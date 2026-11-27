import {createImportJournaledDnsAdapter} from './domain-import-dns-adapter.mjs';
const SUPABASE='https://polvmlrhqoiflumibfqs.supabase.co';
const DOMAIN=/^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z](?:[a-z0-9-]{0,61}[a-z0-9])$/;
const ZONE_ID=/^[0-9a-f]{32}$/;
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const ORDER=/^IMP-[a-f0-9]{40}$/;
const ADDRESS_TYPES=['A','AAAA','CNAME'];
const MAX_HOSTS=12;
const DEFAULT_ORIGIN='fallback.ngeblogging.com';
const lower=v=>String(v||'').trim().toLowerCase().replace(/\.$/,'');
export function plannedHosts(domain,rows,records){
 const d=lower(domain);if(!DOMAIN.test(d))return [];
 const have=new Set((Array.isArray(records)?records:[]).filter(r=>ADDRESS_TYPES.includes(r?.type)).map(r=>lower(r.name)));
 const out=[];
 for(const r of Array.isArray(rows)?rows:[]){
  const h=lower(r?.hostname);
  if(r?.provider!=='cloudflare'||r?.status!=='active')continue;
  if(!DOMAIN.test(h)||(h!==d&&!h.endsWith('.'+d)))continue;
  if(have.has(h)||out.includes(h))continue;
  out.push(h);if(out.length>=MAX_HOSTS)break;
 }
 return out;
}
export async function provisionSaasRecords(env,{domain,zoneId,userId,orderId,fetchImpl=globalThis.fetch,signal,adapter}={}){
 if(env?.DOMAIN_IMPORT_AUTO_RECORDS!=='true')return {skipped:'DISABLED'};
 const d=lower(domain);
 if(!DOMAIN.test(d)||!ZONE_ID.test(String(zoneId||''))||!UUID.test(String(userId||''))||!ORDER.test(String(orderId||'')))return {skipped:'INVALID_INPUT'};
 const svc=String(env?.SUPABASE_SERVICE_ROLE_KEY||'');
 if(!svc||String(env?.SUPABASE_URL||'').replace(/\/$/,'')!==SUPABASE)return {skipped:'CONFIGURATION_UNAVAILABLE'};
 const origin=lower(env?.CUSTOM_DOMAIN_FALLBACK_ORIGIN)||DEFAULT_ORIGIN;
 if(!DOMAIN.test(origin))return {skipped:'ORIGIN_INVALID'};
 const url=new URL('/rest/v1/site_domains',SUPABASE);
 url.searchParams.set('select','hostname,provider,status');url.searchParams.set('provider','eq.cloudflare');url.searchParams.set('status','eq.active');url.searchParams.set('or','(hostname.eq.'+d+',hostname.like.*.'+d+')');url.searchParams.set('limit','50');
 const r=await fetchImpl(url.href,{method:'GET',redirect:'manual',signal,headers:{apikey:svc,authorization:'Bearer '+svc}});
 if(r.status!==200)return {skipped:'SITE_DOMAINS_UNAVAILABLE'};
 const rows=await r.json();
 const dns=adapter||createImportJournaledDnsAdapter(env,{fetchImpl,signal,journal:{userId,orderId,domain:d,checkedAt:new Date().toISOString()}});
 const hosts=plannedHosts(d,rows,await dns.listRecords(zoneId));
 const created=[],failed=[];
 for(const h of hosts){try{await dns.createRecord(zoneId,{type:'CNAME',name:h,content:origin,ttl:1,proxied:true});created.push(h);}catch(e){failed.push({hostname:h,code:String(e?.code||'DNS_CREATE_FAILED')});}}
 return {created,failed};
}
