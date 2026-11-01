// Explicit isolated-origin read client. No mutation, failover or automatic retry.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KEYS=['domainId','sourceSiteId','targetSiteId'];
const fail=code=>{throw Object.assign(new Error(code),{code});};
export function createTransferStateReader({origin,environment='',getToken,fetchImpl=fetch,timeoutMs=10000}={}){
  let base;try{base=new URL(origin);}catch{fail('EXPLICIT_TEST_ORIGIN_REQUIRED');}
  const local=['localhost','127.0.0.1','[::1]'].includes(base.hostname);
  if(environment!=='isolated-test'||base.origin!==origin||base.username||base.password||base.pathname!=='/'||base.search||base.hash||(!local&&base.protocol!=='https:')||(local&&!['http:','https:'].includes(base.protocol))||base.hostname==='ngeblogging.com'||base.hostname.endsWith('.ngeblogging.com')||base.hostname==='ngeblogging.triapriyogibahari7.workers.dev')fail('ISOLATED_ORIGIN_REQUIRED');
  if(typeof getToken!=='function'||typeof fetchImpl!=='function'||!Number.isFinite(timeoutMs)||timeoutMs<=0||timeoutMs>30000)fail('INVALID_READ_TRANSPORT');
  return async input=>{
    if(!input||Array.isArray(input)||Object.keys(input).length!==3||KEYS.some(key=>typeof input[key]!=='string'||!UUID.test(input[key])))fail('INVALID_STATE_REQUEST');
    const context=Object.fromEntries(KEYS.map(key=>[key,input[key].toLowerCase()]));
    if(context.sourceSiteId===context.targetSiteId)fail('INVALID_STATE_REQUEST');
    const url=new URL('/api/domains/move-state',base);url.search=new URLSearchParams(context);const controller=new AbortController();let timer;
    try{return await Promise.race([(async()=>{
      let token;try{token=await getToken();}catch{fail('STATE_AUTH_UNAVAILABLE');}
      if(typeof token!=='string'||!token||/\s/.test(token)||token.startsWith('sb_secret_'))fail('STATE_AUTH_UNAVAILABLE');
      if(controller.signal.aborted)fail('STATE_READ_TIMEOUT');
      const response=await fetchImpl(url,{method:'GET',credentials:'omit',redirect:'error',cache:'no-store',signal:controller.signal,headers:{accept:'application/json',authorization:`Bearer ${token}`}});
      let data;try{data=await response.json();}catch{fail('STATE_READ_UNAVAILABLE');}
      if(!response.ok)fail(response.status===401?'STATE_REAUTH_REQUIRED':'STATE_READ_UNAVAILABLE');
      if(data?.observedOnly!==true||data.mutationAttempted!==false||KEYS.some(key=>data.context?.[key]!==context[key])||!data.snapshot||data.snapshot.domain?.id!==context.domainId||data.snapshot.sourceSite?.id!==context.sourceSiteId||data.snapshot.targetSite?.id!==context.targetSiteId)fail('STATE_RESPONSE_MISMATCH');
      return data.snapshot;
    })(),new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Object.assign(new Error('STATE_READ_TIMEOUT'),{code:'STATE_READ_TIMEOUT'}));},timeoutMs);})]);}
    catch(error){if(['STATE_AUTH_UNAVAILABLE','STATE_READ_TIMEOUT','STATE_READ_UNAVAILABLE','STATE_REAUTH_REQUIRED','STATE_RESPONSE_MISMATCH'].includes(error?.code))throw error;fail('STATE_READ_UNAVAILABLE');}
    finally{clearTimeout(timer);}
  };
}
