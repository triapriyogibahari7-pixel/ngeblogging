const host='feature-domain-stages5-10-integration-20261030-ngeblogging.triapriyogibahari7.workers.dev';
const output=document.getElementById('result');
const buttons=[document.getElementById('preflight'),document.getElementById('run')];
const codes=new Set(['NOT_FOUND','METHOD_NOT_ALLOWED','DIAGNOSTIC_DISABLED','ORIGIN_NOT_ALLOWED','EMPTY_REQUEST_REQUIRED','AUTH_REQUIRED','AUTH_UNAVAILABLE','INVALID_SESSION','ADMIN_REQUIRED','REGISTRAR_DIAGNOSTIC']);
const statuses=new Set(['secret_missing','invalid_response','access_denied','rate_limited','provider_error','registrar_search_access_confirmed','timeout','network_error']);
function token(){
 try {
  const value=localStorage.getItem('sb-polvmlrhqoiflumibfqs-auth-token');
  if(!value || value.length>100000)return null;
  const session=JSON.parse(value);
  if(!Number.isFinite(session?.expires_at) || session.expires_at*1000<=Date.now())return null;
  return typeof session.access_token==='string' && /^[^\s]{1,8192}$/.test(session.access_token)?session.access_token:null;
 } catch {return null;}
}
async function run(authenticated){
 if(location.protocol!=='https:' || location.hostname!==host){output.textContent='Gunakan hostname preview resmi tahap 6.';return;}
 const bearer=authenticated?token():null;
 if(authenticated&&!bearer){output.textContent='Sesi belum tersedia atau kedaluwarsa di preview ini. Login lewat tautan di atas, lalu kembali. Jangan salin token ke chat.';return;}
 buttons.forEach(b=>b.disabled=true);
 output.textContent='Memeriksa...';
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),20000);
 try {
  const response=await fetch('/api/admin/registrar/diagnostic',{method:'POST',redirect:'error',cache:'no-store',credentials:'omit',headers:bearer?{Authorization:'Bearer '+bearer}:{},signal:controller.signal});
  const data=await response.json();
  const safe={httpStatus:response.status,code:codes.has(data?.code)?data.code:'UNEXPECTED_RESPONSE',authenticatedAttempt:authenticated};
  if(statuses.has(data?.status))safe.status=data.status;
  if(Number.isInteger(data?.candidateCount))safe.candidateCount=data.candidateCount;
  safe.registrarSearchConfirmed=data?.status==='registrar_search_access_confirmed'&&response.status===200;
  safe.purchaseAllowed=false;
  output.textContent=JSON.stringify(safe,null,2);
 }catch{output.textContent='Respons tidak terbaca atau koneksi timeout. Belum ada hasil validasi token.';}
 finally{clearTimeout(timer);buttons.forEach(b=>b.disabled=false);}
}
buttons[0].addEventListener('click',()=>run(false));
buttons[1].addEventListener('click',()=>run(true));
