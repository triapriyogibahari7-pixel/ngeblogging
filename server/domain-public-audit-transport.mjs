import {networkDiagnostic} from './domain-network-diagnostic.mjs';
const fail=()=>{throw Error('AUDIT_TARGET_REJECTED');};
export function publicAuditRequest(input,init={}){
 const url=new URL(input instanceof Request?input.url:String(input));
 const host=url.hostname.toLowerCase();
 if(url.protocol!=='https:'||url.username||url.password||(url.port&&url.port!=='443')||host.length>253||!host.includes('.')||!/[a-z]/i.test(host.split('.').at(-1))||/(?:^|\.)(?:localhost|local|internal)$/.test(host)||!host.split('.').every(part=>/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(part)))fail();
 if((init.method||(input instanceof Request?input.method:'GET')).toUpperCase()!=='GET')fail();
 return new Request(url,{method:'GET',redirect:'manual',signal:init.signal,headers:{accept:'text/html,application/xhtml+xml;q=0.9,*/*;q=0.1','cache-control':'no-cache'}});
}
export function createPublicAuditFetch(env,{fetchImpl=(...args)=>globalThis.fetch(...args)}={}){
 const service=Boolean(env?.PUBLIC_AUDITOR?.fetch);
 return async(input,init={})=>{
  try{
   const result=service?await env.PUBLIC_AUDITOR.fetch(publicAuditRequest(input,init)):await fetchImpl(input,init);
   if(!result.ok&&!(result.status>=300&&result.status<400))console.warn('[domain-audit-diagnostic]',JSON.stringify({transport:service?'service-binding':'direct-fetch',...networkDiagnostic(null,{phase:'response',httpStatus:result.status})}));
   return result;
  }catch(error){
   console.warn('[domain-audit-diagnostic]',JSON.stringify({transport:service?'service-binding':'direct-fetch',...networkDiagnostic(error)}));
   throw error;
  }
 };
}
