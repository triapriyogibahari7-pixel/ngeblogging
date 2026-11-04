const ORDER=/^DOM-[a-f0-9]{40}$/;
const fail=()=>{throw Object.assign(Error('DOMAIN_PAYMENT_TARGET_UNVERIFIED'),{code:'DOMAIN_PAYMENT_TARGET_UNVERIFIED'});};
function officialUrl(value){
 if(typeof value!=='string'||value.length>512)fail();
 let url;try{url=new URL(value);}catch{fail();}
 const match=/^\/snap\/(?:v2\/vtweb|v4\/redirection)\/([A-Za-z0-9_-]{10,200})$/.exec(url.pathname);
 if(url.origin!=='https://app.midtrans.com'||url.username||url.password||url.port||url.search||url.hash||!match)fail();
 return {url:url.href,token:match[1]};
}
// The caller must first verify the authenticated server checkout response and expected order/amount.
export function verifyDomainMidtransTarget(value,{orderId,amountIdr,now=Date.now()}={}){
 if(typeof orderId!=='string'||!ORDER.test(orderId)||!Number.isSafeInteger(amountIdr)||amountIdr<=0||amountIdr>1000000000000||!Number.isSafeInteger(now))fail();
 if(!value||value.orderId!==orderId||value.amountIdr!==amountIdr||value.currency!=='IDR'||value.environment!=='production'||typeof value.expiresAt!=='string'||!Number.isFinite(Date.parse(value.expiresAt))||Date.parse(value.expiresAt)<=now)fail();
 const target=officialUrl(value.url);
 if(value.snapToken!==undefined&&value.snapToken!==null&&value.snapToken!==target.token)fail();
 const key=typeof value.clientKey==='string'&&value.clientKey.length<=220&&/^Mid-client-[A-Za-z0-9_-]+$/.test(value.clientKey)?value.clientKey:null;
 return Object.freeze({orderId,amountIdr,currency:'IDR',environment:'production',url:target.url,snapToken:target.token,clientKey:key,expiresAt:value.expiresAt});
}
// Call synchronously inside a trusted click handler. Browser policies may still deny opening.
export function reserveDomainPaymentTab(win=globalThis.window){
 let child=null,navigated=false;
 try{
  child=win.open('about:blank','_blank');
  if(child){
   child.opener=null;
   const doc=child.document;
   const meta=doc.createElement('meta');meta.name='referrer';meta.content='no-referrer';doc.head.appendChild(meta);
   doc.title='Menyiapkan pembayaran Midtrans';
   if(doc.body)doc.body.textContent='Menyiapkan pembayaran Midtrans untuk pesanan yang sama. Jangan membuat pembayaran baru.';
   win.focus?.();
  }
 }catch{try{child?.close();}catch{}child=null;}
 return {
  get available(){try{return Boolean(child&&!child.closed&&!navigated);}catch{return false;}},
  navigate(value,expected){
   const target=verifyDomainMidtransTarget(value,expected);
   try{if(!child||child.closed||navigated)return false;child.location.replace(target.url);navigated=true;child.focus?.();return true;}catch{return false;}
  },
  closeUnused(){if(navigated)return;try{if(child&&!child.closed)child.close();}catch{}child=null;}
 };
}
