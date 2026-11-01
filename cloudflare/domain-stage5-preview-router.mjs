import isolatedWorker from './worker-domain-stage5-isolated.mjs';
const PREVIEW_HOST='feature-domain-stages5-10-integration-20261030-ngeblogging.triapriyogibahari7.workers.dev';
const PATHS=new Set(['/api/domains/move','/api/domains/move-state']);
// This branch-preview route deliberately cannot enable database access.
export async function stage5PreviewResponse(request){
  const url=new URL(request.url);
  if(url.protocol!=='https:'||url.host!==PREVIEW_HOST||!PATHS.has(url.pathname))return null;
  try{
    const response=await isolatedWorker.fetch(request,Object.freeze({STAGE5_ENVIRONMENT:'isolated-test',STAGE5_TRANSFER_ENABLED:'false'}));
    const headers=new Headers(response.headers);headers.set('cache-control','no-store');headers.set('x-stage5-preview','isolated-disabled-v1');
    if(request.method==='HEAD'){try{response.body?.cancel()?.catch(()=>{});}catch{}}
    return new Response(request.method==='HEAD'?null:response.body,{status:response.status,headers});
  }catch{
    return new Response(request.method==='HEAD'?null:JSON.stringify({code:'STAGE5_PREVIEW_UNAVAILABLE'}),{status:503,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-stage5-preview':'isolated-disabled-v1'}});
  }
}
