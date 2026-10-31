// Isolated-test adapter only; not wired into a Worker or active panel.
// Approval of a test origin is configuration, not proof that a remote project is disposable.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BLOCKED=new Set(['polvmlrhqoiflumibfqs.supabase.co','sxzwlovbmeyghmcepcmo.supabase.co']);
const fail=code=>{throw Object.assign(new Error(code),{code,status:503});};
function caller(token){
  if(typeof token!=='string'||!token||/\s/.test(token)||token.startsWith('sb_secret_'))fail('CALLER_TOKEN_REQUIRED');
  if(token.split('.').length===3){
    try{const part=token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');const claims=JSON.parse(atob(part));if(claims.role==='service_role')fail('SERVICE_ROLE_FORBIDDEN');}
    catch(error){if(error.code==='SERVICE_ROLE_FORBIDDEN')throw error;fail('INVALID_CALLER_TOKEN');}
  }
  return token;
}
export function createIsolatedTransferAdapters({databaseUrl,publishableKey,approvedTestOrigin,environment='',fetchImpl=fetch,timeoutMs=10000}={}){
  if(environment!=='isolated-test')fail('ISOLATED_ENVIRONMENT_REQUIRED');
  let base,approved;try{base=new URL(databaseUrl);approved=new URL(approvedTestOrigin);}catch{fail('EXPLICIT_TEST_ORIGIN_REQUIRED');}
  const local=['localhost','127.0.0.1','[::1]'].includes(base.hostname);
  if(BLOCKED.has(base.hostname)||base.hostname==='ngeblogging.com'||base.hostname.endsWith('.ngeblogging.com'))fail('PRODUCTION_OR_UNRELATED_PROJECT_FORBIDDEN');
  if(base.origin!==approved.origin||base.username||base.password||approved.username||approved.password||base.pathname!=='/'||base.search||base.hash||approved.pathname!=='/'||approved.search||approved.hash||(!local&&(base.protocol!=='https:'||!base.hostname.endsWith('.supabase.co')||base.port))||(local&&!['http:','https:'].includes(base.protocol)))fail('TEST_ORIGIN_NOT_ALLOWED');
  if(typeof publishableKey!=='string'||!/^sb_publishable_[A-Za-z0-9_-]+$/.test(publishableKey))fail('MODERN_PUBLISHABLE_KEY_REQUIRED');
  if(typeof fetchImpl!=='function'||!Number.isFinite(timeoutMs)||timeoutMs<=0||timeoutMs>30000)fail('INVALID_TRANSPORT_CONFIGURATION');
  async function request(path,token,{method='GET',body,headers={}}={}){
    caller(token);const controller=new AbortController();let timer;
    try{return await Promise.race([(async()=>{
      const response=await fetchImpl(new URL(path,base.origin),{method,redirect:'error',cache:'no-store',signal:controller.signal,headers:{apikey:publishableKey,authorization:`Bearer ${token}`,accept:'application/json',...(body?{'content-type':'application/json'}:{}),...headers},...(body?{body:JSON.stringify(body)}:{})});
      const data=await response.json().catch(()=>fail('INVALID_STORAGE_RESPONSE'));
      if(!response.ok){if(path==='/auth/v1/user'&&[401,403].includes(response.status))throw Object.assign(new Error('INVALID_SESSION'),{code:'INVALID_SESSION',status:401});fail('TRANSFER_STORAGE_UNAVAILABLE');}
      return {data,response};
    })(),new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Object.assign(new Error('TRANSFER_STORAGE_TIMEOUT'),{code:'TRANSFER_STORAGE_TIMEOUT',status:503}));},timeoutMs);})]);}
    finally{clearTimeout(timer);}
  }
  const one=data=>{if(!Array.isArray(data)||data.length>1)fail('INVALID_STORAGE_ROWS');return data[0]||null;};
  const query=(table,params)=>`/rest/v1/${table}?${new URLSearchParams(params)}`;
  return {
    async authenticate(token){const {data}=await request('/auth/v1/user',token);if(!data||typeof data.id!=='string'||!UUID.test(data.id))fail('INVALID_AUTH_RESPONSE');return {id:data.id};},
    async loadSnapshot({token,userId,domainId,sourceSiteId,targetSiteId}){
      if([userId,domainId,sourceSiteId,targetSiteId].some(id=>typeof id!=='string'||!UUID.test(id)))fail('INVALID_SNAPSHOT_IDENTIFIERS');
      const site=async id=>one((await request(query('sites',{id:`eq.${id}`,select:'id,owner_id,slug,status,custom_domain',limit:'2'}),token)).data);
      const member=async id=>{const row=one((await request(query('site_members',{site_id:`eq.${id}`,user_id:`eq.${userId}`,select:'site_id,user_id,role',limit:'2'}),token)).data);if(row&&(row.site_id!==id||row.user_id!==userId))fail('MEMBERSHIP_RESPONSE_MISMATCH');return row?.role||null;};
      const sourceSite=await site(sourceSiteId),targetSite=await site(targetSiteId);
      const domain=one((await request(query('site_domains',{id:`eq.${domainId}`,select:'id,site_id,hostname,status,provider,is_primary',limit:'2'}),token)).data);
      const sourceRole=await member(sourceSiteId),targetRole=await member(targetSiteId);
      const {data:targetDomains,response}=await request(query('site_domains',{site_id:`eq.${targetSiteId}`,select:'id,site_id,hostname,status,provider,is_primary',order:'id.asc',limit:'100'}),token,{headers:{prefer:'count=exact'}});
      const match=/\/(\d+)$/.exec(response.headers.get('content-range')||'');
      if(!Array.isArray(targetDomains)||!match||Number(match[1])!==targetDomains.length||targetDomains.length>100||targetDomains.some(row=>row?.site_id!==targetSiteId))fail('TARGET_SNAPSHOT_INCOMPLETE');
      return {sourceSite,targetSite,domain,sourceRole,targetRole,targetDomains,targetLoaded:true};
    },
    async move({token,args}){
      const keys=['p_domain_id','p_source_site_id','p_target_site_id','p_confirm_hostname'];
      if(!args||Array.isArray(args)||Object.keys(args).length!==4||keys.some(k=>!Object.hasOwn(args,k))||keys.slice(0,3).some(k=>typeof args[k]!=='string'||!UUID.test(args[k]))||args.p_source_site_id===args.p_target_site_id||typeof args.p_confirm_hostname!=='string'||!args.p_confirm_hostname.trim()||args.p_confirm_hostname.length>253)fail('INVALID_RPC_ARGUMENTS');
      // Exactly one request. No detach/register sequence or automatic replay.
      return (await request('/rest/v1/rpc/move_site_domain_v2',token,{method:'POST',body:args})).data;
    }
  };
}
