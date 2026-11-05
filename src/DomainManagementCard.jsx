import React,{useEffect,useState} from 'react';
import {paymentLabels,registrationLabels} from './domain-order-status-model.mjs';
import './domain-management-compact.css';
const date=x=>x&&Number.isFinite(Date.parse(x))?new Date(x).toLocaleString('id-ID'):'Belum tersedia dari penyedia';
export default function DomainManagementCard({order}){
 const [copied,setCopied]=useState(''),[guide,setGuide]=useState('ngeblogging');
 useEffect(()=>{setCopied('');setGuide('ngeblogging');},[order.orderId]);
 const m=order.registrar,known=m?.status==='observed',expires=known?Date.parse(m.expiresAt):NaN,now=Date.now(),expired=known&&(m.registrarStatus==='expired'||expires<=now),near=known&&!expired&&expires-now<=30*86400000;
 async function copy(value){try{if(!navigator.clipboard?.writeText)throw Error();await navigator.clipboard.writeText(value);setCopied('Nameserver berhasil disalin.');}catch{setCopied('Penyalinan otomatis tidak tersedia. Pilih dan salin teks nameserver di bawah.');}}
 return <section className="dosp-card nd-management-compact" aria-label="Domain Saya" data-domain-management="v1">
  <h3>Domain Saya</h3><h4>{order.domain}</h4>
  <p>{expired?'Registrasi domain kedaluwarsa':order.registrationConfirmed?'Terdaftar; koneksi situs belum diverifikasi':'Domain belum dikonfirmasi terdaftar'}</p>
  <dl className="dosp-details nd-management-core">
   <div><dt>Pembayaran</dt><dd>{paymentLabels[order.paymentState]}</dd></div>
   <div><dt>Pendaftaran</dt><dd>{registrationLabels[order.registrationState]}</dd></div>
   <div><dt>Tanggal kedaluwarsa</dt><dd>{date(known?m.expiresAt:null)}</dd></div>
  </dl>
  <details className="nd-management-fold">
   <summary>Detail tanggal &amp; koneksi</summary>
   <dl className="dosp-details nd-management-facts">
    <div><dt>Tanggal pembayaran</dt><dd>{date(order.paidAt)}</dd></div>
    <div><dt>Tanggal registrasi penyedia</dt><dd>{date(known?m.registeredAt:null)}</dd></div>
    <div><dt>Perpanjangan otomatis</dt><dd>{known?(m.autoRenew?'Aktif di penyedia':'Tidak aktif di penyedia'):'Belum diketahui'}</dd></div>
    <div><dt>DNS / SSL</dt><dd>Belum diverifikasi oleh panel ini</dd></div>
    <div><dt>Situs tujuan</dt><dd>Belum dimuat oleh panel ini</dd></div>
    <div><dt>Terakhir diperiksa di penyedia</dt><dd>{date(known?m.checkedAt:null)}</dd></div>
   </dl>
  </details>
  <details className="nd-management-fold" aria-label="Nameserver domain">
   <summary>Nameserver</summary>
   {known?<ul>{m.nameservers.map(ns=><li key={ns}><code style={{userSelect:'all',overflowWrap:'anywhere'}}>{ns}</code> <button type="button" onClick={()=>void copy(ns)} aria-label={'Salin '+ns}>Salin</button></li>)}</ul>:<p>{order.registrationConfirmed?'Data nameserver atau masa berlaku belum berhasil dibaca. Perbarui status; jangan memakai nameserver contoh.':'Nameserver ditampilkan setelah pembayaran dan pendaftaran domain terkonfirmasi.'}</p>}
   <p role="status" aria-live="polite">{copied}</p>
  </details>
  <details className="nd-management-fold" aria-label="Pemberitahuan domain saat ini">
   <summary>Pemberitahuan status</summary><p role="status">{order.message}</p>
   {expired&&<p role="alert">Registrasi domain sudah kedaluwarsa. Status ini bukan bukti perpanjangan telah dilakukan.</p>}
   {near&&<p role="status">Domain akan kedaluwarsa dalam 30 hari atau kurang. Periksa tanggal kedaluwarsa dan pengaturan perpanjangan.</p>}
   <p>Pemberitahuan ini berasal dari status yang sedang ditampilkan; belum merupakan kotak masuk notifikasi tersimpan atau pengiriman email.</p>
  </details>
  <details className="nd-management-fold" aria-label="Petunjuk tujuan domain">
   <summary>Petunjuk menghubungkan domain</summary>
   <label>Pilih petunjuk <select value={guide} onChange={e=>setGuide(e.target.value)}><option value="ngeblogging">Situs Ngeblogging</option><option value="external">Hosting milik pembeli</option></select></label>
   {guide==='ngeblogging'?<p>Gunakan pengelola Domain dan Publikasi pada situs Ngeblogging milik Anda. Pemasangan tetap harus memeriksa kepemilikan situs, DNS, routing, dan SSL sebelum dinyatakan aktif.</p>:<p>Gunakan record A, AAAA, atau CNAME yang diberikan hosting tujuan. Menghubungkan hosting tidak sama dengan transfer registrar. Jangan mengganti nameserver registrar atau menghapus record email tanpa pemeriksaan.</p>}
   <p>Pilihan di atas hanya menampilkan petunjuk, belum menyimpan atau mengubah tujuan domain.</p>
  </details>
 </section>;
}
