const ENDPOINT='https://api.frankfurter.dev/v2/rate/USD/IDR?providers=ecb';
const flags={referenceOnly:true,costBasisVerified:false,usableForCustomerQuote:false,purchaseAllowed:false};
const invalid=()=>{throw Error('INVALID_REFERENCE_FX');};
export function normalizeDomainReferenceFx(data,{now=Date.now()}={}){
 if(!Number.isSafeInteger(now)||Math.abs(now)>8640000000000000||data?.base!=='USD'||data.quote!=='IDR'||typeof data.rate!=='number'||!Number.isFinite(data.rate)||data.rate<=0||data.rate>1000000)invalid();
 const rate=String(data.rate);if(!/^(?:0|[1-9]\d{0,6})(?:\.\d{1,6})?$/.test(rate))invalid();
 if(typeof data.date!=='string'||!/^\d{4}-\d\d-\d\d$/.test(data.date))invalid();
 const rateDay=Date.parse(data.date+'T00:00:00Z');if(!Number.isSafeInteger(rateDay)||new Date(rateDay).toISOString().slice(0,10)!==data.date)invalid();
 const today=Date.parse(new Date(now).toISOString().slice(0,10)+'T00:00:00Z'),days=(today-rateDay)/86400000;
 if(days<0||days>7||!Number.isInteger(days))invalid();
 return {status:'reference_available',...flags,base:'USD',quote:'IDR',rate,rateDate:data.date,source:'ECB reference via Frankfurter',sourceUrl:ENDPOINT,sourceDateAgeDays:days,sourceDateIsToday:days===0,retrievedAt:new Date(now).toISOString(),refreshAfter:new Date(now+300000).toISOString()};
}
export async function fetchDomainReferenceFx({fetchImpl=globalThis.fetch,clock=Date.now,signal,timeoutMs=6000}={}){
 const unavailable=()=>({status:'reference_unavailable',...flags});
 if(signal?.aborted||!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>6000)return unavailable();
 const controller=new AbortController(),abort=()=>controller.abort();let stop,reader;
 const stopped=new Promise((_,reject)=>{stop=()=>reject(Error('REFERENCE_TIMEOUT'));controller.signal.addEventListener('abort',stop,{once:true});});
 const timer=setTimeout(abort,timeoutMs),wait=p=>Promise.race([p,stopped]);signal?.addEventListener('abort',abort,{once:true});
 try{
  let response;
  for(let attempt=0;attempt<2;attempt++){
   if(controller.signal.aborted||signal?.aborted)return unavailable();
   try{response=await wait(fetchImpl(new Request(ENDPOINT,{method:'GET',redirect:'manual',credentials:'omit',headers:{accept:'application/json'},signal:controller.signal})));}
   catch{if(attempt===0&&!controller.signal.aborted&&!signal?.aborted)continue;return unavailable();}
   if(response.status<500||response.status>599||attempt===1)break;
   response.body?.cancel().catch(()=>{});
  }
  if(response.status!==200||!/^application\/json(?:\s*;.*)?$/i.test(response.headers.get('content-type')||''))return unavailable();
  reader=response.body?.getReader();if(!reader)return unavailable();
  let size=0;const chunks=[];for(;;){const x=await wait(reader.read());if(x.done)break;size+=x.value.length;if(size>8192)return unavailable();chunks.push(x.value);}
  const bytes=new Uint8Array(size);let offset=0;for(const part of chunks){bytes.set(part,offset);offset+=part.length;}
  if(controller.signal.aborted||signal?.aborted)return unavailable();
  return normalizeDomainReferenceFx(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)),{now:clock()});
 }catch{return unavailable();}
 finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);controller.signal.removeEventListener('abort',stop);if(reader){reader.cancel().catch(()=>{});try{reader.releaseLock();}catch{}}}
}
