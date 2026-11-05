import {validateRecoveryInput,recoveryResult,UUID,ORDER} from '../shared/domain-recovery-policy-v2.mjs';
import {observeDomainRecoveryGateway} from './domain-order-recovery-gateway.mjs';
const BASE='https://polvmlrhqoiflumibfqs.supabase.co',PATH='/api/commerce/domains/order-recovery-accept';
async function json(stream,wait,limit=32768){const reader=stream?.getReader();if(!reader)throw Error('BODY_UNAVAILABLE');try{let n=0;const a=[];for(;;){const x=await wait(reader.read());if(x.done)break;n+=x.value.length;if(n>limit)throw Error('BODY_TOO_LARGE');a.push(x.value);}const b=new Uint8Array(n);let p=0;for(const x of a){b.set(x,p);p+=x.length;}return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(b));}finally{reader.cancel().catch(()=>{});try{reader.releaseLock();}catch{}}}
async function defaultRegistrant(domain,details,schema){const [{registrarPayload},{assertRegistrarSchemaPayload},{registrationDigest}]=await Promise.all([import('./domain-registration-runtime.mjs'),import('./domain-registrar-schema-validation.mjs'),import('./domain-production-registration-processor.mjs')]);const payload=registrarPayload(domain,details);assertRegistrarSchemaPayload(schema,payload);return {payload,schemaSha256:await registrationDigest(schema)};}
const digest=async x=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(x)))),b=>b.toString(16).padStart(2,'0')).join('');
export async function domainOrderRecoveryAcceptResponse(request,env,{fetchImpl=globalThis.fetch,clock=Date.now,observeGateway=observeDomainRecoveryGateway,validateRegistrant=defaultRegistrant}={}){
 const u=new URL(request.url);if(u.pathname!==PATH)return null;
 const reply=(status,code,extra={})=>Response.json({code,environment:'production',checkoutCreated:false,registrationStarted:false,...extra},{status,headers:{'cache-control':'private, no-store',vary:'Authorization','x-content-type-options':'nosniff',...(status===405?{allow:'POST'}:{})}});
 if(u.origin!=='https://ngeblogging.com'||u.search)return reply(404,'NOT_FOUND');if(request.method!=='POST')return reply(405,'METHOD_NOT_ALLOWED');
 if(request.headers.get('origin')!==u.origin)return reply(403,'ORIGIN_NOT_ALLOWED');
 if(env?.DOMAIN_ORDER_RECOVERY_ENABLED!=='true'||env.DOMAIN_CUSTOMER_PRODUCTION_ENABLED!=='true'||env.DOMAIN_ORDER_ENV!=='production')return reply(503,'DOMAIN_RECOVERY_DISABLED');
 if(env.SUPABASE_URL?.replace(/\/$/,'')!==BASE||!env.SUPABASE_PUBLISHABLE_KEY||!env.SUPABASE_SERVICE_ROLE_KEY||!env.CLOUDFLARE_REGISTRAR_API_TOKEN||env.DOMAIN_REGISTRATION_TERMS_VERSION!=='cloudflare-domain-registration-2026-08-20'||env.DOMAIN_MIDTRANS_PRODUCTION_MERCHANT_ID!=='M190228985')return reply(503,'DOMAIN_RECOVERY_CONFIGURATION_UNAVAILABLE');
 const auth=request.headers.get('authorization')||'';if(!/^Bearer [^\s]{1,8192}$/.test(auth))return reply(401,'AUTH_REQUIRED');
 if(!/^application\/json(?:\s*;.*)?$/i.test(request.headers.get('content-type')||''))return reply(415,'JSON_REQUIRED');
 if(request.signal.aborted)return reply(503,'DOMAIN_RECOVERY_UNAVAILABLE');
 const c=new AbortController(),abort=()=>c.abort();let stop;
 const ended=new Promise((_,reject)=>{stop=()=>reject(Error('TIMEOUT'));c.signal.addEventListener('abort',stop,{once:true});}),wait=p=>Promise.race([p,ended]);
 const timer=setTimeout(abort,20000);request.signal.addEventListener('abort',abort,{once:true});
 const headers={apikey:env.SUPABASE_SERVICE_ROLE_KEY,authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY};
 const call=async(url,options)=>{const r=await wait(fetchImpl(url,{...options,redirect:'manual',signal:c.signal}));if(r.status!==200)throw Error('UPSTREAM_UNAVAILABLE');return json(r.body,wait);};
 const rpc=(name,args)=>call(BASE+'/rest/v1/rpc/'+name,{method:'POST',headers:{...headers,'content-type':'application/json'},body:JSON.stringify(args)});
 try{
  let input;try{input=validateRecoveryInput(await json(request.body,wait,16384));}catch{return reply(400,'INVALID_RECOVERY_ACCEPTANCE');}
  const ar=await wait(fetchImpl(BASE+'/auth/v1/user',{method:'GET',redirect:'manual',headers:{authorization:auth,apikey:env.SUPABASE_PUBLISHABLE_KEY},signal:c.signal}));
  if([401,403].includes(ar.status))return reply(401,'INVALID_SESSION');if(ar.status!==200)throw Error('AUTH_UNAVAILABLE');const user=await json(ar.body,wait);if(!UUID.test(user?.id||''))return reply(401,'INVALID_SESSION');const owner=user.id.toLowerCase();
  const rowsUrl=new URL(BASE+'/rest/v1/domain_purchase_orders');for(const [k,v] of Object.entries({select:'order_id,user_id,quote_id,environment,currency,amount_idr,payment_state,registration_state',order_id:'eq.'+input.orderId,user_id:'eq.'+owner,environment:'eq.production',limit:'1'}))rowsUrl.searchParams.set(k,v);
  const rows=await call(rowsUrl.href,{method:'GET',headers});if(Array.isArray(rows)&&!rows.length)return reply(404,'DOMAIN_ORDER_NOT_FOUND');const o=Array.isArray(rows)&&rows.length===1?rows[0]:null;
  if(o?.order_id!==input.orderId||o.user_id!==owner||o.environment!=='production'||o.currency!=='IDR'||!UUID.test(o.quote_id||'')||!Number.isSafeInteger(o.amount_idr))throw Error('ORDER_UNVERIFIED');
  if(o.payment_state!=='pending'||o.registration_state!=='not_started')return reply(409,'ORDER_ALREADY_PROCESSED');
  const qurl=new URL(BASE+'/rest/v1/domain_sale_quotes');for(const [k,v] of Object.entries({select:'id,user_id,domain,environment',id:'eq.'+o.quote_id,user_id:'eq.'+owner,environment:'eq.production',limit:'1'}))qurl.searchParams.set(k,v);
  const qr=await call(qurl.href,{method:'GET',headers}),q=Array.isArray(qr)&&qr.length===1?qr[0]:null;
  if(q?.id!==o.quote_id||q.user_id!==owner||q.environment!=='production'||typeof q.domain!=='string'||q.domain.length>253||q.domain.split('.').length!==2||q.domain.split('.').some(x=>!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(x)))throw Error('QUOTE_UNVERIFIED');
  const ext=await call('https://api.cloudflare.com/client/v4/accounts/095e57b46e7ba7f6b188480d9e4e5fe7/registrar/extensions/'+q.domain.split('.').at(-1),{method:'GET',headers:{authorization:'Bearer '+env.CLOUDFLARE_REGISTRAR_API_TOKEN,accept:'application/json'}});
  const schema=ext?.result?.registration_schema;if(ext?.success!==true||!schema||typeof schema!=='object'||Array.isArray(schema))throw Error('SCHEMA_UNAVAILABLE');
  let validated;try{validated=await validateRegistrant(q.domain,input.registrant,schema);if(!validated?.payload||!/^[a-f0-9]{64}$/.test(validated.schemaSha256||''))throw Error('INVALID_VALIDATION');}catch{return reply(422,'INVALID_REGISTRANT_DETAILS');}
  // A valid Core 404 remains ambiguous. The SQL RPC additionally requires an
  // independent, short-lived, manually reconciled Snap evidence row.
  const g=await wait(observeGateway(env,{orderId:o.order_id,amountIdr:o.amount_idr,signal:c.signal},{fetchImpl,clock}));
  if(g?.code!=='GATEWAY_SNAP_ABSENCE_UNPROVEN'||g.recoveryAllowed!==false||g.gatewayStatus!=='unknown'||!Number.isFinite(Date.parse(g.checkedAt)))return reply(409,'GATEWAY_RECONCILIATION_REQUIRED');
  const r=await rpc('domain_accept_order_recovery_v2',{p_user_id:owner,p_order_id:input.orderId,p_request_id:input.requestId,p_previous_quote_id:input.previousQuoteId,p_expected_updated_at:input.expectedOrderUpdatedAt,p_quote_id:input.quoteId,p_amount_idr:input.amountIdr,p_payload:validated.payload,p_schema_sha256:validated.schemaSha256,p_terms_version:input.termsVersion,p_accepted:true,p_gateway_checked_at:g.checkedAt,p_gateway_evidence_sha256:await digest({orderId:o.order_id,amountIdr:o.amount_idr,code:g.code,checkedAt:g.checkedAt})});
  const blocked=new Set(['ORDER_CHANGED','RECOVERY_ACCEPTANCE_CONFLICT','GATEWAY_RECONCILIATION_REQUIRED','GATEWAY_STATUS_UNVERIFIED','RECOVERY_QUOTE_UNVERIFIED','REGISTRATION_DETAILS_LOCKED','DOMAIN_REGISTRATION_RESERVED','SITE_OWNER_REQUIRED','DOMAIN_ORDER_NOT_FOUND','ORDER_ALREADY_CANCELLED','ORDER_RECOVERY_REVIEW_REQUIRED','QUOTE_SNAPSHOT_MISMATCH','REGISTRATION_RECONCILIATION_REQUIRED','ORDER_SITE_BINDING_REQUIRED','ORDER_SITE_BINDING_UNVERIFIED','RECOVERY_NOT_REQUIRED','RECOVERY_QUOTE_ALREADY_USED']);
  if(r?.ok===false&&blocked.has(r.error))return reply(r.error==='DOMAIN_ORDER_NOT_FOUND'?404:r.error==='SITE_OWNER_REQUIRED'?403:409,r.error);
  recoveryResult(r,input,clock());return reply(200,'DOMAIN_ORDER_RECOVERY_ACCEPTED',{orderId:r.order_id,quoteId:r.quote_id,amountIdr:r.amount_idr,currency:'IDR',reused:r.reused,registrantRevalidated:true,paymentWindowExpiresAt:r.expires_at,paymentWindowPolicy:r.payment_window_policy});
 }catch{return reply(503,'DOMAIN_RECOVERY_UNAVAILABLE');}
 finally{clearTimeout(timer);request.signal.removeEventListener('abort',abort);c.signal.removeEventListener('abort',stop);}
}
