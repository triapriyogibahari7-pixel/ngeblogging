import {createTransferStateReader} from './domain-transfer-state-client.mjs';
// Explicit isolated test transport. Never configure from production variables.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KEYS=['p_domain_id','p_source_site_id','p_target_site_id','p_confirm_hostname'];
const problem=(code,sent=false)=>Object.assign(new Error(code),{code,mutationAttempted:sent,mutationOutcome:sent?'unknown':'not_sent',reloadRequired:sent,retryAutomatically:false});
function callerToken(token){
  if(typeof token!=='string'||!token||/\s/.test(token)||token.startsWith('sb_secret_'))throw problem('TRANSFER_NOT_SENT');
  if(token.split('.').length===3){
    try{const part=token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');if(JSON.parse(atob(part)).role==='service_role')throw Error();}
    catch{throw problem('TRANSFER_NOT_SENT');}
  }
  return token;
}
export function createIsolatedPanelTransport({enabled=false,origin,approvedTestOrigin,environment='',getToken,isCurrent,fetchImpl=fetch,timeoutMs=10000}={}){
  if(enabled!==true||origin!==approvedTestOrigin||typeof getToken!=='function'||typeof isCurrent!=='function'||typeof fetchImpl!=='function')throw problem('ISOLATED_CLIENT_REQUIRED');
  if(globalThis.location&&['http:','https:'].includes(globalThis.location.protocol)&&globalThis.location.origin!==origin)throw problem('BROWSER_ORIGIN_MISMATCH');
  const current=()=>isCurrent()===true;
  const activeToken=async()=>{if(!current())throw problem('TRANSFER_SCOPE_CHANGED');const token=callerToken(await getToken());if(!current())throw problem('TRANSFER_SCOPE_CHANGED');return token;};
  const guardedFetch=(url,init)=>{if(!current())throw problem('TRANSFER_SCOPE_CHANGED');return fetchImpl(url,init);};
  const read=createTransferStateReader({origin,environment,getToken:activeToken,fetchImpl:guardedFetch,timeoutMs});
  return {
    async loadState(context){const snapshot=await read(context);if(!current())throw problem('TRANSFER_SCOPE_CHANGED');return snapshot;},
    async onMove(input){
      if(!input||Array.isArray(input)||Object.keys(input).length!==4||KEYS.some(k=>!Object.hasOwn(input,k))||KEYS.slice(0,3).some(k=>typeof input[k]!=='string'||!UUID.test(input[k]))||typeof input.p_confirm_hostname!=='string'||!input.p_confirm_hostname.trim()||input.p_confirm_hostname.length>253)throw problem('INVALID_TRANSFER_REQUEST');
      const args=Object.fromEntries(KEYS.map(k=>[k,input[k].trim().toLowerCase()]));
      if(args.p_source_site_id===args.p_target_site_id)throw problem('INVALID_TRANSFER_REQUEST');
      let sent=false,timer;const controller=new AbortController();
      try{return await Promise.race([(async()=>{
        const token=await activeToken();
        if(controller.signal.aborted||!current())throw problem('TRANSFER_NOT_SENT');
        sent=true;
        const response=await fetchImpl(new URL('/api/domains/move',origin),{method:'POST',credentials:'omit',redirect:'error',cache:'no-store',signal:controller.signal,headers:{accept:'application/json','content-type':'application/json',authorization:`Bearer ${token}`},body:JSON.stringify(args)});
        const data=await response.json();
        if(!response.ok||!current()||data?.status!=='moved'||data.domainId!==args.p_domain_id||data.sourceSiteId!==args.p_source_site_id||data.targetSiteId!==args.p_target_site_id||!Number.isInteger(data.redirectsMoved)||data.redirectsMoved<0||data.providerCacheVerified!==false)throw problem('TRANSFER_RECONCILIATION_REQUIRED',true);
        return {status:'moved',domainId:data.domainId,sourceSiteId:data.sourceSiteId,targetSiteId:data.targetSiteId,redirectsMoved:data.redirectsMoved,providerCacheVerified:false};
      })(),new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(problem(sent?'TRANSFER_RECONCILIATION_REQUIRED':'TRANSFER_NOT_SENT',sent));},timeoutMs);})]);}
      catch{throw problem(sent?'TRANSFER_RECONCILIATION_REQUIRED':'TRANSFER_NOT_SENT',sent);}
      finally{clearTimeout(timer);}
    }
  };
}
