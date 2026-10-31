import './registrar-sandbox-a510eb783791.mjs';
const host='feature-domain-stages5-10-integration-20261030-ngeblogging.triapriyogibahari7.workers.dev';
const output=document.getElementById('result');
const buttons=[document.getElementById('preflight'),document.getElementById('run')];
const codes=new Set(['NOT_FOUND','METHOD_NOT_ALLOWED','DIAGNOSTIC_DISABLED','ORIGIN_NOT_ALLOWED','EMPTY_REQUEST_REQUIRED','AUTH_REQUIRED','AUTH_UNAVAILABLE','INVALID_SESSION','ADMIN_REQUIRED','REGISTRAR_DIAGNOSTIC','REGISTRAR_CHECK','INVALID_DOMAIN']);
const statuses=new Set(['secret_missing','invalid_response','access_denied','rate_limited','provider_error','registrar_search_access_confirmed','timeout','network_error','checked','not_registrable','premium_not_supported','redirect_rejected','invalid_clock']);
const reasons=new Set(['extension_not_supported_via_api','extension_not_supported','extension_disallows_registration','domain_premium','domain_unavailable','unknown_restriction']);
const box=document.createElement('section');
const label=document.createElement('label');label.textContent='Domain yang ingin diperiksa (bukan pembelian): ';
const input=document.createElement('input');input.type='text';input.maxLength=253;input.placeholder='nama-domain.com';input.autocomplete='off';input.spellcheck=false;label.append(input);
const check=document.createElement('button');check.type='button';check.textContent='Periksa ketersediaan dan harga';
const note=document.createElement('p');note.textContent='Check khusus admin pada preview. Harga transfer dan pajak belum diketahui. Tidak membeli, mereservasi, atau mengubah DNS.';
box.append(label,check,note);output.before(box);buttons.push(check);
function token(){
 try {
  const value=localStorage.getItem('sb-polvmlrhqoiflumibfqs-auth-token');
  if(!value || value.length>100000)return null;
  const session=JSON.parse(value);
  if(!Number.isFinite(session?.expires_at) || session.expires_at*1000<=Date.now())return null;
  return typeof session.access_token==='string' && /^[^\s]{1,8192}$/.test(session.access_token)?session.access_token:null;
 } catch {return null;}
}
async function run(authenticated,isCheck=false){
 if(location.protocol!=='https:' || location.hostname!==host){output.textContent='Gunakan hostname preview resmi tahap 6.';return;}
 const bearer=authenticated?token():null;
 if(authenticated&&!bearer){output.textContent='Sesi belum tersedia atau kedaluwarsa di preview ini. Login lewat tautan di atas, lalu kembali. Jangan salin token ke chat.';return;}
 let domain='';
 if(isCheck){
  const raw=input.value.trim().replace(/\.$/,'');
  try{if(!raw||/[\s/\\:@?#%]/u.test(raw))throw new Error();domain=new URL('https://'+raw).hostname.toLowerCase();if(domain.length>253||!domain.includes('.'))throw new Error();}catch{output.textContent='Masukkan nama domain lengkap, tanpa https:// atau path.';return;}
 }
 buttons.forEach(b=>b.disabled=true);input.disabled=true;
 output.textContent='Memeriksa...';
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),20000);
 try {
  const path=isCheck?'/api/admin/registrar/check/'+encodeURIComponent(domain):'/api/admin/registrar/diagnostic';
  const response=await fetch(path,{method:'POST',redirect:'error',cache:'no-store',credentials:'omit',headers:bearer?{Authorization:'Bearer '+bearer}:{},signal:controller.signal});
  const data=await response.json();
  const safe={httpStatus:response.status,code:codes.has(data?.code)?data.code:'UNEXPECTED_RESPONSE',authenticatedAttempt:authenticated};
  if(statuses.has(data?.status))safe.status=data.status;
  if(!isCheck){
   if(Number.isInteger(data?.candidateCount))safe.candidateCount=data.candidateCount;
   safe.registrarSearchConfirmed=data?.status==='registrar_search_access_confirmed'&&response.status===200;
  }else{
   safe.domain=domain;
   if(typeof data?.registrable==='boolean')safe.registrable=data.registrable;
   if(reasons.has(data?.reason))safe.reason=data.reason;
   if(['standard','premium'].includes(data?.tier))safe.tier=data.tier;
   if(['unavailable','not_confirmed'].includes(data?.availability))safe.availability=data.availability;
   if(typeof data?.checkedAt==='string'&&data.checkedAt.length<40&&Number.isFinite(Date.parse(data.checkedAt)))safe.checkedAt=data.checkedAt;
   if(['checked','premium_not_supported'].includes(data?.status)&&data?.domain===domain){
    const p=data.prices;
    const valid=v=>typeof v==='string'&&/^(?:0|[1-9]\d{0,11})(?:\.\d{1,6})?$/.test(v);
    if(typeof p?.currency==='string'&&/^[A-Z]{3}$/.test(p.currency)&&valid(p.registration?.amount)&&valid(p.renewal?.amount))safe.prices={currency:p.currency,registration:{amount:p.registration.amount,termYears:1},renewal:{amount:p.renewal.amount,termYears:1},transfer:null,taxIncluded:null};
   }
   safe.mustRecheckBeforePurchase=true;
  }
  safe.purchaseAllowed=false;
  output.textContent=JSON.stringify(safe,null,2);
 }catch{output.textContent='Respons tidak terbaca atau koneksi timeout. Belum ada hasil pemeriksaan yang terkonfirmasi.';}
 finally{clearTimeout(timer);buttons.forEach(b=>b.disabled=false);input.disabled=false;}
}
buttons[0].addEventListener('click',()=>run(false));
buttons[1].addEventListener('click',()=>run(true));
check.addEventListener('click',()=>run(true,true));
