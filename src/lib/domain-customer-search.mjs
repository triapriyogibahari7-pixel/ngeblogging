import {readCustomerCurrencyContext} from '../../shared/domain-currency-display.mjs';
const UUID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const invalid=()=>Object.assign(new Error('CUSTOMER_SEARCH_UNVERIFIED'),{code:'CUSTOMER_SEARCH_UNVERIFIED'});
const bad=()=>{throw invalid();};
const integer=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
function stamp(v){if(typeof v!=='string'||v.length>64||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(v)||!Number.isFinite(Date.parse(v)))bad();return Date.parse(v);}
function domain(v){return typeof v==='string'&&v.length<=253&&v===v.toLowerCase()&&v.includes('.')&&!/^\d+(?:\.\d+){3}$/.test(v)&&v.split('.').every(label=>/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label));}
export function normalizeCustomerSearchQuery(value){if(typeof value!=='string')bad();const q=value.trim();if(!q||q.length>253||/[^\p{L}\p{M}\p{N} .-]/u.test(q)||(!q.includes('.')&&q.length>100))bad();return q;}
export function readCustomerSearchView(data,{siteId,query,requestStartedAt,receivedAt}={}){
 if(typeof siteId!=='string'||!UUID.test(siteId)||!Number.isFinite(requestStartedAt)||!Number.isFinite(receivedAt)||requestStartedAt<0||receivedAt<requestStartedAt||receivedAt-requestStartedAt>30000)bad();
 siteId=siteId.toLowerCase();query=normalizeCustomerSearchQuery(query);
 if(data?.code!=='DOMAIN_CUSTOMER_SEARCH'||data.environment!=='production'||data.siteId!==siteId||data.query!==query||data.indicative!==true||data.purchaseAllowed!==false||data.checkoutAvailable!==false||data.suggestionCount!==50)bad();
 const primary=data.primaryDomain,requested=data.requestedDomain;
 if(primary!==null&&!domain(primary))bad();
 if(requested===null){if(primary!==null||data.requestedExtensionSupported!==null)bad();}
 else if(!domain(requested)||typeof data.requestedExtensionSupported!=='boolean'||primary!==(data.requestedExtensionSupported?requested:null))bad();
 const count=primary===null?50:51;
 if(data.candidateCount!==count||!Array.isArray(data.candidates)||data.candidates.length!==count||typeof data.complete!=='boolean'||typeof data.timedOut!=='boolean')bad();
 const started=stamp(data.startedAt),completed=stamp(data.completedAt),anchor=completed+(receivedAt-requestStartedAt);
 if(completed<started||completed-started>30000||!Number.isFinite(anchor)||Math.abs(anchor)>8640000000000000)bad();
 let currencyContext=null;
 if(Object.hasOwn(data,'currencyContext')){try{currencyContext=readCustomerCurrencyContext(data.currencyContext);}catch{bad();}if(Date.parse(currencyContext.observedAt)>started)bad();}
 const hasStats=['suggestionModelCount','configuredExtensionCount','candidateExtensionCount'].some(k=>Object.hasOwn(data,k));
 if(hasStats&&(data.suggestionModelCount!==20||!integer(data.configuredExtensionCount,1,2000)||!integer(data.candidateExtensionCount,1,Math.min(data.configuredExtensionCount,count))))bad();
 const seen=new Set();let checked=0,unverified=0,notChecked=0;
 const rows=data.candidates.map((row,index)=>{
  if(!domain(row?.domain)||seen.has(row.domain)||typeof row.isPrimary!=='boolean'||row.isPrimary!==(row.domain===primary)||!['available','unavailable','unverified','not_checked'].includes(row.status))bad();seen.add(row.domain);
  if(primary!==null&&index===0&&row.domain!==primary)bad();
  if(['available','unavailable'].includes(row.status))checked++;else if(row.status==='unverified')unverified++;else notChecked++;
  if(row.status!=='available'){if(row.price!==null)bad();return Object.freeze({domain:row.domain,isPrimary:row.isPrimary,status:row.status,price:null});}
  const p=row.price,at=stamp(row.checkedAt),expiry=stamp(row.expiresAt);
  if(at<started||at>completed||expiry<=at||expiry-at>300000||p?.currency!=='IDR'||!integer(p.amountIdr,1,1000000000000)||p.termYears!==1||p.expiresAt!==row.expiresAt||p.indicative!==true||p.purchaseAllowed!==false||(currencyContext&&expiry>Date.parse(currencyContext.expiresAt)))bad();
  return Object.freeze({domain:row.domain,isPrimary:row.isPrimary,status:expiry<=anchor?'expired':'available',checkedAt:row.checkedAt,expiresAt:row.expiresAt,price:expiry<=anchor?null:Object.freeze({currency:'IDR',amountIdr:p.amountIdr,termYears:1})});
 });
 if(data.checkedCount!==checked||data.unverifiedCount!==unverified||data.notCheckedCount!==notChecked||data.attemptedCount!==checked+unverified||data.complete!==(checked===count))bad();
 const limits=data.limits;if(!integer(limits?.requestBudget,1,256)||!integer(limits.requestsUsed,0,limits.requestBudget)||typeof limits.exhausted!=='boolean')bad();
 return Object.freeze({siteId,query,primaryDomain:primary,requestedDomain:requested,requestedExtensionSupported:data.requestedExtensionSupported,candidateCount:count,suggestionCount:50,suggestionModelCount:hasStats?data.suggestionModelCount:null,configuredExtensionCount:hasStats?data.configuredExtensionCount:null,candidateExtensionCount:hasStats?data.candidateExtensionCount:null,currencyContext,checkedCount:checked,complete:data.complete,timedOut:data.timedOut,budgetExhausted:limits.exhausted,rows:Object.freeze(rows),clockAnchorMs:anchor,monotonicAnchorMs:receivedAt});
}
export function currentCustomerSearchView(view,monotonicNow){
 const valid=Number.isFinite(monotonicNow)&&monotonicNow>=view.monotonicAnchorMs,now=valid?view.clockAnchorMs+monotonicNow-view.monotonicAnchorMs:NaN;
 const rows=view.rows.map(row=>row.status==='available'&&(!Number.isFinite(now)||Date.parse(row.expiresAt)<=now)?Object.freeze({domain:row.domain,isPrimary:row.isPrimary,status:Number.isFinite(now)?'expired':'unverified',price:null}):row);
 const usdDisplayAvailable=Number.isFinite(now)&&!!view.currencyContext&&Date.parse(view.currencyContext.observedAt)<=now&&Date.parse(view.currencyContext.expiresAt)>now;
 return Object.freeze({...view,rows:Object.freeze(rows),clockUnverified:!Number.isFinite(now),displayNowMs:now,usdDisplayAvailable});
}
export async function fetchCustomerDomainSearch(query,{siteId,token,signal,fetchImpl=globalThis.fetch,monotonic=()=>performance.now(),timeoutMs=25000}={}){
 query=normalizeCustomerSearchQuery(query);
 if(typeof siteId!=='string'||!UUID.test(siteId)||typeof token!=='string'||!token.length||token.length>8192||/[\s\u0000-\u001f\u007f]/.test(token)||typeof fetchImpl!=='function'||!integer(timeoutMs,1,30000)||signal?.aborted)bad();
 siteId=siteId.toLowerCase();const c=new AbortController();let stop,reader;
 const ended=new Promise((_,reject)=>{stop=()=>reject(invalid());c.signal.addEventListener('abort',stop,{once:true});});
 const cancel=()=>c.abort(),timer=setTimeout(cancel,timeoutMs),wait=p=>Promise.race([p,ended]);signal?.addEventListener('abort',cancel,{once:true});
 try{
  const started=monotonic(),response=await wait(fetchImpl('/api/domains/commerce/search/'+encodeURIComponent(query),{method:'POST',redirect:'error',cache:'no-store',credentials:'omit',headers:{authorization:'Bearer '+token,'x-site-id':siteId,accept:'application/json'},signal:c.signal}));
  reader=response.body?.getReader();if(!reader||response.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')bad();
  let size=0;const chunks=[];for(;;){const part=await wait(reader.read());if(part.done)break;if(!(part.value instanceof Uint8Array))bad();size+=part.value.byteLength;if(size>262144)bad();chunks.push(part.value);}
  const bytes=new Uint8Array(size);let at=0;for(const part of chunks){bytes.set(part,at);at+=part.byteLength;}const data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  if(!response.ok)throw Object.assign(new Error('CUSTOMER_SEARCH_REJECTED'),{status:response.status,code:typeof data?.code==='string'&&/^[A-Z0-9_]{1,80}$/.test(data.code)?data.code:'CUSTOMER_SEARCH_UNVERIFIED'});
  if(c.signal.aborted||signal?.aborted)bad();
  return readCustomerSearchView(data,{siteId,query,requestStartedAt:started,receivedAt:monotonic()});
 }finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel);c.signal.removeEventListener('abort',stop);c.abort();if(reader){try{Promise.resolve(reader.cancel()).catch(()=>{});}catch{}try{reader.releaseLock();}catch{}}}
}
