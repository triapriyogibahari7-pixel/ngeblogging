import React from 'react';
import './domain-premium-ui.css';
import './domain-order-summary-flow.css';
import {standardOrderPaymentDeadline} from '../shared/domain-standard-checkout-window.mjs';
const ORDER=/^DOM-[a-f0-9]{40}$/;
const domain=x=>typeof x==='string'&&x.length<=253&&x.includes('.')&&x.split('.').every(p=>/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(p));
export function domainOrderSummary(o){
 if(!o||!ORDER.test(o.orderId)||!domain(o.domain)||o.currency!=='IDR'||!Number.isSafeInteger(o.amountIdr)||o.amountIdr<1||o.amountIdr>1000000000000)return null;
 const paid=o.paymentState==='paid'&&o.paymentConfirmed===true,registered=paid&&o.registrationState==='registered'&&o.registrationConfirmed===true&&o.resolution==='none';
 const labels={pending:'Menunggu pembayaran',failed:'Pembayaran gagal',expired:'Pembayaran kedaluwarsa',cancelled:'Dibatalkan',review_required:'Perlu peninjauan',refund_pending:'Pengembalian diproses',refunded:'Dana dikembalikan'};
 const payment=paid?'Pembayaran terverifikasi':labels[o.paymentState]||'Perlu verifikasi';
 const r=o.registrar,known=registered&&r?.status==='observed'&&r.source==='registrar_api'&&r.providerActionTaken===false&&typeof r.expiresAt==='string'&&Number.isFinite(Date.parse(r.expiresAt));
 return {href:'/domains/orders/'+o.orderId,domain:o.domain,payment,registration:registered?'Domain terdaftar':o.registrationState==='processing'||o.registrationState==='queued'?'Pendaftaran diproses':'Pendaftaran belum terverifikasi',tone:paid?'verified':o.paymentState==='pending'?'pending':'neutral',amount:new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(o.amountIdr),expiry:known?new Intl.DateTimeFormat('id-ID',{day:'numeric',month:'short',year:'numeric'}).format(new Date(r.expiresAt)):'Belum tersedia',connection:'Belum diverifikasi'};
}

const h=React.createElement;
const date=value=>value&&Number.isFinite(Date.parse(value))?new Date(value).toLocaleString('id-ID'):'Belum tersedia';
const columns=['No.','Domain','Pembayaran','Pendaftaran','Total pesanan','Dibuat','Batas pembayaran','Tanggal pembayaran','Registrasi penyedia','Kedaluwarsa domain','Perpanjangan otomatis','DNS / SSL','Situs tujuan','Diperiksa di penyedia','Nameserver','Keterangan','Aksi'];
export default function DomainOrderSummaryCard({order,orders,onRefresh,renderActions}){
 if(orders!==undefined&&!Array.isArray(orders))return null;
 const list=orders===undefined?(order?[order]:[]):orders;
 if(list.length>50)return h('p',{role:'alert'},'Daftar pesanan belum dapat ditampilkan.');
 const seen=new Set(),rows=[];
 for(const o of list){const v=domainOrderSummary(o);if(!v||seen.has(o.orderId))return null;seen.add(o.orderId);rows.push({o,v});}
 if(!rows.length)return h('p',{role:'status'},'Belum ada pesanan yang ditampilkan.');
 return h('article',{className:'nd-order-summary nd-order-sheet','aria-label':'Tabel pesanan domain','data-domain-order-summary':'v1'},
  h('p',{className:'nd-sheet-hint'},'Geser tabel ke kanan untuk melihat seluruh kolom.'),
  h('div',{className:'nd-sheet-scroll',role:'region','aria-label':'Tabel pesanan domain, dapat digeser horizontal',tabIndex:0},
   h('table',{className:'nd-sheet-table'},h('caption',null,'Pesanan domain'),
    h('thead',null,h('tr',null,...columns.map(label=>h('th',{key:label,scope:'col'},label)))),
    h('tbody',null,...rows.map(({o,v},index)=>{
     const r=o.registrar,known=o.paymentState==='paid'&&o.paymentConfirmed===true&&o.registrationState==='registered'&&o.registrationConfirmed===true&&o.resolution==='none'&&r?.status==='observed'&&r.source==='registrar_api'&&r.providerActionTaken===false;
     let deadline=null;try{deadline=standardOrderPaymentDeadline(o.createdAt);}catch{}
     const deadlineText=deadline===null?'Belum tersedia':date(new Date(deadline).toISOString())+(o.paymentState==='pending'&&Date.now()>=deadline?' — waktu berakhir':'');
     const ns=known&&Array.isArray(r.nameservers)&&r.nameservers.every(n=>typeof n==='string'&&n.length<=253)?r.nameservers:[];
     const values=[v.domain,v.payment,v.registration,v.amount,date(o.createdAt),deadlineText,date(o.paymentConfirmed===true?o.paidAt:null),date(known?r.registeredAt:null),v.expiry,known&&typeof r.autoRenew==='boolean'?(r.autoRenew?'Aktif di penyedia':'Tidak aktif di penyedia'):'Belum diketahui',v.connection,'Belum dimuat oleh panel ini',date(known?r.checkedAt:null),ns.length?ns.join(', '):'Belum tersedia',typeof o.message==='string'?o.message:'Belum tersedia'];
     return h('tr',{key:o.orderId,'data-order-id':o.orderId},h('th',{scope:'row'},String(index+1)),...values.map((value,i)=>h('td',{key:columns[i+1]},value)),
      h('td',{className:'nd-sheet-actions'},h('div',{className:'nd-sheet-links'},h('a',{className:'nd-primary',href:v.href,'aria-label':'Lihat detail pesanan '+o.domain},'Lihat detail pesanan'),typeof onRefresh==='function'?h('button',{type:'button',className:'nd-secondary',onClick:()=>onRefresh(o.orderId)},'Perbarui status'):null),typeof renderActions==='function'?renderActions(o):null));
    }))))
 );
}
