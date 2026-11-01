export async function probeDomainSandboxStatus(env,{fetchImpl=globalThis.fetch,timeoutMs=5000,signal,makeProbeId=()=>{const b=crypto.getRandomValues(new Uint8Array(20));return 'DOM-'+Array.from(b,x=>x.toString(16).padStart(2,'0')).join('');}}={}){
 const result=status=>({status,environment:'sandbox',statusReadOnly:true,snapWriteVerified:false,paymentCreated:false,registrationStarted:false,costsVerified:false});
 if(env?.DOMAIN_ORDER_ENV!=='sandbox')return result('sandbox_required');
 const key=env.DOMAIN_MIDTRANS_SANDBOX_SERVER_KEY;
 if(typeof key!=='string'||!key)return result('key_missing');
 if(!/^SB-Mid-server-[A-Za-z0-9_-]{10,200}$/.test(key))return result('key_format_invalid');
 if(signal?.aborted||!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>5000)return result('not_confirmed');
 const c=new AbortController(),abort=()=>c.abort();let stop,reader;
 const stopped=new Promise((_,reject)=>{stop=()=>reject(Error('PROBE_TIMEOUT'));c.signal.addEventListener('abort',stop,{once:true});});
 const timer=setTimeout(abort,timeoutMs),wait=p=>Promise.race([p,stopped]);signal?.addEventListener('abort',abort,{once:true});
 try{
  const id=makeProbeId();if(typeof id!=='string'||!/^DOM-[a-f0-9]{40}$/.test(id))return result('not_confirmed');
  const r=await wait(fetchImpl(new Request('https://api.sandbox.midtrans.com/v2/'+id+'/status',{method:'GET',redirect:'manual',credentials:'omit',headers:{authorization:'Basic '+btoa(key+':'),accept:'application/json'},signal:c.signal})));
  if([401,403].includes(r.status)){r.body?.cancel().catch(()=>{});return result('authentication_rejected');}
  if(![200,404].includes(r.status)||!/^application\/json(?:\s*;.*)?$/i.test(r.headers.get('content-type')||'')){r.body?.cancel().catch(()=>{});return result('not_confirmed');}
  reader=r.body?.getReader();if(!reader)return result('not_confirmed');let size=0;const chunks=[];
  for(;;){const x=await wait(reader.read());if(x.done)break;size+=x.value.length;if(size>8192)return result('not_confirmed');chunks.push(x.value);}
  const bytes=new Uint8Array(size);let pos=0;for(const b of chunks){bytes.set(b,pos);pos+=b.length;}
  const data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  if(data?.status_code==='404')return result('status_read_accepted');
  return result(['401','403'].includes(data?.status_code)?'authentication_rejected':'not_confirmed');
 }catch{return result('not_confirmed');}
 finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);c.signal.removeEventListener('abort',stop);if(reader){reader.cancel().catch(()=>{});try{reader.releaseLock();}catch{}}}
}

