// Workers supports manual/follow, not the Fetch-standard error redirect mode.
// Customer auth/quote traffic uses fixed allowlisted URLs and must never follow
// redirects with credentials. Keep that policy by using manual and rejecting 3xx.
export class WorkerRedirectRejectedError extends TypeError{
 constructor(status){super('WORKER_FETCH_REDIRECT_REJECTED');this.name='WorkerRedirectRejectedError';this.code='WORKER_FETCH_REDIRECT_REJECTED';this.status=status;}
}
export function createWorkerRedirectSafeFetch(fetchImpl=(...args)=>globalThis.fetch(...args)){
 if(typeof fetchImpl!=='function')throw Error('INVALID_WORKER_FETCH');
 return async(input,init)=>{
  const response=await fetchImpl(input,{...init,redirect:'manual'});
  if(response.status>=300&&response.status<400){
   try{Promise.resolve(response.body?.cancel()).catch(()=>{});}catch{}
   throw new WorkerRedirectRejectedError(response.status);
  }
  return response;
 };
}
