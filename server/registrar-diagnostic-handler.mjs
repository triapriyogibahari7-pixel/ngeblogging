import { diagnoseRegistrarAccess } from './registrar-token-diagnostic.mjs';
export async function registrarDiagnosticResponse(request, env) {
 const url = new URL(request.url);
 if(url.pathname !== '/api/admin/registrar/diagnostic') return null;
 const reply = (status, code, extra = {}) => new Response(JSON.stringify({code,...extra}), {status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'}});
 if(!['ngeblogging.com','www.ngeblogging.com','ngeblogging.triapriyogibahari7.workers.dev'].includes(url.hostname) || url.protocol !== 'https:') return reply(404,'NOT_FOUND');
 if(request.method !== 'POST') return reply(405,'METHOD_NOT_ALLOWED');
 const admin = env?.REGISTRAR_DIAGNOSTIC_ADMIN_USER_ID;
 if(typeof admin !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(admin)) return reply(503,'DIAGNOSTIC_DISABLED');
 if(request.headers.get('origin') !== url.origin) return reply(403,'ORIGIN_NOT_ALLOWED');
 if(url.search || request.headers.get('content-length') && request.headers.get('content-length') !== '0' || request.body !== null) return reply(400,'EMPTY_REQUEST_REQUIRED');
 const auth = request.headers.get('authorization') || '';
 if(!/^Bearer [^\s]{1,8192}$/.test(auth)) return reply(401,'AUTH_REQUIRED');
 let base; try {base = new URL(env.SUPABASE_URL);} catch {return reply(503,'AUTH_UNAVAILABLE');}
 if(base.protocol !== 'https:' || !base.hostname.endsWith('.supabase.co') || base.port || base.username || base.password) return reply(503,'AUTH_UNAVAILABLE');
 if(typeof env.SUPABASE_PUBLISHABLE_KEY !== 'string' || !env.SUPABASE_PUBLISHABLE_KEY) return reply(503,'AUTH_UNAVAILABLE');
 const controller = new AbortController();
 const timer = setTimeout(() => controller.abort(), 5000);
 try {
  const response = await fetch(new URL('/auth/v1/user',base),{method:'GET',redirect:'error',headers:{Authorization:auth,apikey:env.SUPABASE_PUBLISHABLE_KEY},signal:controller.signal});
  if([401,403].includes(response.status)) return reply(401,'INVALID_SESSION');
  if(!response.ok) return reply(503,'AUTH_UNAVAILABLE');
  const user = await response.json();
  if(user?.id !== admin) return reply(403,'ADMIN_REQUIRED');
 } catch {return reply(503,'AUTH_UNAVAILABLE');}
 finally {clearTimeout(timer);}
 const result = await diagnoseRegistrarAccess(env);
 return reply(result.status === 'registrar_search_access_confirmed' ? 200 : 502,'REGISTRAR_DIAGNOSTIC',result);
}
