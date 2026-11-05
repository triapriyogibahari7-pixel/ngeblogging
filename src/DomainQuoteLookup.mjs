import React,{useEffect,useId,useRef,useState} from 'react';
import {supabase} from './lib/supabase.js';
import {getVerifiedSession} from './lib/auth-session-v76.js';
import {normalizePurchaseDomain,fetchPurchaseQuote} from './domain-purchase-model.mjs';
const h=React.createElement;
const money=value=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(value);
export default function DomainQuoteLookup({userId,siteId,initialDomain=''}){
 const [input,setInput]=useState(initialDomain),[busy,setBusy]=useState(false),[quote,setQuote]=useState(null),[notice,setNotice]=useState(''),[clock,setClock]=useState(Date.now());
 const active=useRef(null),scope=JSON.stringify([userId,siteId]),scopeRef=useRef(scope),fieldId=useId();scopeRef.current=scope;
 function stop(){const task=active.current;active.current=null;if(task){clearTimeout(task.timer);task.controller.abort();}setBusy(false);setQuote(null);}
 useEffect(()=>{stop();setInput(initialDomain);setNotice('');return()=>{const task=active.current;active.current=null;if(task){clearTimeout(task.timer);task.controller.abort();}};},[scope,initialDomain]);
 useEffect(()=>{const {data}=supabase?.auth?.onAuthStateChange((_event,next)=>{if(next?.user?.id!==userId){stop();setNotice('Sesi akun berubah. Masuk dengan akun pemilik situs sebelum memeriksa ulang.');}})||{};return()=>data?.subscription?.unsubscribe();},[scope]);
 useEffect(()=>{if(!quote)return;const timer=setInterval(()=>setClock(Date.now()),1000);return()=>clearInterval(timer);},[quote]);
 async function submit(event){
  event.preventDefault();if(active.current)return;let domain;
  try{domain=normalizePurchaseDomain(input);}catch{setNotice('Masukkan nama domain lengkap, tanpa protokol atau path.');return;}
  if(!userId||!siteId){setNotice('Pilih situs yang Anda miliki dan masuk kembali sebelum memeriksa.');return;}
  const controller=new AbortController(),task={controller,timer:null};active.current=task;
  const current=()=>active.current===task&&!controller.signal.aborted&&scopeRef.current===scope;
  setBusy(true);setQuote(null);setNotice('');
  task.timer=setTimeout(()=>{if(current()){stop();setNotice('Pemeriksaan melewati batas waktu. Coba lagi; ketersediaan dan harga belum terkonfirmasi.');}},30000);
  try{
   const auth=await getVerifiedSession({force:true});if(!current())return;
   if(auth?.verification!=='verified'||auth.user?.id!==userId||!auth.session?.access_token)throw Object.assign(Error(),{code:'INVALID_SESSION'});
   const found=await fetchPurchaseQuote(domain,auth.session.access_token,{signal:controller.signal});if(!current())return;
   const next=await getVerifiedSession({force:true});if(!current())return;
   if(next?.verification!=='verified'||next.user?.id!==userId)throw Object.assign(Error(),{code:'SESSION_CHANGED'});
   if(found?.domain!==domain||!Number.isSafeInteger(found.amountIdr)||found.amountIdr<1||!Number.isFinite(Date.parse(found.expiresAt))||Date.parse(found.expiresAt)<=Date.now())throw Object.assign(Error(),{code:'QUOTE_UNVERIFIED'});
   setClock(Date.now());setQuote(found);setNotice('Domain dan harga telah diperiksa. Ini bukan reservasi, pesanan, atau pembayaran.');
  }catch(error){if(current()){const code=typeof error?.code==='string'&&/^[A-Z][A-Z0-9_]{0,79}$/.test(error.code)?error.code:'LOOKUP_UNCONFIRMED';const messages={DOMAIN_UNAVAILABLE:'Domain tidak tersedia.',INVALID_SESSION:'Sesi pemilik belum terverifikasi. Masuk kembali.',SESSION_CHANGED:'Akun berubah. Hasil tidak digunakan.',UNSUPPORTED_EXTENSION:'Ekstensi belum didukung.',DOMAIN_PRICING_INPUTS_UNAVAILABLE:'Dasar harga backend belum siap.',QUOTE_UNVERIFIED:'Harga belum dapat diverifikasi.'};setNotice((messages[code]||'Pemeriksaan belum berhasil. Ketersediaan dan harga belum terkonfirmasi.')+' Kode: '+code+'. Tidak ada pesanan atau pembayaran dibuat.');}}
  finally{clearTimeout(task.timer);if(active.current===task){active.current=null;setBusy(false);}}
 }
 const fresh=quote&&Date.parse(quote.expiresAt)>clock;
 return h('section',{'aria-label':'Pemeriksaan domain tanpa checkout'},
  h('form',{className:'dcs-form',onSubmit:event=>void submit(event)},h('label',{htmlFor:fieldId},'Nama domain lengkap'),h('input',{id:fieldId,value:input,maxLength:253,required:true,autoComplete:'off',spellCheck:false,placeholder:'nama-domain.com',onChange:event=>{stop();setInput(event.target.value);setNotice('');}}),h('button',{type:'submit',className:'sv124-primary',disabled:busy},busy?'Memeriksa domain dan harga…':'Periksa ketersediaan dan harga'),busy?h('button',{type:'button',className:'sv124-secondary',onClick:()=>{stop();setNotice('Pemeriksaan dibatalkan. Catatan pesanan tetap disimpan.');}},'Batalkan pemeriksaan'):null),
  h('p',{role:'status','aria-live':'polite','aria-busy':busy},notice),
  fresh?h('div',null,h('h3',null,quote.domain),h('p',null,'Tersedia saat diperiksa · total ',money(quote.amountIdr),' · ',quote.years,' tahun'),h('p',null,'Harga berlaku sampai ',new Date(quote.expiresAt).toLocaleString('id-ID'))):quote?h('p',{role:'status'},'Harga kedaluwarsa. Periksa kembali sebelum checkout.'):null,
  h('p',null,'Pemeriksaan tetap dapat digunakan ketika pesanan lama tertahan. Checkout dan pembayaran tetap memakai pengaman tersendiri; catatan lama tidak dihapus.'));
}