export const PROBE_SCRIPT=String.raw`const button=document.getElementById('probe'),output=document.getElementById('result');
let busy=false,lastToken=null;
const messages={sandbox_required:'Environment harus sandbox.',key_missing:'Kunci sandbox khusus domain belum terbaca.',key_format_invalid:'Format kunci sandbox belum sesuai.',authentication_rejected:'Autentikasi atau izin baca status ditolak Midtrans. Ini bukan konfirmasi izin membuat Snap.',status_read_accepted:'Midtrans menerima permintaan baca status. ID uji tidak ditemukan, sesuai rancangan. Izin membuat Snap dan biaya belum diverifikasi.',not_confirmed:'Akses baca belum terkonfirmasi. Tidak ada transaksi dibuat.'};
function session(){try{const s=JSON.parse(localStorage.getItem('sb-polvmlrhqoiflumibfqs-auth-token')||'null');if(!Number.isFinite(s?.expires_at)||s.expires_at*1000<=Date.now()||typeof s.access_token!=='string'||!/^\S{1,8192}$/.test(s.access_token))return null;return s.access_token;}catch{return null;}}
function refresh(){const token=session();button.disabled=busy||!token;if(lastToken&&lastToken!==token){lastToken=null;output.textContent='Sesi berubah. Hasil sebelumnya disembunyikan.';}if(!token)output.textContent='Login dengan akun Ngeblogging yang sudah ada pada preview ini; tidak perlu mendaftar ulang.';}
button.addEventListener('click',async()=>{if(busy)return;const token=session();if(!token){refresh();return;}busy=true;lastToken=null;refresh();output.textContent='Memeriksa akses baca Midtrans Sandbox, tanpa membuat transaksi...';const c=new AbortController(),timer=setTimeout(()=>c.abort(),18000);try{const r=await fetch('/api/admin/commerce/domains/sandbox-status-probe',{method:'POST',redirect:'error',cache:'no-store',credentials:'omit',headers:{authorization:'Bearer '+token},signal:c.signal});const d=await r.json();if(session()!==token){output.textContent='Sesi berubah. Hasil disembunyikan.';return;}if(r.status===401||r.status===403){output.textContent='Login kembali menggunakan akun admin preview.';return;}if(d?.code!=='DOMAIN_SANDBOX_STATUS_PROBE'||d.environment!=='sandbox'||d.statusReadOnly!==true||d.snapWriteVerified!==false||d.paymentCreated!==false||d.registrationStarted!==false||d.costsVerified!==false||!Object.hasOwn(messages,d.status))throw Error();lastToken=token;output.textContent=messages[d.status]+'\nTidak ada token Snap, pembayaran, atau registrasi domain yang dibuat.';}catch{output.textContent='Hasil belum terkonfirmasi. Tidak ada aktivasi pembayaran.';}finally{clearTimeout(timer);busy=false;refresh();}});
window.addEventListener('focus',refresh);window.addEventListener('storage',refresh);refresh();
`;
const PAGE=String.raw`<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Uji baca Midtrans Sandbox</title><style>body{font:16px system-ui;background:#f4f8ff;color:#15345b;margin:0;padding:20px}main{max-width:720px;margin:auto;background:white;padding:20px;border:1px solid #d6e5fa;border-radius:12px}button{background:#1463dc;color:white;border:0;border-radius:8px;padding:14px;font:inherit}button:disabled{opacity:.5}pre{white-space:pre-wrap;overflow-wrap:anywhere}a{color:#1463dc}</style></head><body><main><h1>Uji akses baca Midtrans Sandbox</h1><p>Khusus admin preview. Hanya GET status untuk ID uji acak. Tidak membuat pesanan, token Snap, pembayaran, atau registrasi domain. Tidak mengubah flag transaksi.</p><p><a href="/?auth=signin" target="_blank" rel="noopener noreferrer">Login dengan akun Ngeblogging yang sudah ada</a></p><button id="probe" type="button">Uji akses baca sandbox</button><pre id="result" role="status" aria-live="polite">Belum diperiksa.</pre><p><a href="/assets/registrar-diagnostic-stage6">Kembali ke diagnostik domain</a></p></main><script type="module" src="/assets/domain-sandbox-status-probe-stage6.mjs"></script></body></html>`;
const HOST='feature-domain-stages5-10-integration-20261030-ngeblogging.triapriyogibahari7.workers.dev';
const API='/api/admin/commerce/domains/sandbox-status-probe',PAGE_PATH='/assets/domain-sandbox-status-probe-stage6',JS_PATH=PAGE_PATH+'.mjs';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
async function limitedJson(response,wait,limit){const reader=response.body?.getReader();if(!reader)throw Error();try{let size=0;const chunks=[];for(;;){const x=await wait(reader.read());if(x.done)break;size+=x.value.length;if(size>limit)throw Error();chunks.push(x.value);}const bytes=new Uint8Array(size);let pos=0;for(const b of chunks){bytes.set(b,pos);pos+=b.length;}return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}finally{reader.cancel().catch(()=>{});try{reader.releaseLock();}catch{}}}
export async function domainSandboxStatusProbeResponse(request,env,{fetchImpl=globalThis.fetch,probeOptions={}}={}){
 const u=new URL(request.url);if(![API,PAGE_PATH,JS_PATH].includes(u.pathname))return null;
 const headers={'cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer','x-robots-tag':'noindex,nofollow','content-security-policy':"default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"};
 const reply=(status,code,extra={})=>new Response(JSON.stringify({code,...extra}),{status,headers:{...headers,'content-type':'application/json; charset=utf-8',...(status===405?{allow:u.pathname===API?'POST':'GET, HEAD'}:{})}});
 if(u.protocol!=='https:'||u.hostname!==HOST||u.port)return reply(404,'NOT_FOUND');
 if(u.search){const tracking=[...u.searchParams];const allowed=u.pathname===PAGE_PATH&&['GET','HEAD'].includes(request.method)&&u.search.length<=2048&&tracking.length>0&&tracking.length<=10&&tracking.every(([k,v])=>/^utm_[a-z0-9_]{1,40}$/i.test(k)&&v.length<=256);if(!allowed)return reply(400,'QUERY_NOT_ALLOWED');}
 if(u.pathname!==API){if(!['GET','HEAD'].includes(request.method))return reply(405,'METHOD_NOT_ALLOWED');return new Response(request.method==='HEAD'?null:u.pathname===PAGE_PATH?PAGE:PROBE_SCRIPT,{headers:{...headers,'content-type':u.pathname===PAGE_PATH?'text/html; charset=utf-8':'application/javascript; charset=utf-8'}});}
 if(request.method!=='POST')return reply(405,'METHOD_NOT_ALLOWED');
 if(request.headers.get('origin')!==u.origin)return reply(403,'ORIGIN_NOT_ALLOWED');
 if(request.body!==null)return reply(400,'EMPTY_REQUEST_REQUIRED');
 const auth=request.headers.get('authorization')||'';if(!/^Bearer [^\s]{1,8192}$/.test(auth))return reply(401,'AUTH_REQUIRED');
 if(!UUID.test(env?.REGISTRAR_DIAGNOSTIC_ADMIN_USER_ID||'')||!env.SUPABASE_PUBLISHABLE_KEY||env.SUPABASE_URL!=='https://polvmlrhqoiflumibfqs.supabase.co')return reply(503,'CONFIGURATION_REQUIRED');
 if(request.signal.aborted)return reply(503,'AUTH_UNAVAILABLE');
 const c=new AbortController(),abort=()=>c.abort();let stop;
 const stopped=new Promise((_,reject)=>{stop=()=>reject(Error('AUTH_TIMEOUT'));c.signal.addEventListener('abort',stop,{once:true});});const timer=setTimeout(abort,5000),wait=p=>Promise.race([p,stopped]);request.signal.addEventListener('abort',abort,{once:true});
 try{const r=await wait(fetchImpl(new Request(env.SUPABASE_URL+'/auth/v1/user',{method:'GET',redirect:'manual',headers:{authorization:auth,apikey:env.SUPABASE_PUBLISHABLE_KEY},signal:c.signal})));if([401,403].includes(r.status))return reply(401,'INVALID_SESSION');if(r.status!==200)return reply(503,'AUTH_UNAVAILABLE');const user=await limitedJson(r,wait,32768);if(typeof user?.id!=='string'||!UUID.test(user.id)||user.id.toLowerCase()!==env.REGISTRAR_DIAGNOSTIC_ADMIN_USER_ID.toLowerCase())return reply(403,'ADMIN_REQUIRED');}catch{return reply(503,'AUTH_UNAVAILABLE');}finally{clearTimeout(timer);request.signal.removeEventListener('abort',abort);c.signal.removeEventListener('abort',stop);}
 const result=await probeDomainSandboxStatus(env,{...probeOptions,fetchImpl,signal:request.signal});
 return reply(result.status==='status_read_accepted'?200:503,'DOMAIN_SANDBOX_STATUS_PROBE',result);
}
