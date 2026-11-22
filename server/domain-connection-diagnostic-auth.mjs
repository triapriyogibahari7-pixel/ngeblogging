// Internal authorization helper only; no HTTP route or Worker wiring.
const DB='https://polvmlrhqoiflumibfqs.supabase.co';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const deny=()=>{throw Error('DOMAIN_DIAGNOSTIC_ACCESS_DENIED');};
export async function authorizeDomainDiagnosticOperator(request,env={}, {fetchImpl=globalThis.fetch,timeoutMs=5000}={}){
 const url=new URL(request.url);
 if(request.method!=='GET'||url.origin!=='https://ngeblogging.com'||url.pathname!=='/api/internal/domain-connection-diagnostics'||url.search)deny();
 const origin=request.headers.get('origin'),site=request.headers.get('sec-fetch-site');
 if(origin&&origin!==url.origin||site&&!['same-origin','none'].includes(site))deny();
 const configured=env.DOMAIN_CONNECTION_DIAGNOSTIC_OPERATOR_IDS;
 if(typeof configured!=='string'||configured.length>740)deny();
 const ids=configured.split(',').map(x=>x.trim());
 if(!ids.length||ids.length>20||ids.some(x=>!UUID.test(x))||new Set(ids).size!==ids.length)deny();
 const key=env.SUPABASE_PUBLISHABLE_KEY||env.VITE_SUPABASE_PUBLISHABLE_KEY||env.VITE_SUPABASE_ANON_KEY;
 if(env.SUPABASE_URL!==DB||typeof key!=='string'||!key.length||key.length>4096||/[\s\x00-\x1f\x7f]/.test(key))deny();
 const authorization=request.headers.get('authorization')||'';
 if(authorization.length>4096||!/^Bearer [A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(authorization))deny();
 if(!Number.isInteger(timeoutMs)||timeoutMs<10||timeoutMs>8000)deny();
 const controller=new AbortController();let timer,reader;
 const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reader?.cancel().catch(()=>{});reject(Error('DOMAIN_DIAGNOSTIC_ACCESS_DENIED'));},timeoutMs);});
 const operation=(async()=>{
  const response=await fetchImpl(DB+'/auth/v1/user',{method:'GET',redirect:'error',credentials:'omit',signal:controller.signal,headers:{apikey:key,authorization,accept:'application/json'}});
  if(response.status!==200){response.body?.cancel().catch(()=>{});deny();}
  reader=response.body?.getReader();if(!reader)deny();
  let text='',size=0;const decoder=new TextDecoder('utf-8',{fatal:true});
  try{for(;;){if(controller.signal.aborted)deny();const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>16384)deny();text+=decoder.decode(part.value,{stream:true});}text+=decoder.decode();}finally{reader.cancel().catch(()=>{});}
  const user=JSON.parse(text),confirmed=Date.parse(user?.email_confirmed_at),now=Date.now();
  if(!UUID.test(user?.id||'')||!ids.includes(user.id)||user.is_anonymous!==false||!Number.isFinite(confirmed)||confirmed>now)deny();
  if(user.banned_until!==undefined&&user.banned_until!==null&&(!Number.isFinite(Date.parse(user.banned_until))||Date.parse(user.banned_until)>now))deny();
  return {id:user.id};
 })();
 try{return await Promise.race([operation,deadline]);}catch{deny();}finally{clearTimeout(timer);controller.abort();}
}
