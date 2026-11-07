import {networkDiagnostic} from './domain-network-diagnostic.mjs';
const fail=()=>{throw Error('AUDIT_TARGET_REJECTED');};
export function publicAuditRequest(input,init={}){
 const url=new URL(input instanceof Request?input.url:String(input));
 if(url.protocol!=='https:'||url.username||url.password||(url.port&&url.port!=='443'))fail();
 const host=url.hostname.toLowerCase();
 if(!host.includes('.')||host.length>253||!/[a-z]/i.test(host.split('.').at(-1))||/(?:^|\.)(?:localhost|local|internal)$/i.test(host)||host.split('.').some(label=>!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label)))fail();
 if((init.method||(input instanceof Request?input.method:'GET')).toUpperCase()!=='GET')fail();
 return new Request(url,{method:'GET',redirect:'manual',signal:init.signal,headers:{accept:'text/html,application/xhtml+xml;q=0.9,*/*;q=0.1','cache-control':'no-cache'}});
}
export function createPublicAuditFetch(_env,{fetchImpl=(...args)=>globalThis.fetch(...args)}={}){
 return async(input,init={})=>{
  try{
   const request=publicAuditRequest(input,init);
   const result=await fetchImpl(request);
   if(!result.ok&&!(result.status>=300&&result.status<400))console.warn('[domain-audit-diagnostic]',JSON.stringify({transport:'direct-fetch',...networkDiagnostic(null,{phase:'response',httpStatus:result.status})}));
   return result;
  }catch(error){
   console.warn('[domain-audit-diagnostic]',JSON.stringify({transport:'direct-fetch',...networkDiagnostic(error)}));
   throw error;
  }
 };
}
