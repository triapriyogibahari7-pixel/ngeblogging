const PATH='/api/domains/migrations';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const json=(status,body)=>Response.json(body,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
export function createMigrationRouter({authenticate,executorForRequest}={}){
 if(typeof authenticate!=='function'||typeof executorForRequest!=='function')throw Error('SERVER_MIGRATION_DEPENDENCIES_REQUIRED');
 return async(request,env)=>{
  const url=new URL(request.url);if(url.pathname!==PATH)return null;
  if(request.method!=='POST')return json(405,{code:'METHOD_NOT_ALLOWED'});
  if(!request.headers.get('authorization')?.startsWith('Bearer '))return json(401,{code:'AUTH_REQUIRED'});
  if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))return json(415,{code:'JSON_REQUIRED'});
  try{
   const actor=await authenticate(request,env);if(!UUID.test(actor?.id||''))return json(401,{code:'AUTH_REQUIRED'});
   const reader=request.body?.getReader();if(!reader)return json(400,{code:'INVALID_JSON'});
   let text='',size=0;const decoder=new TextDecoder();try{for(;;){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>4096)return json(413,{code:'BODY_TOO_LARGE'});text+=decoder.decode(part.value,{stream:true});}}finally{await reader.cancel().catch(()=>{});}
   let input;try{input=JSON.parse(text+decoder.decode());}catch{return json(400,{code:'INVALID_JSON'});}
   if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['action','siteId','domainId','migrationId','approvePrepareTrafficChange'].includes(k)))return json(400,{code:'INVALID_MIGRATION_REQUEST'});
   if(!['status','prepare','cutover','rollback'].includes(input.action)||['siteId','domainId','migrationId'].some(k=>!UUID.test(input[k]||'')))return json(400,{code:'INVALID_MIGRATION_REQUEST'});
   if(input.approvePrepareTrafficChange!==undefined&&typeof input.approvePrepareTrafficChange!=='boolean')return json(400,{code:'INVALID_MIGRATION_REQUEST'});
   const executor=await executorForRequest({request,env,actor});
   return json(200,{migration:await executor.execute({...input,actorId:actor.id,signal:request.signal})});
  }catch(error){
   const code=error?.code;const status={MIGRATION_FORBIDDEN:403,MIGRATION_NOT_FOUND:404,MIGRATION_BUSY:409,MIGRATION_ACTION_DISABLED:503,INVALID_MIGRATION_REQUEST:400}[code]||503;
   return json(status,{code:/^[A-Z_]+$/.test(code||'')?code:'MIGRATION_SERVICE_UNAVAILABLE',productionActivationCertified:false});
  }
 };
}
