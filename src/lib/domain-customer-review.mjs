import {readCustomerCurrencyContext} from '../../shared/domain-currency-display.mjs';
const UUID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const fields=['v','reviewId','userId','siteId','environment','providerId','registrarAccountRef','operation','domain','currency','amountIdr','years','issuedAt','expiresAt'];
const invalid=()=>Object.assign(new Error('CUSTOMER_REVIEW_UNVERIFIED'),{code:'CUSTOMER_REVIEW_UNVERIFIED'});
const bad=()=>{throw invalid();};
function id(value){if(typeof value!=='string'||!UUID.test(value))bad();return value.toLowerCase();}
function domain(value){if(typeof value!=='string'||value.length>253||value!==value.toLowerCase()||!value.includes('.')||/^\d+(?:\.\d+){3}$/.test(value)||value.split('.').some(label=>!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)))bad();try{if(new URL('https://'+value).hostname!==value)bad();}catch{bad();}return value;}
function stamp(value){if(typeof value!=='string'||value.length>64||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(value)||!Number.isSafeInteger(Date.parse(value)))bad();return Date.parse(value);}
function decode(value,max){if(typeof value!=='string'||!value.length||value.length>max||!/^[A-Za-z0-9_-]+$/.test(value))bad();let binary;try{binary=atob(value.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-value.length%4)%4));}catch{bad();}if(btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')!==value)bad();return Uint8Array.from(binary,c=>c.charCodeAt(0));}
// Payload consistency only: the browser does not authenticate the HMAC.
export function readCustomerDomainReview(data,{userId,siteId,domain:expectedDomain,requestStartedAt,receivedAt}={}){
 userId=id(userId);siteId=id(siteId);expectedDomain=domain(expectedDomain);
 if(!Number.isFinite(requestStartedAt)||!Number.isFinite(receivedAt)||requestStartedAt<0||receivedAt<requestStartedAt||receivedAt-requestStartedAt>30000)bad();
 if(data?.code!=='DOMAIN_CUSTOMER_REVIEW'||data.environment!=='production'||data.reviewReceiptVersion!==2||data.siteId!==siteId||data.domain!==expectedDomain||data.reviewOnly!==true||data.orderCreated!==false||data.paymentStarted!==false||data.purchaseAllowed!==false||data.checkoutAvailable!==false)bad();
 const r=data.review,p=r?.price,q=r?.quoteContext;
 if(!q||typeof q!=='object'||Array.isArray(q)||Object.keys(q).length!==2||!['cloudflare','opensrs'].includes(q.providerId)||typeof q.registrarAccountRef!=='string'||!/^[A-Za-z0-9_.:-]{1,120}$/.test(q.registrarAccountRef))bad();
 if(r?.siteId!==siteId||r.domain!==expectedDomain||r.reviewId!==id(r.reviewId)||r.purchaseAllowed!==false||r.checkoutAvailable!==false||p?.currency!=='IDR'||p.termYears!==1||!Number.isSafeInteger(p.amountIdr)||p.amountIdr<1||p.amountIdr>1000000000000||typeof r.token!=='string'||r.token.length>4096)bad();
 const parts=r.token.split('.');if(parts.length!==3||parts[0]!=='NDR2'||decode(parts[2],64).length!==32)bad();
 const bytes=decode(parts[1],3072);if(bytes.byteLength>2048)bad();let claims;try{claims=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{bad();}
 const issued=stamp(r.issuedAt),expires=stamp(r.expiresAt),anchor=issued+receivedAt-requestStartedAt;
 if(!claims||Array.isArray(claims)||typeof claims!=='object'||Object.keys(claims).length!==fields.length||fields.some(key=>!Object.hasOwn(claims,key))||claims.v!==2||claims.environment!=='production'||claims.operation!=='registration'||claims.providerId!==q.providerId||claims.registrarAccountRef!==q.registrarAccountRef||claims.reviewId!==r.reviewId||claims.userId!==userId||claims.siteId!==siteId||claims.domain!==expectedDomain||claims.currency!=='IDR'||claims.years!==1||claims.amountIdr!==p.amountIdr||claims.issuedAt!==issued||claims.expiresAt!==expires||issued<0||expires<=issued||expires-issued>120000||!Number.isFinite(anchor)||Math.abs(anchor)>8640000000000000)bad();
 let currencyContext=null;
 if(Object.hasOwn(data,'currencyContext')){try{currencyContext=readCustomerCurrencyContext(data.currencyContext);}catch{bad();}if(Date.parse(currencyContext.observedAt)>issued||Date.parse(currencyContext.expiresAt)<expires)bad();}
 const ready=expires>anchor;
 return Object.freeze({userId,siteId,domain:expectedDomain,reviewId:r.reviewId,quoteContext:Object.freeze({providerId:q.providerId,registrarAccountRef:q.registrarAccountRef}),issuedAt:r.issuedAt,expiresAt:r.expiresAt,currencyContext,token:ready?r.token:null,price:ready?Object.freeze({currency:'IDR',amountIdr:p.amountIdr,termYears:1}):null,status:ready?'ready':'expired',clockAnchorMs:anchor,monotonicAnchorMs:receivedAt,signatureVerified:false,purchaseAllowed:false,checkoutAvailable:false});
}
export function currentCustomerDomainReview(view,monotonicNow){
 const now=Number.isFinite(monotonicNow)&&monotonicNow>=view.monotonicAnchorMs?view.clockAnchorMs+monotonicNow-view.monotonicAnchorMs:NaN;
 if(view.status!=='ready'||!Number.isFinite(now)||Date.parse(view.expiresAt)<=now)return Object.freeze({...view,status:Number.isFinite(now)?'expired':'unverified',token:null,price:null,displayNowMs:now,usdDisplayAvailable:false});
 const usdDisplayAvailable=!!view.currencyContext&&Date.parse(view.currencyContext.observedAt)<=now&&Date.parse(view.currencyContext.expiresAt)>now;
 return Object.freeze({...view,displayNowMs:now,usdDisplayAvailable});
}
export async function fetchCustomerDomainReview(name,{userId,siteId,token,signal,fetchImpl=globalThis.fetch,monotonic=()=>performance.now(),timeoutMs=28000}={}){
 name=domain(name);userId=id(userId);siteId=id(siteId);
 if(typeof token!=='string'||!token.length||token.length>8192||/[\s\u0000-\u001f\u007f]/.test(token)||typeof fetchImpl!=='function'||typeof monotonic!=='function'||!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>30000||signal?.aborted)bad();
 const c=new AbortController();let stop,reader;
 const ended=new Promise((_,reject)=>{stop=()=>reject(invalid());c.signal.addEventListener('abort',stop,{once:true});});
 const cancel=()=>c.abort(),timer=setTimeout(cancel,timeoutMs),wait=p=>Promise.race([p,ended]);signal?.addEventListener('abort',cancel,{once:true});
 try{
  const started=monotonic(),response=await wait(fetchImpl('/api/domains/commerce/review/'+encodeURIComponent(name),{method:'POST',redirect:'error',cache:'no-store',credentials:'omit',headers:{authorization:'Bearer '+token,'x-site-id':siteId,accept:'application/json'},signal:c.signal}));
  reader=response.body?.getReader();if(!reader||response.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')bad();
  let size=0;const chunks=[];for(;;){const part=await wait(reader.read());if(part.done)break;if(!(part.value instanceof Uint8Array))bad();size+=part.value.byteLength;if(size>32768)bad();chunks.push(part.value);}
  const bytes=new Uint8Array(size);let at=0;for(const part of chunks){bytes.set(part,at);at+=part.byteLength;}const data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  if(!response.ok)throw Object.assign(new Error('CUSTOMER_REVIEW_REJECTED'),{status:response.status,code:typeof data?.code==='string'&&/^[A-Z0-9_]{1,80}$/.test(data.code)?data.code:'CUSTOMER_REVIEW_UNVERIFIED'});
  if(c.signal.aborted||signal?.aborted)bad();return readCustomerDomainReview(data,{userId,siteId,domain:name,requestStartedAt:started,receivedAt:monotonic()});
 }finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel);c.signal.removeEventListener('abort',stop);c.abort();if(reader){try{Promise.resolve(reader.cancel()).catch(()=>{});}catch{}try{reader.releaseLock();}catch{}}}
}
