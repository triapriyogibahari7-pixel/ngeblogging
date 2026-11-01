import {PREVIEW_ORIGIN,buildIsolatedSandboxStatusRequest,classifyIsolatedSandboxStatus} from './domain-isolated-sandbox-probe.mjs';
const BASE='https://polvmlrhqoiflumibfqs.supabase.co';
const PATH='/api/admin/commerce/domains/sandbox-snap-probe/notification';
const ID=/^SBPROBE-([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/;
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
// Unrouted. The isolated receipt RPC must be installed and native-tested before enabling this receiver.
export async function isolatedSandboxNotificationResponse(request,env,{fetchImpl=globalThis.fetch,timeoutMs=10000}={}){
 const url=new URL(request.url);if(url.pathname!==PATH)return null;
 const reply=(status,code,extra={})=>new Response(JSON.stringify({code,scope:'isolated_sandbox_probe',recordingConfirmed:false,domainOrderRecorded:false,registrationStarted:false,costBasisVerified:false,...extra}),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','referrer-policy':'no-referrer','x-content-type-options':'nosniff',...(status===405?{allow:'POST'}:{})}});
 if(url.origin!==PREVIEW_ORIGIN||url.username||url.password)return reply(404,'NOT_FOUND');
 if(request.method!=='POST')return reply(405,'METHOD_NOT_ALLOWED');
 if(url.search||url.hash)return reply(400,'QUERY_NOT_ALLOWED');
 if(env?.DOMAIN_SANDBOX_SNAP_PROBE_ENABLED!=='true')return reply(503,'PROBE_DISABLED');
 const key=env.DOMAIN_MIDTRANS_SANDBOX_SERVER_KEY;
 if(env.DOMAIN_ORDER_ENV!=='sandbox'||env.SUPABASE_URL!==BASE||!env.SUPABASE_SERVICE_ROLE_KEY||!UUID.test(env.REGISTRAR_DIAGNOSTIC_ADMIN_USER_ID||'')||typeof key!=='string'||!/^SB-Mid-server-[A-Za-z0-9_-]{10,200}$/.test(key)||!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>10000)return reply(503,'PROBE_CONFIGURATION_UNAVAILABLE');
 if(!/^application\/json(?:\s*;.*)?$/i.test(request.headers.get('content-type')||''))return reply(415,'JSON_REQUIRED');
 const c=new AbortController(),abort=()=>c.abort();let rejectStop;const stopped=new Promise((_,reject)=>{rejectStop=()=>reject(Error('TIMEOUT'));c.signal.addEventListener('abort',rejectStop,{once:true});});const timer=setTimeout(abort,timeoutMs);if(request.signal.aborted)abort();else request.signal.addEventListener('abort',abort,{once:true});
 const wait=p=>Promise.race([p,stopped]);
 const send=r=>{if(c.signal.aborted)throw Error('TIMEOUT');return wait(fetchImpl(r));};
 const json=async(response,limit)=>{if(!/^application\/json(?:\s*;.*)?$/i.test(response.headers.get('content-type')||'')){response.body?.cancel().catch(()=>{});throw Error('INVALID_JSON');}const reader=response.body?.getReader();if(!reader)throw Error('INVALID_JSON');try{let size=0;const chunks=[];for(let i=0;i<1024;i++){const x=await wait(reader.read());if(x.done){const bytes=new Uint8Array(size);let offset=0;for(const b of chunks){bytes.set(b,offset);offset+=b.length;}return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}size+=x.value.length;if(size>limit)throw Error('BODY_TOO_LARGE');chunks.push(x.value);}throw Error('BODY_TOO_FRAGMENTED');}finally{reader.cancel().catch(()=>{});try{reader.releaseLock();}catch{}}};
 let phase='body';
 try{
  const n=await json(request,32768),match=typeof n?.order_id==='string'?ID.exec(n.order_id):null;
  if(!n||Array.isArray(n)||!match||typeof n.status_code!=='string'||!/^\d{3}$/.test(n.status_code)||typeof n.gross_amount!=='string'||!/^10000(?:\.0{1,2})?$/.test(n.gross_amount)||typeof n.signature_key!=='string'||!/^[a-f0-9]{128}$/i.test(n.signature_key)||typeof n.transaction_id!=='string'||!/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(n.transaction_id)||(n.currency!==undefined&&n.currency!=='IDR'))return reply(400,'INVALID_PROBE_NOTIFICATION');
  phase='signature';
  const hash=await wait(crypto.subtle.digest('SHA-512',new TextEncoder().encode(n.order_id+n.status_code+n.gross_amount+key)));
  const expected=Array.from(new Uint8Array(hash),x=>x.toString(16).padStart(2,'0')).join(''),provided=n.signature_key.toLowerCase();let diff=0;for(let i=0;i<128;i++)diff|=expected.charCodeAt(i)^provided.charCodeAt(i);if(diff!==0)return reply(401,'INVALID_SIGNATURE');
  phase='gateway';
  const gResponse=await send(new Request(buildIsolatedSandboxStatusRequest({env,probeId:n.order_id}),{signal:c.signal}));
  if(![200,404].includes(gResponse.status)){gResponse.body?.cancel().catch(()=>{});throw Error('GATEWAY_UNAVAILABLE');}const g=await json(gResponse,8192);
  const state=classifyIsolatedSandboxStatus({status:gResponse.status,data:g,probeId:n.order_id});
  if(['not_yet_visible','review_required'].includes(state.state))return reply(503,'PROBE_STATUS_REVIEW_REQUIRED');
  if(g.transaction_id!==n.transaction_id||typeof g.payment_type!=='string'||!/^[a-z0-9_]{2,40}$/.test(g.payment_type)||(typeof n.merchant_id==='string'&&typeof g.merchant_id==='string'&&n.merchant_id!==g.merchant_id))return reply(409,'PROBE_IDENTITY_MISMATCH');
  phase='ledger';
  const target=new URL(BASE+'/rest/v1/domain_isolated_probe_attempts');target.searchParams.set('select','attempt_id,probe_id,environment,currency,amount_idr,state');target.searchParams.set('attempt_id','eq.'+match[1]);target.searchParams.set('user_id','eq.'+env.REGISTRAR_DIAGNOSTIC_ADMIN_USER_ID);target.searchParams.set('limit','1');
  const headers={apikey:env.SUPABASE_SERVICE_ROLE_KEY,authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY};
  const ledgerResponse=await send(new Request(target,{method:'GET',redirect:'manual',headers,signal:c.signal}));if(ledgerResponse.status!==200){ledgerResponse.body?.cancel().catch(()=>{});throw Error('LEDGER_UNAVAILABLE');}const rows=await json(ledgerResponse,8192);
  if(Array.isArray(rows)&&rows.length===0)return reply(404,'PROBE_NOT_FOUND');
  const row=Array.isArray(rows)&&rows.length===1?rows[0]:null;if(row?.attempt_id!==match[1]||row.probe_id!==n.order_id||row.environment!=='sandbox'||row.currency!=='IDR'||row.amount_idr!==10000||!['creating','ready','review_required'].includes(row.state))return reply(409,'PROBE_LEDGER_MISMATCH');
  phase='receipt';
  const rResponse=await send(new Request(BASE+'/rest/v1/rpc/domain_isolated_probe_record_receipt',{method:'POST',redirect:'manual',headers:{...headers,'content-type':'application/json'},body:JSON.stringify({p_attempt_id:match[1],p_transaction_id:g.transaction_id,p_gateway_status:g.transaction_status,p_payment_type:g.payment_type}),signal:c.signal}));
  if(rResponse.status!==200){rResponse.body?.cancel().catch(()=>{});return reply(503,'PROBE_RECEIPT_UNCONFIRMED');}const r=await json(rResponse,8192);
  if(r?.ok!==true||r.receipt_recorded!==true||r.attempt_id!==match[1]||r.probe_id!==n.order_id||r.environment!=='sandbox'||r.currency!=='IDR'||r.amount_idr!==10000||r.transaction_id!==g.transaction_id||r.gateway_status!==g.transaction_status||r.payment_type!==g.payment_type||r.registration_action_taken!==false||typeof r.event_reused!=='boolean'||typeof r.event_key!=='string'||!/^[a-f0-9]{64}$/.test(r.event_key))return reply(503,'PROBE_RECEIPT_UNCONFIRMED');
  return reply(200,'ISOLATED_SANDBOX_NOTIFICATION_RECORDED',{recordingConfirmed:true,eventReused:r.event_reused,paymentConfirmed:state.paymentConfirmed,state:state.state});
 }catch{return reply(phase==='body'&&!c.signal.aborted?400:503,phase==='body'&&!c.signal.aborted?'INVALID_PROBE_NOTIFICATION':'PROBE_NOTIFICATION_UNAVAILABLE');}
 finally{clearTimeout(timer);request.signal.removeEventListener('abort',abort);c.signal.removeEventListener('abort',rejectStop);}
}
