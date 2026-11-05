const fail=code=>{throw Object.assign(Error(code),{code});};
export async function synchronizeDomainGateway(order,{owner,getSession,fetchImpl=globalThis.fetch,signal}={}){
 if(!/^DOM-[a-f0-9]{40}$/.test(order?.orderId||'')||order.currency!=='IDR'||!Number.isSafeInteger(order.amountIdr)||order.amountIdr<1||order.amountIdr>1000000000000||order.paymentState!=='pending'||!owner||typeof getSession!=='function')fail('INVALID_RECONCILIATION_REQUEST');
 if(signal?.aborted)fail('REQUEST_ABORTED');
 const c=new AbortController(),abort=()=>c.abort();let stop;
 const ended=new Promise((_,reject)=>{stop=()=>reject(Object.assign(Error('RECONCILIATION_UNCONFIRMED'),{code:'RECONCILIATION_UNCONFIRMED'}));c.signal.addEventListener('abort',stop,{once:true});});
 const wait=p=>Promise.race([p,ended]),timer=setTimeout(abort,20000);signal?.addEventListener('abort',abort,{once:true});
 const session=async()=>{const auth=await wait(getSession());if(auth?.verification!=='verified'||auth.user?.id!==owner||!auth.session?.access_token)fail('SESSION_CHANGED');return auth;};
 try{
  const auth=await session();if(c.signal.aborted)fail('REQUEST_ABORTED');
  const response=await wait(fetchImpl('/api/commerce/domains/order-reconcile',{method:'POST',redirect:'error',cache:'no-store',credentials:'same-origin',signal:c.signal,headers:{authorization:'Bearer '+auth.session.access_token,accept:'application/json','content-type':'application/json'},body:JSON.stringify({orderId:order.orderId})}));
  if(!/^application\/json(?:\s*;.*)?$/i.test(response.headers.get('content-type')||''))fail('RECONCILIATION_UNCONFIRMED');
  const text=await wait(response.text());if(text.length>32768)fail('RECONCILIATION_UNCONFIRMED');let value;try{value=JSON.parse(text);}catch{fail('RECONCILIATION_UNCONFIRMED');}
  if(!response.ok)fail(typeof value?.code==='string'&&/^[A-Z][A-Z0-9_]{0,79}$/.test(value.code)?value.code:'RECONCILIATION_UNCONFIRMED');
  if(value?.code!=='DOMAIN_GATEWAY_TERMINAL_RECONCILED'||value.environment!=='production'||value.observationConfirmed!==true||value.gatewayActionTaken!==false||value.registrationActionTaken!==false||value.orderId!==order.orderId||value.currency!=='IDR'||value.amountIdr!==order.amountIdr||!['expired','cancelled','failed'].includes(value.paymentState))fail('RECONCILIATION_UNCONFIRMED');
  await session();if(c.signal.aborted)fail('REQUEST_ABORTED');return value;
 }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);c.signal.removeEventListener('abort',stop);}
}
