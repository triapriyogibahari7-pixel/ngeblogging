const HOST='feature-domain-stages5-10-integration-20261030-ngeblogging.triapriyogibahari7.workers.dev';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export function createCheckoutController({getSession,getAttempt,fetchImpl=globalThis.fetch,now=()=>Date.now(),onChange=()=>{}}){
 let busy=false,result=null,owner=null,sessionToken=null;
 const view=()=>({busy,checkout:result?{...result}:null});
 const clear=()=>{result=null;owner=null;sessionToken=null;onChange(view());};
 const same=s=>{const x=getSession();return x?.userId===s.userId&&x.accessToken===s.accessToken;};
 async function send(path,body,s,signal){const r=await fetchImpl(path,{method:'POST',redirect:'error',cache:'no-store',credentials:'omit',headers:{authorization:'Bearer '+s.accessToken,'content-type':'application/json'},body:JSON.stringify(body),signal});return {status:r.status,data:await r.json()};}
 async function prepare(){if(busy)return {code:'BUSY'};clear();const s=getSession();if(!s)return {code:'AUTH_REQUIRED'};const a=getAttempt(s.userId);if(a?.userId!==s.userId||!UUID.test(a?.quoteId||'')||!UUID.test(a?.idempotencyKey||''))return {code:'ORDER_REQUIRED'};
  busy=true;onChange(view());const c=new AbortController(),timer=setTimeout(()=>c.abort(),28000);
  try{
   const o=await send('/api/commerce/domains/order',{quoteId:a.quoteId,idempotencyKey:a.idempotencyKey},s,c.signal);if(!same(s))return {code:'SESSION_CHANGED'};
   const id=o.data?.order?.orderId;if(o.status!==200||o.data?.code!=='DOMAIN_ORDER_PREVIEW'||o.data.order.quoteId!==a.quoteId||o.data.order.paymentState!=='pending'||!/^DOM-[a-f0-9]{40}$/.test(id||''))return {code:'ORDER_UNCONFIRMED'};
   const x=await send('/api/commerce/domains/checkout',{orderId:id},s,c.signal);if(!same(s))return {code:'SESSION_CHANGED'};
   if(![200,201].includes(x.status)||x.data?.code!=='DOMAIN_CHECKOUT_SANDBOX'||x.data.environment!=='sandbox'||x.data.registrationStarted!==false||x.data.purchaseAllowed!==false)return {code:'CHECKOUT_UNAVAILABLE'};
   const v=x.data.checkout;if(v?.orderId!==id||v.currency!=='IDR'||v.amountIdr!==o.data.order.amountIdr||!Number.isFinite(Date.parse(v.expiresAt))||Date.parse(v.expiresAt)<=now()||typeof v.url!=='string'||!/^https:\/\/app\.sandbox\.midtrans\.com\/snap\/(?:v2\/vtweb|v4\/redirection)\/[A-Za-z0-9_-]{10,200}$/.test(v.url))return {code:'CHECKOUT_UNVERIFIED'};
   result={orderId:id,currency:'IDR',amountIdr:v.amountIdr,expiresAt:v.expiresAt,url:v.url};owner=s.userId;sessionToken=s.accessToken;return {code:'READY'};
  }catch{return {code:'RESULT_UNCLEAR'};}finally{clearTimeout(timer);busy=false;onChange(view());}
 }
 function refresh(){const s=getSession();if(s?.userId!==owner||s?.accessToken!==sessionToken||result&&Date.parse(result.expiresAt)<=now())clear();}
 function checkoutUrl(){refresh();return result?.url||null;}
 return {prepare,refresh,checkoutUrl,view};
}
function mount(){if(location.protocol!=='https:'||location.hostname!==HOST)return;const output=document.getElementById('result');if(!output)return;
 const section=document.createElement('section'),title=document.createElement('h2'),note=document.createElement('p'),prepare=document.createElement('button'),open=document.createElement('button'),status=document.createElement('p');
 title.textContent='Checkout domain sandbox';note.textContent='Khusus admin preview. Buat/periksa pesanan di panel sebelumnya terlebih dahulu. Tombol ini memakai kunci pesanan yang sama, tanpa pembayaran nyata, pendaftaran domain, atau perubahan DNS.';prepare.type=open.type='button';prepare.textContent='Siapkan / gunakan ulang checkout sandbox';open.textContent='Buka simulasi pembayaran sandbox';open.disabled=true;status.setAttribute('aria-live','polite');section.append(title,note,prepare,open,status);output.before(section);
 const getSession=()=>{try{const s=JSON.parse(localStorage.getItem('sb-polvmlrhqoiflumibfqs-auth-token')||'null');if(!UUID.test(s?.user?.id||'')||!Number.isFinite(s.expires_at)||s.expires_at*1000<=Date.now()||typeof s.access_token!=='string'||!/^\S{1,8192}$/.test(s.access_token))return null;return {userId:s.user.id.toLowerCase(),accessToken:s.access_token};}catch{return null;}};
 const c=createCheckoutController({getSession,getAttempt:id=>{try{return JSON.parse(sessionStorage.getItem('ngeblogging-stage6-sandbox-attempt:'+id)||'null');}catch{return null;}},onChange:v=>{prepare.disabled=v.busy;open.disabled=!v.checkout;if(v.checkout)status.textContent='Sandbox siap: '+v.checkout.orderId+' · IDR '+v.checkout.amountIdr.toLocaleString('id-ID')+' · Berlaku sampai '+v.checkout.expiresAt+'. Belum ada konfirmasi pembayaran.';else status.textContent=v.busy?'Memverifikasi pesanan dan menyiapkan checkout sandbox...':'Belum ada checkout sandbox terverifikasi.';}});
 prepare.addEventListener('click',async()=>{if(!window.confirm('Siapkan atau gunakan ulang checkout Snap sandbox untuk pesanan tersimpan? Tidak memakai uang nyata atau membeli domain. Hasil ambigu ditahan; jangan membuat kunci baru.'))return;const x=await c.prepare();if(x.code!=='READY')status.textContent=({AUTH_REQUIRED:'Login dengan akun yang sudah ada.',ORDER_REQUIRED:'Buat/periksa pesanan sandbox di panel sebelumnya.',ORDER_UNCONFIRMED:'Pesanan belum terkonfirmasi. Periksa kembali dengan kunci yang sama.',SESSION_CHANGED:'Sesi berubah. Hasil sebelumnya disembunyikan.'})[x.code]||'Checkout belum terkonfirmasi atau backend belum diaktifkan. Jangan buat pesanan/kunci baru untuk melewati hasil ini.';});
 open.addEventListener('click',()=>{const url=c.checkoutUrl();if(url)location.assign(url);});window.addEventListener('focus',()=>c.refresh());window.addEventListener('storage',()=>c.refresh());
}
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();}
