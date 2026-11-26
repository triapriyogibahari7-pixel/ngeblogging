const BASE='/api/commerce/domains/manage/import';
const ORDER=/^IMP-[a-f0-9]{40}$/;
const MAX=3;
function orderIds(path,reqBody,body){
 const out=new Set();
 const add=o=>{if(o&&typeof o.orderId==='string'&&ORDER.test(o.orderId))out.add(o.orderId);};
 if(path===BASE+'/payment-status'){if(body?.paymentState==='paid')add(reqBody);}
 else{
  const one=body?.order;
  if(one&&one.paymentState==='paid'&&!one.zoneStatus&&!one.needsReview)add(one);
  if(Array.isArray(body?.orders))for(const o of body.orders)if(o&&o.paymentState==='paid'&&o.importState==='created'&&!o.zoneStatus&&!o.needsReview)add(o);
 }
 return [...out].slice(0,MAX);
}
export async function autoCreateImportZones(request,env,response,d={}){
 try{
  if(!response||request.method!=='POST'||env?.DOMAIN_IMPORT_ENABLED!=='true'||env.DOMAIN_IMPORT_AUTO_ZONE==='false'||response.status<200||response.status>=300)return response;
  const url=new URL(request.url),path=url.pathname;
  if(path===BASE+'/zone'||path===BASE+'/checkout'||path.startsWith(BASE+'/transfer/'))return response;
  const auth=request.headers.get('authorization')||'';if(!auth)return response;
  let body;try{body=await response.clone().json();}catch{return response;}
  if(!body||typeof body!=='object'||Array.isArray(body))return response;
  let reqBody=null;
  if(path===BASE+'/payment-status'){try{reqBody=await request.clone().json();}catch{return response;}}
  const list=orderIds(path,reqBody,body);if(!list.length)return response;
  const attempts=[];
  for(const orderId of list){
   const call=async(sub,handler,opts)=>{
    const req=new Request(url.origin+BASE+sub,{method:'POST',headers:{authorization:auth,origin:url.origin,'content-type':'application/json'},body:JSON.stringify({orderId})});
    const r=await handler(req,env,opts);let j=null;try{j=await r.clone().json();}catch{}
    return j?.code||('HTTP_'+r.status);
   };
   let code;
   try{
    code=await call('/zone',d.zone,{fetchImpl:d.fetchImpl,provider:d.provider,warnImpl:d.warnImpl});
    if(code==='IMPORT_MODE_NOT_SUPPORTED')code=await call('/transfer/zone',d.transfer,{fetchImpl:d.fetchImpl,provider:d.transferProvider,now:d.now,warnImpl:d.warnImpl});
   }catch{code='AUTO_ZONE_ERROR';}
   attempts.push({orderId,code});
  }
  const headers=new Headers(response.headers);headers.delete('content-length');
  return new Response(JSON.stringify({...body,autoZone:attempts}),{status:response.status,headers});
 }catch{return response;}
}
