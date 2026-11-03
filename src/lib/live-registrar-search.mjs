import {normalizeRegistrarSearchInput,readRegistrarSearchView} from './registrar-search-view.mjs';
export {normalizeRegistrarSearchInput};
const problem=(code,status)=>Object.assign(new Error(code),{code,status});
const bad=()=>{throw problem('REGISTRAR_RESPONSE_UNVERIFIED');};
export function currentLiveRegistrarView(view,now){
 if(!view?.expiresAt)return view;
 const at=view.clockAnchorMs+now-view.monotonicAnchorMs;
 if(!Number.isFinite(now)||now<view.monotonicAnchorMs||!Number.isFinite(at)||at>=Date.parse(view.expiresAt))return {...view,candidates:[],expired:true,message:'Hasil sudah kedaluwarsa. Cari ulang sebelum memilih nama domain.'};
 return view;
}
export async function fetchLiveRegistrarSearch(value,{siteId,token,signal,fetchImpl=globalThis.fetch,monotonic=()=>performance.now(),timeoutMs=18000}={}){
 const query=normalizeRegistrarSearchInput(value);
 if(typeof siteId!=='string'||!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(siteId)||typeof token!=='string'||!token||token.length>8192||/\s/.test(token)||typeof fetchImpl!=='function'||!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>20000||signal?.aborted)bad();
 const c=new AbortController();let reader,stop;
 const ended=new Promise((_,reject)=>{stop=()=>reject(problem('REGISTRAR_SEARCH_ABORTED'));c.signal.addEventListener('abort',stop,{once:true});});
 const cancel=()=>c.abort(),timer=setTimeout(cancel,timeoutMs),wait=p=>Promise.race([p,ended]);signal?.addEventListener('abort',cancel,{once:true});if(signal?.aborted)cancel();
 try{
  const started=monotonic();
  const response=await wait(fetchImpl('/api/domains/registrar/search/'+encodeURIComponent(query),{method:'POST',redirect:'error',cache:'no-store',credentials:'omit',headers:{authorization:'Bearer '+token,'x-site-id':siteId.toLowerCase(),accept:'application/json'},signal:c.signal}));
  if(response.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')bad();
  reader=response.body?.getReader();if(!reader)bad();const chunks=[];let size=0;
  for(;;){const part=await wait(reader.read());if(part.done)break;if(!(part.value instanceof Uint8Array))bad();size+=part.value.byteLength;if(size>262144)bad();chunks.push(part.value);}
  const bytes=new Uint8Array(size);let at=0;for(const part of chunks){bytes.set(part,at);at+=part.byteLength;}
  let data;try{data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{bad();}
  if(!response.ok){const mapped={secret_missing:'REGISTRAR_SECRET_MISSING',access_denied:'REGISTRAR_ACCESS_DENIED',rate_limited:'REGISTRAR_RATE_LIMITED',timeout:'REGISTRAR_TIMEOUT',network_error:'REGISTRAR_NETWORK_ERROR'};const code=mapped[data?.status]||(typeof data?.code==='string'&&/^[A-Z0-9_]{1,80}$/.test(data.code)?data.code:'REGISTRAR_LOOKUP_FAILED');throw problem(code,response.status);}
  const received=monotonic();if(c.signal.aborted||signal?.aborted||received-started>20000)bad();
  let view;try{view=readRegistrarSearchView(data,{query,requestStartedAt:started,receivedAt:received});}catch{bad();}
  return {...view,message:view.candidates?view.candidates.length+' kandidat dari registrar. Ketersediaan sementara; harga jual diperiksa terpisah.':view.message,candidates:(view.candidates||[]).map(row=>({domain:row.domain,status:row.status,premium:row.premium,canSelect:row.canCheck})),purchaseAllowed:false,availabilityOnly:true};
 }finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel);c.signal.removeEventListener('abort',stop);c.abort();if(reader){try{Promise.resolve(reader.cancel()).catch(()=>{});}catch{}try{reader.releaseLock();}catch{}}}
}
