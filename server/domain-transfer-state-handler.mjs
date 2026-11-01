// Read-only isolated handler. Not registered in any Worker.
// authenticate/loadSnapshot must use caller JWT; no move adapter is accepted.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KEYS=['domainId','sourceSiteId','targetSiteId'];
const pick=(row,keys)=>Object.fromEntries(keys.map(key=>[key,row[key]]));
const siteKeys=['id','owner_id','slug','status','custom_domain'];
const domainKeys=['id','site_id','hostname','status','provider','is_primary'];
export function createTransferStateHandler({authenticate,loadSnapshot,enabled=false,environment='',allowedOrigin='',requestId=()=>crypto.randomUUID()}={}){
  return async request=>{
    const id=requestId(),reply=(status,data)=>new Response(JSON.stringify({...data,requestId:id}),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','x-request-id':id}});
    const url=new URL(request.url);
    if(url.pathname!=='/api/domains/move-state')return reply(404,{code:'NOT_FOUND'});
    if(request.method!=='GET')return reply(405,{code:'METHOD_NOT_ALLOWED'});
    if(!enabled||environment!=='isolated-test')return reply(503,{code:'TRANSFER_STATE_DISABLED'});
    const origin=request.headers.get('origin');
    if(!allowedOrigin||(origin?origin!==allowedOrigin:url.origin!==allowedOrigin)||request.headers.get('sec-fetch-site')==='cross-site')return reply(403,{code:'ORIGIN_NOT_ALLOWED'});
    if(typeof authenticate!=='function'||typeof loadSnapshot!=='function')return reply(503,{code:'STATE_ADAPTERS_UNAVAILABLE'});
    if([...url.searchParams.keys()].length!==3||KEYS.some(key=>url.searchParams.getAll(key).length!==1||!UUID.test(url.searchParams.get(key)||'')))return reply(400,{code:'INVALID_STATE_REQUEST'});
    const context=Object.fromEntries(KEYS.map(key=>[key,url.searchParams.get(key).toLowerCase()]));
    if(context.sourceSiteId===context.targetSiteId)return reply(400,{code:'INVALID_STATE_REQUEST'});
    const bearer=/^Bearer ([^\s]+)$/.exec(request.headers.get('authorization')||'');
    if(!bearer)return reply(401,{code:'AUTH_REQUIRED'});
    try{
      const token=bearer[1],user=await authenticate(token);
      if(!user?.id)return reply(401,{code:'INVALID_SESSION'});
      const s=await loadSnapshot({token,userId:user.id,...context});
      if(!s?.domain||!s.sourceSite||!s.targetSite||s.domain.id!==context.domainId||s.sourceSite.id!==context.sourceSiteId||s.targetSite.id!==context.targetSiteId)return reply(404,{code:'DOMAIN_OR_SITE_NOT_ACCESSIBLE'});
      if(s.sourceSite.owner_id!==user.id||s.targetSite.owner_id!==user.id||s.sourceRole!=='owner'||s.targetRole!=='owner')return reply(403,{code:'BOTH_SITE_OWNERSHIP_REQUIRED'});
      if(![context.sourceSiteId,context.targetSiteId].includes(s.domain.site_id))return reply(409,{code:'DOMAIN_CONTEXT_CHANGED'});
      if(s.targetLoaded!==true||!Array.isArray(s.targetDomains)||s.targetDomains.some(row=>!row||row.site_id!==context.targetSiteId))return reply(503,{code:'STATE_SNAPSHOT_INCOMPLETE'});
      const snapshot={domain:pick(s.domain,domainKeys),sourceSite:pick(s.sourceSite,siteKeys),targetSite:pick(s.targetSite,siteKeys),sourceRole:s.sourceRole,targetRole:s.targetRole,targetDomains:s.targetDomains.map(row=>pick(row,domainKeys)),targetLoaded:true};
      return reply(200,{context,snapshot,observedOnly:true,mutationAttempted:false,snapshotAtomic:false,providerCacheVerified:false});
    }catch(error){return reply(error?.code==='INVALID_SESSION'?401:503,{code:error?.code==='INVALID_SESSION'?'INVALID_SESSION':'TRANSFER_STATE_UNAVAILABLE'});}
  };
}
