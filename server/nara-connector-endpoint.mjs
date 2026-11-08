const PREFIX = '/api/nara/connectors';
const HOSTS = new Set(['ngeblogging.com','www.ngeblogging.com','ngeblogging.triapriyogibahari7.workers.dev']);
const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const reply = (status, data) => new Response(JSON.stringify(data), { status, headers: { 'content-type':'application/json; charset=utf-8','cache-control':'no-store','vary':'Authorization, Origin','x-content-type-options':'nosniff' } });
async function body(request) {
 if (!request.headers.get('content-type')?.startsWith('application/json') || !request.body) throw Error('CONNECTOR_INVALID_REQUEST');
 const reader=request.body.getReader(), chunks=[];let size=0;
 try { while(true){const next=await reader.read();if(next.done)break;size+=next.value.byteLength;if(size>16384){await reader.cancel();throw Error('CONNECTOR_PAYLOAD_TOO_LARGE');}chunks.push(next.value);} } finally {reader.releaseLock();}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
 let data;try{data=JSON.parse(new TextDecoder().decode(bytes));}catch{throw Error('CONNECTOR_INVALID_REQUEST');}
 if(!data||typeof data!=='object'||Array.isArray(data))throw Error('CONNECTOR_INVALID_REQUEST');return data;
}
export function createConnectorEndpoint({ authenticate, storage, normalize, seal, open, readMetadata, key, newId }) {
 function view(row){const config=normalize(row.config);if(!uuid(row.id)||!['disconnected','checking','connected','error'].includes(row.status))throw Error('CONNECTOR_STORAGE_UNAVAILABLE');return {id:row.id,...config,status:row.status,enabled:row.enabled===true,checkedAt:row.checkedAt||row.checked_at||null};}
 function checked(row,actor,id){if(row?.id!==id||row?.owner_id!==actor||row.key_version!=='v1')throw Error('CONNECTOR_NOT_FOUND');return row;}
 return async function(request){
  const url=new URL(request.url);if(url.pathname!==PREFIX&&!url.pathname.startsWith(PREFIX+'/'))return null;
  if(url.protocol!=='https:'||!HOSTS.has(url.hostname))return reply(404,{code:'NOT_FOUND'});
  if(url.search)return reply(400,{code:'CONNECTOR_INVALID_REQUEST'});
  if(!['GET','POST','DELETE'].includes(request.method))return reply(405,{code:'METHOD_NOT_ALLOWED'});
  const origin=request.headers.get('origin');
  if((origin&&origin!==url.origin)||request.headers.get('sec-fetch-site')==='cross-site'||(request.method!=='GET'&&origin!==url.origin))return reply(403,{code:'ORIGIN_NOT_ALLOWED'});
  try{
   const user=await authenticate(request);
   if(!uuid(user?.id)||!user.email_confirmed_at)throw Error('CONNECTOR_AUTH_REQUIRED');
   const actor=user.id;
   const admin=await storage(actor,'admin');if(admin?.admin!==true)throw Error('CONNECTOR_ADMIN_REQUIRED');
   const path=url.pathname.slice(PREFIX.length);
   if(path==='/access'&&request.method==='GET')return reply(200,{admin:true});
   if(!path&&request.method==='GET'){const rows=await storage(actor,'list');if(!Array.isArray(rows))throw Error('CONNECTOR_STORAGE_UNAVAILABLE');return reply(200,{connections:rows.map(view)});}
   if(!path&&request.method==='POST'){
    const data=await body(request);if(Object.keys(data).some(name=>!['config','token'].includes(name)))throw Error('CONNECTOR_INVALID_REQUEST');
    const config=normalize(data.config),id=newId();if(!uuid(id))throw Error('CONNECTOR_STORAGE_UNAVAILABLE');
    const credential=await seal(data.token,key(),{ownerId:actor,connectionId:id,provider:config.provider});
    const saved=await storage(actor,'create',id,{provider:config.provider,label:config.label,config,credential,key_version:'v1'});
    return reply(201,{connection:view(saved)});
   }
   const parts=path.split('/').filter(Boolean),id=parts[0];if(!uuid(id))return reply(404,{code:'NOT_FOUND'});
   if(parts.length===1&&request.method==='DELETE'){await storage(actor,'delete',id);return reply(200,{deleted:true});}
   if(parts.length!==2||request.method!=='POST'||!['connect','disconnect','read'].includes(parts[1]))return reply(404,{code:'NOT_FOUND'});
   const data=await body(request);if(Object.keys(data).length)throw Error('CONNECTOR_INVALID_REQUEST');
   if(parts[1]==='disconnect')return reply(200,{connection:view(await storage(actor,'disconnect',id))});
   const checking=parts[1]==='connect';
   const row=checked(await storage(actor,checking?'begin_check':'authorize_tool',id),actor,id);
   if(!checking&&(!row.enabled||row.status!=='connected'))throw Error('CONNECTOR_DISCONNECTED');
   let result,failed=false;
   try{const config=normalize(row.config);const token=await open(row.credential,key(),{ownerId:actor,connectionId:id,provider:config.provider});result=await readMetadata(config,token);}catch{failed=true;}
   if(checking){const saved=await storage(actor,'finish_check',id,{revision:String(row.revision),success:!failed});return reply(failed?502:200,{connection:view(saved),...(failed?{code:'CONNECTOR_CHECK_FAILED'}:{verifiedCapability:result.verifiedCapability})});}
   const latest=checked(await storage(actor,'get',id),actor,id);
   if(!latest.enabled||latest.status!=='connected'||String(latest.revision)!==String(row.revision))throw Error('CONNECTOR_DISCONNECTED');
   if(failed)throw Error('CONNECTOR_READ_FAILED');
   return reply(200,{data:result,untrustedProviderData:true});
  }catch(error){
   const codes={CONNECTOR_AUTH_REQUIRED:401,CONNECTOR_ADMIN_REQUIRED:403,CONNECTOR_NOT_FOUND:404,CONNECTOR_DISCONNECTED:409,CONNECTOR_REVISION_CONFLICT:409,CONNECTOR_INVALID_REQUEST:400,INVALID_CONNECTION:400,INVALID_CREDENTIAL:400,CONNECTOR_PAYLOAD_TOO_LARGE:413,CONNECTOR_READ_FAILED:502};
   const code=Object.hasOwn(codes,error?.message)?error.message:'CONNECTOR_UNAVAILABLE';return reply(codes[code]||503,{code});
  }
 };
}
