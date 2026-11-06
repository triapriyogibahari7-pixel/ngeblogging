export function createActivationLeaseStore(binding){
 return {async claim(key){
  if(!binding?.idFromName||!/^activation:[a-f0-9]{32}:[a-f0-9]{32}$/i.test(key))throw Error('INVALID_ACTIVATION_LEASE');
  const stub=binding.get(binding.idFromName(key));
  const response=await stub.fetch('https://activation.internal/claim',{method:'POST'});
  if(!response.ok)throw Error('ACTIVATION_LEASE_UNAVAILABLE');
  const body=await response.json();
  return body?.acquired===true;
 }};
}
export class DomainActivationLease {
 constructor(state){this.storage=state.storage;}
 async fetch(request){
  if(request.method!=='POST'||new URL(request.url).pathname!=='/claim')return new Response(null,{status:405});
  const acquired=await this.storage.transaction(async tx=>{
   const now=Date.now(),until=Number(await tx.get('until')||0);
   if(until>now)return false;
   await tx.put('until',now+3600000);
   return true;
  });
  return Response.json({acquired},{headers:{'cache-control':'no-store'}});
 }
}
