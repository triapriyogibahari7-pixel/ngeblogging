import {PREVIEW_ORIGIN,buildIsolatedSandboxSnapRequest,validateIsolatedSandboxSnapResult,buildIsolatedSandboxStatusRequest,classifyIsolatedSandboxStatus} from './domain-isolated-sandbox-probe.mjs';
const BASE='https://polvmlrhqoiflumibfqs.supabase.co';
const PATH='/api/admin/commerce/domains/sandbox-snap-probe';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
function wait(p,signal){if(signal.aborted)return Promise.reject(Error('TIMEOUT'));let stop;const ended=new Promise((_,reject)=>{stop=()=>reject(Error('TIMEOUT'));signal.addEventListener('abort',stop,{once:true});});return Promise.race([p,ended]).finally(()=>signal.removeEventListener('abort',stop));}
async function json(response,signal,limit=32768){
 if(!/^application\/json(?:\s*;.*)?$/i.test(response.headers.get('content-type')||'')){response.body?.cancel().catch(()=>{});throw Error('JSON_REQUIRED');}
 const reader=response.body?.getReader();if(!reader)throw Error('EMPTY_BODY');
 try{let size=0;const chunks=[];for(let i=0;i<1024;i++){const x=await wait(reader.read(),signal);if(x.done){const bytes=new Uint8Array(size);let offset=0;for(const b of chunks){bytes.set(b,offset);offset+=b.length;}return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}size+=x.value.length;if(size>limit)throw Error('BODY_TOO_LARGE');chunks.push(x.value);}throw Error('TOO_MANY_CHUNKS');}
 finally{reader.cancel().catch(()=>{});try{reader.releaseLock();}catch{}}
}
function identity(s,id){if(s?.attempt_id!==id||s.probe_id!=='SBPROBE-'+id||s.environment!=='sandbox'||s.currency!=='IDR'||s.amount_idr!==10000||!['creating','ready','review_required'].includes(s.state))throw Error('LEDGER_UNVERIFIED');const anchor=Date.parse(s.expiry_anchor_at),expires=Date.parse(s.expires_at);if(!Number.isFinite(anchor)||!Number.isFinite(expires)||expires-anchor!==900000)throw Error('WINDOW_UNVERIFIED');return {anchor,expires};}
// Unrouted adapter. Do not set notificationReceiverReady until the isolated receiver is implemented and tested.
export async function isolatedSandboxProbeResponse(request,env,{fetchImpl=globalThis.fetch,now=Date.now,notificationReceiverReady=false,timeoutMs=18000}={}){
 const url=new URL(request.url);if(![PATH,PATH+'/status'].includes(url.pathname))return null;
 const reply=(status,code,extra={})=>new Response(JSON.stringify({code,scope:'isolated_sandbox_probe',environment:'sandbox',currency:'IDR',amountIdr:10000,customerQuoteCreated:false,domainOrderRecorded:false,registrationStarted:false,costBasisVerified:false,...extra}),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','referrer-policy':'no-referrer','x-content-type-options':'nosniff','x-robots-tag':'noindex',...(status===405?{allow:'POST'}:{})}});
 if(url.origin!==PREVIEW_ORIGIN||url.username||url.password)return reply(404,'NOT_FOUND');
 if(request.method!=='POST')return reply(405,'METHOD_NOT_ALLOWED');
 if(url.search||url.hash)return reply(400,'QUERY_NOT_ALLOWED');
 if(request.headers.get('origin')!==PREVIEW_ORIGIN)return reply(403,'ORIGIN_NOT_ALLOWED');
 if(env?.DOMAIN_SANDBOX_SNAP_PROBE_ENABLED!=='true')return reply(503,'PROBE_DISABLED');
 if(env.DOMAIN_ORDER_ENV!=='sandbox'||env.SUPABASE_URL!==BASE||!UUID.test(env.REGISTRAR_DIAGNOSTIC_ADMIN_USER_ID||'')||!env.SUPABASE_PUBLISHABLE_KEY||!env.SUPABASE_SERVICE_ROLE_KEY||!/^SB-Mid-server-[A-Za-z0-9_-]{10,200}$/.test(env.DOMAIN_MIDTRANS_SANDBOX_SERVER_KEY||'')||!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>18000)return reply(503,'PROBE_CONFIGURATION_UNAVAILABLE');
 if(url.pathname===PATH&&notificationReceiverReady!==true)return reply(503,'PROBE_NOTIFICATION_RECEIVER_NOT_READY');
 const auth=request.headers.get('authorization')||'';if(!/^Bearer [^\s]{1,8192}$/.test(auth))return reply(401,'AUTH_REQUIRED');
 if(!/^application\/json(?:\s*;.*)?$/i.test(request.headers.get('content-type')||''))return reply(415,'JSON_REQUIRED');
 const c=new AbortController(),abort=()=>c.abort(),timer=setTimeout(abort,timeoutMs);if(request.signal.aborted)abort();else request.signal.addEventListener('abort',abort,{once:true});
 let userId,id,uncertainClaim=false;
 const send=(r,signal=c.signal)=>{if(signal.aborted)throw Error('TIMEOUT');return wait(fetchImpl(r),signal);};
 const rpc=async(name,args,signal=c.signal)=>{const r=await send(new Request(BASE+'/rest/v1/rpc/'+name,{method:'POST',redirect:'manual',headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY,'content-type':'application/json'},body:JSON.stringify(args),signal}),signal);if(r.status!==200){r.body?.cancel().catch(()=>{});throw Error('STORAGE_UNAVAILABLE');}return json(r,signal);};
 const review=async()=>{const cleanup=new AbortController(),t=setTimeout(()=>cleanup.abort(),4000);try{const r=await rpc('domain_isolated_probe_review',{p_user_id:userId,p_attempt_id:id},cleanup.signal);return r?.ok===true&&r.attempt_id===id&&['ready','review_required'].includes(r.state)&&r.new_attempt_allowed===false;}catch{return false;}finally{clearTimeout(t);}};
 try{
  let body;try{body=await json(request,c.signal,1024);}catch{return reply(400,'INVALID_BODY');}
  if(!body||Array.isArray(body)||Object.keys(body).length!==1||typeof body.attemptId!=='string'||!UUID.test(body.attemptId))return reply(400,'INVALID_PROBE_REQUEST');id=body.attemptId;
  if(!Number.isSafeInteger(now()))return reply(503,'INVALID_CLOCK');
  const a=await send(new Request(BASE+'/auth/v1/user',{method:'GET',redirect:'manual',headers:{apikey:env.SUPABASE_PUBLISHABLE_KEY,authorization:auth},signal:c.signal}));
  if(a.status!==200){a.body?.cancel().catch(()=>{});return reply([401,403].includes(a.status)?401:503,[401,403].includes(a.status)?'INVALID_SESSION':'AUTH_UNAVAILABLE');}
  const user=await json(a,c.signal);if(!UUID.test(user?.id||''))return reply(401,'INVALID_SESSION');if(user.id!==env.REGISTRAR_DIAGNOSTIC_ADMIN_USER_ID)return reply(403,'ADMIN_REQUIRED');userId=user.id;
  if(url.pathname===PATH+'/status'){
   const target=new URL(BASE+'/rest/v1/domain_isolated_probe_attempts');target.searchParams.set('select','attempt_id,probe_id,environment,currency,amount_idr,state,expiry_anchor_at,expires_at');target.searchParams.set('user_id','eq.'+userId);target.searchParams.set('attempt_id','eq.'+id);target.searchParams.set('limit','1');
   const r=await send(new Request(target,{method:'GET',redirect:'manual',headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY},signal:c.signal}));if(r.status!==200){r.body?.cancel().catch(()=>{});throw Error();}const rows=await json(r,c.signal);if(Array.isArray(rows)&&rows.length===0)return reply(404,'PROBE_NOT_FOUND');if(!Array.isArray(rows)||rows.length!==1)throw Error();identity(rows[0],id);
   const g=await send(new Request(buildIsolatedSandboxStatusRequest({env,probeId:'SBPROBE-'+id}),{signal:c.signal}));const data=await json(g,c.signal,8192);const status=classifyIsolatedSandboxStatus({status:g.status,data,probeId:'SBPROBE-'+id});return reply(200,'ISOLATED_SANDBOX_PROBE_STATUS',{probeId:status.probeId,state:status.state,paymentConfirmed:status.paymentConfirmed,statusSource:'midtrans_sandbox_authenticated_get',notificationReceiptRecorded:false});
  }
  uncertainClaim=true;
  const s=await rpc('domain_isolated_probe_claim',{p_user_id:userId,p_attempt_id:id});
  if(s?.ok===false){if(['PROBE_ALREADY_EXISTS','PROBE_ID_CONFLICT','INVALID_PROBE_REQUEST'].includes(s.error)){uncertainClaim=false;return reply(s.error==='INVALID_PROBE_REQUEST'?400:409,s.error,{newAttemptAllowed:false});}throw Error();}
  const window=identity(s,id);
  if(s.ok!==true||s.scope!=='isolated_sandbox_probe'||s.new_attempt_allowed!==false||s.registration_action_taken!==false||s.cost_basis_verified!==false||window.anchor>now()+5000)throw Error();
  if(s.action==='hold'&&s.provider_create_allowed===false&&['PROBE_IN_PROGRESS','PROBE_REVIEW_REQUIRED','PROBE_EXPIRED'].includes(s.code)){uncertainClaim=false;return reply(409,s.code,{newAttemptAllowed:false});}
  if(!['create','reuse'].includes(s.action)||s.provider_create_allowed!==(s.action==='create')||window.expires<=now()||(s.action==='create'&&(s.state!=='creating'||window.expires-now()<300000))||(s.action==='reuse'&&s.state!=='ready'))throw Error();
  let token=s.snap_token,checkoutUrl=s.checkout_url;
  if(s.action==='create'){
   const built=buildIsolatedSandboxSnapRequest({env,origin:PREVIEW_ORIGIN,attemptId:id,now:window.anchor});const r=await send(new Request(built.request,{signal:c.signal}));if(r.status!==201){r.body?.cancel().catch(()=>{});throw Error();}const data=await json(r,c.signal,8192);const checked=validateIsolatedSandboxSnapResult({status:r.status,data,probeId:s.probe_id});token=data.token;checkoutUrl=checked.checkoutUrl;
  }else validateIsolatedSandboxSnapResult({status:201,data:{token,redirect_url:checkoutUrl},probeId:s.probe_id});
  const saved=await rpc('domain_isolated_probe_complete',{p_user_id:userId,p_attempt_id:id,p_snap_token:token,p_checkout_url:checkoutUrl});const savedWindow=identity(saved,id);
  if(saved.ok!==true||saved.scope!=='isolated_sandbox_probe'||saved.state!=='ready'||typeof saved.reused!=='boolean'||saved.snap_token!==token||saved.checkout_url!==checkoutUrl||savedWindow.anchor!==window.anchor||savedWindow.expires!==window.expires||saved.registration_action_taken!==false||saved.cost_basis_verified!==false||saved.new_attempt_allowed!==false)throw Error();
  if(saved.checkout_available===false){uncertainClaim=false;return reply(409,'PROBE_CHECKOUT_UNAVAILABLE',{newAttemptAllowed:false});}
  if(saved.checkout_available!==true||savedWindow.expires<=now())throw Error();
  uncertainClaim=false;return reply(s.action==='create'?201:200,'ISOLATED_SANDBOX_PROBE_CHECKOUT',{probeId:s.probe_id,checkoutUrl:saved.checkout_url,expiresAt:saved.expires_at,reused:s.action==='reuse',paymentConfirmed:false});
 }catch{const recorded=uncertainClaim?await review():false;return reply(503,uncertainClaim?'PROBE_REVIEW_REQUIRED':'PROBE_UNAVAILABLE',{newAttemptAllowed:false,...(uncertainClaim?{reviewRecorded:recorded}:{})});}
 finally{clearTimeout(timer);request.signal.removeEventListener('abort',abort);}
}
