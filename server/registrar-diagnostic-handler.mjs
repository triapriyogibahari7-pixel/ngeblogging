import { diagnoseRegistrarAccess } from './registrar-token-diagnostic.mjs';
async function emptyBody(request) {
 if(request.body === null)return true;
 const reader=request.body.getReader();let timer;
 try {
  const result=await Promise.race([reader.read(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('BODY_TIMEOUT')),2000);})]);
  return result.done === true;
 } catch {return false;}
 finally {clearTimeout(timer);reader.cancel().catch(()=>{});try{reader.releaseLock();}catch{}}
}
export async function registrarDiagnosticResponse(request, env) {
 const url = new URL(request.url);
 if(url.pathname !== '/api/admin/registrar/diagnostic') return null;
 const reply = (status, code, extra = {}) => new Response(JSON.stringify({code,...extra}), {status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'}});
 const unavailable = (reason, upstreamStatus, error) => {
  const errorType=error instanceof TypeError?'type_error':error instanceof RangeError?'range_error':error instanceof Error?'error':'unknown';
  console.warn(JSON.stringify({event:'registrar_auth_unavailable',diagnosticVersion:2,reason,...(Number.isInteger(upstreamStatus)?{upstreamStatus}:{}),...(error?{errorType}:{})}));
  return reply(503,'AUTH_UNAVAILABLE');
 };
 if(!['ngeblogging.com','www.ngeblogging.com','ngeblogging.triapriyogibahari7.workers.dev','feature-domain-stages5-10-integration-20261030-ngeblogging.triapriyogibahari7.workers.dev'].includes(url.hostname) || url.protocol !== 'https:') return reply(404,'NOT_FOUND');
 if(request.method !== 'POST') return reply(405,'METHOD_NOT_ALLOWED');
 const admin = env?.REGISTRAR_DIAGNOSTIC_ADMIN_USER_ID;
 if(typeof admin !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(admin)) return reply(503,'DIAGNOSTIC_DISABLED');
 if(request.headers.get('origin') !== url.origin) return reply(403,'ORIGIN_NOT_ALLOWED');
 if(url.search || (request.headers.get('content-length') && request.headers.get('content-length') !== '0') || !(await emptyBody(request))) return reply(400,'EMPTY_REQUEST_REQUIRED');
 const auth = request.headers.get('authorization') || '';
 if(!/^Bearer [^\s]{1,8192}$/.test(auth)) return reply(401,'AUTH_REQUIRED');
 let base; try {base = new URL(env.SUPABASE_URL);} catch {return unavailable('supabase_url_invalid');}
 if(base.protocol !== 'https:' || !base.hostname.endsWith('.supabase.co') || base.port || base.username || base.password) return unavailable('supabase_url_disallowed');
 if(typeof env.SUPABASE_PUBLISHABLE_KEY !== 'string' || !env.SUPABASE_PUBLISHABLE_KEY) return unavailable('publishable_key_missing');
 let headers;
 try {headers=new Headers({Authorization:auth,apikey:env.SUPABASE_PUBLISHABLE_KEY});}
 catch(error){return unavailable('verification_headers_invalid',undefined,error);}
 const controller = new AbortController();
 let verificationRequest;
 try {verificationRequest=new Request(new URL('/auth/v1/user',base),{method:'GET',redirect:'error',headers,signal:controller.signal});}
 catch(error){return unavailable('verification_request_invalid',undefined,error);}
 const timer = setTimeout(() => controller.abort(), 5000);
 let phase='fetch';
 try {
  const response = await fetch(verificationRequest);
  if([401,403].includes(response.status)) return reply(401,'INVALID_SESSION');
  if(!response.ok) return unavailable('upstream_http_error',response.status);
  phase='decode';
  const user = await response.json();
  if(user?.id !== admin) return reply(403,'ADMIN_REQUIRED');
 } catch(error) {return unavailable(controller.signal.aborted?'verification_timeout':phase==='decode'?'upstream_json_invalid':'verification_fetch_failed',undefined,error);}
 finally {clearTimeout(timer);}
 const result = await diagnoseRegistrarAccess(env);
 return reply(result.status === 'registrar_search_access_confirmed' ? 200 : 502,'REGISTRAR_DIAGNOSTIC',result);
}
