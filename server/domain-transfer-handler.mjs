// Unregistered handler: adapters must read/write using the caller JWT, never service_role.
// Client checks are not trusted. Snapshot completeness must be established by the server adapter.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KEYS=['p_domain_id','p_source_site_id','p_target_site_id','p_confirm_hostname'];
const failure=(code,status=400)=>Object.assign(new Error(code),{code,status});
async function readBody(request){
  if(!request.body)throw failure('INVALID_TRANSFER_REQUEST');
  const reader=request.body.getReader();let length=0;const chunks=[];
  try{for(;;){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>4096){await reader.cancel();throw failure('REQUEST_TOO_LARGE',413);}chunks.push(value);}}finally{reader.releaseLock();}
  const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{throw failure('INVALID_JSON');}
}
function verifySnapshot(s,p,userId){
  const {domain,sourceSite:source,targetSite:target}=s||{};
  if(!domain||!source||!target||domain.id!==p.p_domain_id||source.id!==p.p_source_site_id||target.id!==p.p_target_site_id)throw failure('DOMAIN_OR_SITE_NOT_ACCESSIBLE',404);
  if(source.owner_id!==userId||target.owner_id!==userId||s.sourceRole!=='owner'||s.targetRole!=='owner')throw failure('BOTH_SITE_OWNERSHIP_REQUIRED',403);
  if(target.status!=='active')throw failure('TARGET_SITE_INACTIVE',409);
  if(domain.site_id!==source.id)throw failure('DOMAIN_SOURCE_CHANGED',409);
  const hostname=domain.hostname;
  if(typeof hostname!=='string'||hostname!==hostname.toLowerCase()||hostname==='ngeblogging.com'||hostname.endsWith('.ngeblogging.com')||!hostname.includes('.')||hostname.length>253||!hostname.split('.').every(label=>/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))||domain.provider!=='cloudflare-full-zone'||!['active','pending','verifying'].includes(domain.status)||(domain.is_primary===true&&domain.status!=='active'))throw failure('DOMAIN_STATE_NOT_TRANSFERABLE',409);
  if(p.p_confirm_hostname.trim().toLowerCase()!==hostname)throw failure('HOSTNAME_CONFIRMATION_MISMATCH');
  if(s.targetLoaded!==true||!Array.isArray(s.targetDomains))throw failure('TARGET_STATE_UNAVAILABLE',503);
  if(s.targetDomains.some(row=>!row||row.site_id!==target.id))throw failure('TARGET_STATE_MISMATCH',503);
  if(s.targetDomains.some(row=>row.hostname!==`${target.slug}.ngeblogging.com`)||(target.custom_domain&&target.custom_domain!==`${target.slug}.ngeblogging.com`))throw failure('TARGET_HAS_DOMAIN_OR_UNREVIEWED_MAPPING',409);
}
export function createDomainTransferHandler({authenticate,loadSnapshot,move,enabled=false,environment='',allowedOrigin='',requestId=()=>crypto.randomUUID()}={}){
  return async function handle(request){
    const id=requestId();let phase='validate';
    const reply=(status,body)=>new Response(JSON.stringify({...body,requestId:id}),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','x-request-id':id}});
    if(new URL(request.url).pathname!=='/api/domains/move')return reply(404,{code:'NOT_FOUND'});
    if(request.method!=='POST')return reply(405,{code:'METHOD_NOT_ALLOWED'});
    if(!enabled||environment!=='isolated-test')return reply(503,{code:'DOMAIN_TRANSFER_DISABLED'});
    if(!allowedOrigin||request.headers.get('origin')!==allowedOrigin)return reply(403,{code:'ORIGIN_NOT_ALLOWED'});
    if([authenticate,loadSnapshot,move].some(fn=>typeof fn!=='function'))return reply(503,{code:'TRANSFER_ADAPTERS_UNAVAILABLE'});
    try{
      if(!/^application\/json(?:;|$)/i.test(request.headers.get('content-type')||''))throw failure('JSON_REQUIRED',415);
      const match=/^Bearer ([^\s]+)$/.exec(request.headers.get('authorization')||'');
      if(!match)throw failure('AUTH_REQUIRED',401);
      const token=match[1],p=await readBody(request);
      if(!p||Array.isArray(p)||typeof p!=='object'||Object.keys(p).length!==KEYS.length||KEYS.some(key=>!Object.hasOwn(p,key))||KEYS.slice(0,3).some(key=>typeof p[key]!=='string'||!UUID.test(p[key]))||p.p_source_site_id===p.p_target_site_id||typeof p.p_confirm_hostname!=='string'||!p.p_confirm_hostname.trim()||p.p_confirm_hostname.length>253)throw failure('INVALID_TRANSFER_REQUEST');
      phase='authenticate';const user=await authenticate(token);
      if(!user?.id)throw failure('INVALID_SESSION',401);
      phase='snapshot';const snapshot=await loadSnapshot({token,userId:user.id,domainId:p.p_domain_id,sourceSiteId:p.p_source_site_id,targetSiteId:p.p_target_site_id});
      verifySnapshot(snapshot,p,user.id);
      const args={...p,p_confirm_hostname:snapshot.domain.hostname};
      phase='move';const result=await move({token,args});
      if(result?.status!=='moved'||result.domainId!==args.p_domain_id||result.sourceSiteId!==args.p_source_site_id||result.targetSiteId!==args.p_target_site_id||!Number.isInteger(result.redirectsMoved)||result.redirectsMoved<0)throw failure('TRANSFER_RECEIPT_MISMATCH',502);
      return reply(200,{status:'moved',domainId:result.domainId,sourceSiteId:result.sourceSiteId,targetSiteId:result.targetSiteId,redirectsMoved:result.redirectsMoved,providerCacheVerified:false});
    }catch(error){
      if(phase==='move')return reply(503,{code:'TRANSFER_RECONCILIATION_REQUIRED',mutationOutcome:'unknown',retryAutomatically:false,reloadRequired:true});
      const known=new Set(['INVALID_TRANSFER_REQUEST','REQUEST_TOO_LARGE','INVALID_JSON','JSON_REQUIRED','AUTH_REQUIRED','INVALID_SESSION','DOMAIN_OR_SITE_NOT_ACCESSIBLE','BOTH_SITE_OWNERSHIP_REQUIRED','TARGET_SITE_INACTIVE','DOMAIN_SOURCE_CHANGED','DOMAIN_STATE_NOT_TRANSFERABLE','HOSTNAME_CONFIRMATION_MISMATCH','TARGET_STATE_UNAVAILABLE','TARGET_STATE_MISMATCH','TARGET_HAS_DOMAIN_OR_UNREVIEWED_MAPPING']);
      const code=known.has(error?.code)?error.code:phase==='authenticate'?'AUTH_VERIFICATION_UNAVAILABLE':'TRANSFER_PREFLIGHT_UNAVAILABLE';
      return reply(known.has(error?.code)?error.status:503,{code,mutationAttempted:false});
    }
  };
}
