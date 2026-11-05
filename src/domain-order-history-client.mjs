import {parseOrderStatus} from './domain-order-status-model.mjs';
const UUID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const fail=code=>{throw Object.assign(Error(code),{code});};
export function parseOrderHistory(value,owner){
 if(typeof owner!=='string'||!UUID.test(owner)||value?.code!=='DOMAIN_ORDER_HISTORY'||value.environment!=='production'||value.ownerId!==owner.toLowerCase()||!Array.isArray(value.orders)||value.orders.length>50||value.count!==value.orders.length||typeof value.hasMore!=='boolean'||(value.hasMore&&value.count!==50))fail('HISTORY_UNVERIFIED');
 const seen=new Set(),orders=value.orders.map(o=>{if(typeof o?.orderId!=='string'||seen.has(o.orderId))fail('HISTORY_UNVERIFIED');seen.add(o.orderId);return parseOrderStatus({code:'DOMAIN_ORDER_STATUS',environment:'production',order:o},o.orderId);});
 for(let i=1;i<orders.length;i++){const a=orders[i-1],b=orders[i];if(Date.parse(a.createdAt)>Date.parse(b.createdAt)||(a.createdAt===b.createdAt&&a.orderId>b.orderId))fail('HISTORY_UNVERIFIED');}
 return {ownerId:owner.toLowerCase(),orders,hasMore:value.hasMore};
}
export async function loadOrderHistory(owner,token,{signal,fetchImpl=globalThis.fetch}={}){
 if(typeof owner!=='string'||!UUID.test(owner)||typeof token!=='string'||!/^\S{1,8192}$/.test(token))fail('INVALID_SESSION');
 if(signal?.aborted)fail('HISTORY_ABORTED');
 const c=new AbortController(),abort=()=>c.abort();let stop,reader;
 const ended=new Promise((_,reject)=>{stop=()=>reject(Object.assign(Error('HISTORY_UNAVAILABLE'),{code:'HISTORY_UNAVAILABLE'}));c.signal.addEventListener('abort',stop,{once:true});});
 const wait=p=>Promise.race([p,ended]),timer=setTimeout(abort,15000);signal?.addEventListener('abort',abort,{once:true});
 try{
  if(signal?.aborted)fail('HISTORY_ABORTED');
  const r=await wait(fetchImpl('/api/commerce/domains/orders/history',{method:'GET',redirect:'error',cache:'no-store',credentials:'same-origin',headers:{accept:'application/json',authorization:'Bearer '+token},signal:c.signal}));
  if(!r.ok)throw Object.assign(Error('HISTORY_HTTP_ERROR'),{code:'HISTORY_HTTP_ERROR',status:r.status});
  if(!/^application\/json(?:\s*;.*)?$/i.test(r.headers.get('content-type')||''))fail('HISTORY_UNVERIFIED');
  reader=r.body?.getReader();if(!reader)fail('HISTORY_UNVERIFIED');let size=0;const chunks=[];
  for(;;){const part=await wait(reader.read());if(part.done)break;size+=part.value.byteLength;if(size>262144)fail('HISTORY_UNVERIFIED');chunks.push(part.value);}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  if(signal?.aborted||c.signal.aborted)fail('HISTORY_ABORTED');
  return parseOrderHistory(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)),owner);
 }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);c.signal.removeEventListener('abort',stop);if(reader){reader.cancel().catch(()=>{});try{reader.releaseLock();}catch{}}}
}
