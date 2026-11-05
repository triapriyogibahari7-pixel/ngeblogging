const fail=()=>{throw Error('AUDIT_TARGET_REJECTED');};
export function publicAuditRequest(input,init={}){
 const url=new URL(input instanceof Request?input.url:String(input));
 const host=url.hostname.toLowerCase();
 if(url.protocol!=='https:'||url.username||url.password||(url.port&&url.port!=='443')||host.length>253||!host.includes('.')||!/[a-z]/i.test(host.split('.').at(-1))||/(?:^|\.)(?:localhost|local|internal)$/.test(host)||!host.split('.').every(part=>/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(part)))fail();
 if((init.method||(input instanceof Request?input.method:'GET')).toUpperCase()!=='GET')fail();
 return new Request(url,{method:'GET',redirect:'manual',signal:init.signal,headers:{accept:'text/html,application/xhtml+xml;q=0.9,*/*;q=0.1','cache-control':'no-cache'}});
}
export function createPublicAuditFetch(env,{fetchImpl=globalThis.fetch}={}){
 if(!env?.PUBLIC_AUDITOR?.fetch)return fetchImpl;
 return (input,init={})=>env.PUBLIC_AUDITOR.fetch(publicAuditRequest(input,init));
}
