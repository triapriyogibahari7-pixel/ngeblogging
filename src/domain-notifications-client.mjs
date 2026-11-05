export const domainNotificationLabels={payment_verified:'Pembayaran terverifikasi',registration_processing:'Pendaftaran domain sedang diproses',registration_succeeded:'Domain berhasil terdaftar',registration_failed:'Pendaftaran domain gagal',connection_verified:'Koneksi domain terverifikasi',connection_failed:'Koneksi domain gagal',expiry_reminder:'Pengingat kedaluwarsa domain',domain_expired:'Registrasi domain kedaluwarsa'};
const ORDER=/^DOM-[a-f0-9]{40}$/,UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const time=x=>typeof x==='string'&&x.length<=64&&Number.isFinite(Date.parse(x));
const fail=()=>{throw Error('NOTIFICATIONS_UNVERIFIED');};
export function parseDomainNotifications(v,id){
 if(!ORDER.test(id)||v?.code!=='DOMAIN_NOTIFICATIONS'||v.environment!=='production'||v.orderId!==id||!Array.isArray(v.notifications)||v.notifications.length>50)fail();
 const seen=new Set();return v.notifications.map(n=>{if(!n||typeof n.id!=='string'||!UUID.test(n.id)||seen.has(n.id)||!Object.hasOwn(domainNotificationLabels,n.kind)||!time(n.occurredAt)||(n.readAt!==null&&!time(n.readAt)))fail();seen.add(n.id);return {id:n.id,kind:n.kind,occurredAt:n.occurredAt,readAt:n.readAt};});
}
export async function requestDomainNotifications(id,token,{notificationId,signal,fetchImpl=globalThis.fetch}={}){
 const mark=notificationId!==undefined;
 if(!ORDER.test(id)||typeof token!=='string'||!/^\S{1,8192}$/.test(token)||(mark&&(typeof notificationId!=='string'||!UUID.test(notificationId))))fail();
 const c=new AbortController(),abort=()=>c.abort();let stop,reader;
 const ended=new Promise((_,reject)=>{stop=()=>reject(Error(mark?'NOTIFICATION_UPDATE_UNCONFIRMED':'NOTIFICATIONS_UNAVAILABLE'));c.signal.addEventListener('abort',stop,{once:true});});ended.catch(()=>{});
 const wait=p=>Promise.race([p,ended]),timer=setTimeout(abort,10000);signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
 try{
  if(c.signal.aborted)throw Error('REQUEST_ABORTED');
  const r=await wait(fetchImpl('/api/commerce/domains/orders/'+id+'/notifications'+(mark?'/read':''),{method:mark?'POST':'GET',redirect:'error',credentials:'same-origin',cache:'no-store',headers:{accept:'application/json',authorization:'Bearer '+token,...(mark?{'content-type':'application/json'}:{})},...(mark?{body:JSON.stringify({notificationId})}:{}),signal:c.signal}));
  if(r.status!==200)throw Error(mark?'NOTIFICATION_UPDATE_UNCONFIRMED':'NOTIFICATIONS_UNAVAILABLE');
  reader=r.body?.getReader();if(!reader)fail();let size=0;const chunks=[];for(;;){const part=await wait(reader.read());if(part.done)break;size+=part.value.byteLength;if(size>32768)fail();chunks.push(part.value);}const bytes=new Uint8Array(size);let at=0;for(const p of chunks){bytes.set(p,at);at+=p.byteLength;}const v=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  if(!mark)return parseDomainNotifications(v,id);
  if(v?.code!=='DOMAIN_NOTIFICATION_READ'||v.environment!=='production'||v.orderId!==id||v.notificationId!==notificationId||!time(v.readAt))fail();
  return {id:notificationId,readAt:v.readAt};
 }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);c.signal.removeEventListener('abort',stop);c.abort();if(reader){reader.cancel().catch(()=>{});try{reader.releaseLock();}catch{}}}
}
