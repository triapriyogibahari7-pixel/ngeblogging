import React,{useEffect,useRef,useState} from 'react';
import {fetchRegistrantPolicy,normalizeRegistrant} from './domain-purchase-model.mjs';
import {validateRegistrantInput} from './domain-registrant-input.mjs';
import {loadOrderStatus} from './domain-order-status-model.mjs';
import {orderActionAvailability} from './domain-order-actions.mjs';
const h=React.createElement,TERMS='cloudflare-domain-registration-2026-08-20';
const fail=code=>{throw Object.assign(Error(code),{code});};
export async function saveExistingOrderRegistrant(expected,token,{registrant,acceptedTerms,termsVersion,signal,fetchImpl=globalThis.fetch,loadStatus=loadOrderStatus,now=Date.now}={}){
 if(acceptedTerms!==true||termsVersion!==TERMS)fail('REGISTRANT_CONSENT_REQUIRED');
 const contact=normalizeRegistrant(registrant);
 if(!expected||!/^DOM-[a-f0-9]{40}$/.test(expected.orderId||''))fail('ORDER_ACTION_UNCONFIRMED');
 if(typeof token!=='string'||!/^\S{1,8192}$/.test(token))fail('INVALID_SESSION');
 if(signal?.aborted)fail('REQUEST_ABORTED');
 const c=new AbortController(),abort=()=>c.abort(),timer=setTimeout(abort,25000);signal?.addEventListener('abort',abort,{once:true});let reader,stop;
 const ended=new Promise((_,reject)=>{stop=()=>reject(Object.assign(Error('REGISTRANT_SAVE_UNVERIFIED'),{code:'REGISTRANT_SAVE_UNVERIFIED'}));c.signal.addEventListener('abort',stop,{once:true});});
 const wait=p=>Promise.race([p,ended]);
 try{
  const fresh=await wait(loadStatus(expected.orderId,token,{signal:c.signal,fetchImpl}));
  if(c.signal.aborted)fail('REQUEST_ABORTED');
  if(fresh.orderId!==expected.orderId||fresh.domain!==expected.domain||fresh.currency!=='IDR'||fresh.amountIdr!==expected.amountIdr)fail('ORDER_ACTION_UNCONFIRMED');
  const allowed=orderActionAvailability(fresh,now());if(!allowed.pay)fail(allowed.cancel?'CHECKOUT_WINDOW_EXPIRED':'ORDER_ALREADY_PROCESSED');
  const response=await wait(fetchImpl('/api/commerce/domains/registrant',{method:'POST',redirect:'error',cache:'no-store',credentials:'same-origin',headers:{authorization:'Bearer '+token,accept:'application/json','content-type':'application/json'},body:JSON.stringify({orderId:expected.orderId,registrant:contact,acceptedTerms:true,termsVersion}),signal:c.signal}));
  if(!/^application\/json(?:\s*;.*)?$/i.test(response.headers.get('content-type')||''))fail('REGISTRANT_SAVE_UNVERIFIED');
  reader=response.body?.getReader();if(!reader)fail('REGISTRANT_SAVE_UNVERIFIED');let size=0;const chunks=[];
  for(;;){const part=await wait(reader.read());if(part.done)break;size+=part.value.length;if(size>32768)fail('REGISTRANT_SAVE_UNVERIFIED');chunks.push(part.value);}
  const bytes=new Uint8Array(size);let offset=0;for(const part of chunks){bytes.set(part,offset);offset+=part.length;}const result=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  if(c.signal.aborted)fail('REQUEST_ABORTED');
  if(!response.ok)fail(typeof result?.code==='string'&&/^[A-Z][A-Z0-9_]{0,79}$/.test(result.code)?result.code:'REGISTRANT_SAVE_UNVERIFIED');
  if(result.code!=='DOMAIN_REGISTRANT_DETAILS_SAVED'||result.environment!=='production'||result.orderId!==expected.orderId||result.detailsSaved!==true||result.registrationStarted!==false||result.termsVersion!==termsVersion)fail('REGISTRANT_SAVE_UNVERIFIED');
  return {orderId:expected.orderId,detailsSaved:true};
 }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);c.signal.removeEventListener('abort',stop);reader?.cancel().catch(()=>{});}
}
const fields=[['name','Nama pemilik domain','text',300],['email','Email pemilik domain','email',254],['phone','Telepon internasional, contoh +6281234567890','tel',32],['organization','Organisasi (opsional)','text',300],['street','Alamat jalan','text',500],['city','Kota','text',500],['state','Provinsi / wilayah','text',500],['postalCode','Kode pos','text',100],['countryCode','Kode negara dua huruf, misalnya ID','text',2]];
export default function DomainExistingRegistrantForm({order,owner,getSession,enabled,onClose,onSaved}){
 const [policy,setPolicy]=useState(null),[busy,setBusy]=useState(true),[notice,setNotice]=useState(''),[accepted,setAccepted]=useState(false),[contact,setContact]=useState(()=>Object.fromEntries(fields.map(([key])=>[key,'']))),[fieldErrors,setFieldErrors]=useState({});const operation=useRef(null),alive=useRef(false);
 useEffect(()=>{alive.current=true;let live=true;const c=new AbortController();operation.current=c;
  (async()=>{try{const auth=await getSession(owner);if(!live||c.signal.aborted)return;const next=await fetchRegistrantPolicy(auth.session.access_token,{signal:c.signal});if(!live||c.signal.aborted)return;await getSession(auth.user.id);if(!live||c.signal.aborted)return;setPolicy(next);setContact(previous=>({...previous,name:previous.name||next.prefill.name,email:previous.email||next.prefill.email,phone:previous.phone||next.prefill.phone||''}));}catch{if(live&&!c.signal.aborted)setNotice('Ketentuan registrasi belum dapat diverifikasi. Tutup formulir dan periksa pesanan yang sama; jangan membuat order baru.');}finally{if(operation.current===c){operation.current=null;if(live)setBusy(false);}}})();
  return()=>{live=false;alive.current=false;operation.current?.abort();operation.current=null;};
 },[order.orderId,owner]);
 async function submit(event){event.preventDefault();if(operation.current||busy||!enabled||!policy||!accepted)return;let registrant;try{registrant=validateRegistrantInput(contact);setFieldErrors({});}catch(error){setFieldErrors(error.fieldErrors||{});setNotice('Periksa dan lengkapi data pemilik domain. Belum ada pembayaran dibuat.');return;}
  const c=new AbortController();operation.current=c;setBusy(true);setNotice('');const current=()=>alive.current&&operation.current===c&&!c.signal.aborted;
  try{const auth=await getSession(owner);if(!current())return;await saveExistingOrderRegistrant(order,auth.session.access_token,{registrant,acceptedTerms:true,termsVersion:policy.termsVersion,signal:c.signal});if(!current())return;await getSession(auth.user.id);if(current())onSaved?.();}catch(error){if(current()){const code=typeof error?.code==='string'&&/^[A-Z][A-Z0-9_]{0,79}$/.test(error.code)?error.code:'REGISTRANT_SAVE_UNVERIFIED';setNotice('Penyimpanan data registran belum terkonfirmasi. Periksa pesanan yang sama; pembayaran tidak diminta oleh formulir ini. Kode: '+code+'.');setAccepted(false);if(code==='REGISTRATION_TERMS_CHANGED')setPolicy(null);}}finally{if(operation.current===c){operation.current=null;if(alive.current)setBusy(false);}}
 }
 return h('section',{'aria-label':'Lengkapi registran pesanan yang sama','aria-busy':busy},h('h3',null,'Lengkapi data pemilik domain'),h('p',null,order.domain,' — ',order.orderId),h('p',null,'Data disimpan pada pesanan ini, tanpa membuat order atau pembayaran pengganti. Harga dan batas waktu pesanan tidak diubah.'),h('form',{onSubmit:submit,noValidate:true},h('fieldset',{disabled:busy||!enabled||!policy},h('legend',null,'Data registran'),...fields.map(([key,label,type,max])=>h('label',{key},label,h('input',{name:key,type,maxLength:max,value:contact[key],required:key!=='organization',autoComplete:'off','aria-invalid':Boolean(fieldErrors[key]),onChange:event=>{const value=event.target.value;setContact(previous=>({...previous,[key]:value}));setAccepted(false);setFieldErrors({});}}),fieldErrors[key]?h('span',null,fieldErrors[key]):null)),policy?h('label',null,h('input',{type:'checkbox',required:true,checked:accepted,onChange:event=>setAccepted(event.target.checked)}),'Saya mengonfirmasi kebenaran data pemilik domain dan menyetujui ',h('a',{href:policy.termsUrl,target:'_blank',rel:'noopener noreferrer'},'Perjanjian Pendaftaran Domain Cloudflare'),'.'):null),h('button',{type:'submit',className:'sv124-primary',disabled:busy||!enabled||!policy||!accepted},busy?'Memeriksa atau menyimpan data…':'Simpan registran untuk pesanan ini')),!enabled?h('p',{role:'alert'},'Pesanan tidak lagi memenuhi syarat pembayaran. Formulir tidak memperpanjang batas waktu; periksa status pesanan yang sama.'):null,h('p',{role:'status','aria-live':'polite'},notice),h('button',{type:'button',className:'sv124-secondary',disabled:busy,onClick:onClose},'Tutup formulir tanpa membatalkan pesanan'));
}
