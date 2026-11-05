import React,{useEffect,useRef,useState} from 'react';
import {getVerifiedSession} from './lib/auth-session-v76.js';
import {synchronizeDomainGateway} from './domain-gateway-sync-client.mjs';
const h=React.createElement;
const messages={GATEWAY_PAYMENT_PENDING:'Midtrans masih menyatakan pembayaran tertunda. Catatan belum boleh dilepas untuk membuat tagihan pengganti.',GATEWAY_STATUS_UNCONFIRMED:'Status Snap belum dapat dipastikan. Catatan tetap disimpan; HTTP 404 bukan bukti checkout tidak ada.',GATEWAY_PAYMENT_REVIEW_REQUIRED:'Pembayaran memerlukan pemeriksaan. Jalur ini tidak membatalkan pembayaran atau melakukan refund.',ORDER_ALREADY_PROCESSED:'Status pesanan sudah berubah. Perbarui daftar dan periksa pesanan yang sama.',SESSION_CHANGED:'Akun atau sesi berubah. Hasil sinkronisasi tidak ditampilkan.',DOMAIN_RECONCILIATION_DISABLED:'Sinkronisasi belum diaktifkan pada server yang melayani halaman ini.',GATEWAY_CONFIGURATION_UNAVAILABLE:'Konfigurasi backend untuk memeriksa Midtrans belum tersedia.'};
export default function DomainGatewaySync({order,owner,onRefresh}){
 const [busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const active=useRef(null),live=useRef(true);
 useEffect(()=>{live.current=true;return()=>{live.current=false;active.current?.abort();};},[]);
 async function run(){
  if(active.current||busy||order.paymentState!=='pending')return;
  const controller=new AbortController();active.current=controller;setBusy(true);setNotice('');
  try{await synchronizeDomainGateway(order,{owner,getSession:()=>getVerifiedSession({force:true}),signal:controller.signal});if(!live.current||controller.signal.aborted)return;setNotice('Status akhir Midtrans sudah tersinkron. Gunakan tombol arsip setelah status baru tampil; riwayat pesanan server tetap disimpan.');onRefresh?.();}
  catch(error){if(live.current&&!controller.signal.aborted){const code=typeof error?.code==='string'&&/^[A-Z][A-Z0-9_]{0,79}$/.test(error.code)?error.code:'RECONCILIATION_UNCONFIRMED';setNotice((messages[code]||'Hasil sinkronisasi belum terverifikasi. Periksa pesanan yang sama; jangan membuat pembayaran pengganti.')+' Kode: '+code+'.');}}
  finally{if(active.current===controller){active.current=null;if(live.current)setBusy(false);}}
 }
 return h('section',{'aria-label':'Sinkronisasi status Midtrans','aria-busy':busy},h('button',{type:'button',className:'sv124-secondary',disabled:busy||!owner||order.paymentState!=='pending',onClick:()=>void run()},busy?'Memeriksa Midtrans…':'Sinkronkan status Midtrans'),h('p',null,'Memeriksa tagihan pesanan yang sama, bukan pembatalan gateway atau pembayaran baru.'),h('p',{role:'status','aria-live':'polite'},notice));
}
