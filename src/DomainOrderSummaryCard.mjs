import React from 'react';
import './domain-premium-ui.css';
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
export default function DomainOrderSummaryCard({order,onRefresh}){
 const v=domainOrderSummary(order);if(!v)return null;
 return h('article',{className:'nd-order-summary','aria-label':'Ringkasan pesanan domain','data-domain-order-summary':'v1'},
  h('header',null,h('p',{className:'nd-eyebrow'},'DOMAIN & PUBLIKASI'),h('h3',null,v.domain)),
  h('div',{className:'nd-badges'},h('span',{className:'nd-badge','data-tone':v.tone},v.payment),h('span',{className:'nd-badge'},v.registration)),
  h('dl',{className:'nd-summary-metrics'},h('div',null,h('dt',null,'Total pesanan'),h('dd',null,v.amount)),h('div',null,h('dt',null,'Tanggal kedaluwarsa'),h('dd',null,v.expiry))),
  h('p',{className:'nd-connection'},'Koneksi situs',h('span',null,v.connection)),
  typeof order.message==='string'?h('p',{className:'nd-summary-message'},order.message):null,
  h('footer',{className:'nd-summary-actions'},h('a',{className:'nd-primary',href:v.href,'aria-label':'Lihat detail pesanan '+v.domain},'Lihat detail pesanan',h('svg',{viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.8,'aria-hidden':'true'},h('path',{d:'M5 12h14M13 6l6 6-6 6',strokeLinecap:'round',strokeLinejoin:'round'}))),typeof onRefresh==='function'?h('button',{type:'button',className:'nd-secondary',onClick:onRefresh},'Perbarui status'):null));
}
