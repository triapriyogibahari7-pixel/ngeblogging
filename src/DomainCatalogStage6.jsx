import React,{useId,useLayoutEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {DOMAIN_CATALOG,DOMAIN_CATALOG_CATEGORIES,domainCatalogPage} from './lib/domain-catalog-stage6.mjs';
import {observeDomainCatalogFrame} from './lib/domain-catalog-frame.mjs';
import './domain-catalog-stage6.css';
export default function DomainCatalogStage6({disabled=false,onSelect}){
 const [open,setOpen]=useState(false),[query,setQuery]=useState(''),[category,setCategory]=useState('Semua'),[page,setPage]=useState(1),[detail,setDetail]=useState(null);
 const dialog=useRef(null),titleId=useId();
 useLayoutEffect(()=>{
  if(!open)return;const node=dialog.current,previous=document.activeElement,overflow=document.body.style.overflow;if(!node)return;
  document.body.style.overflow='hidden';const stop=observeDomainCatalogFrame(node);
  if(!node.open)node.showModal();
  node.querySelector(node.dataset.compact==='true'?'.dc-close':'.dc-search')?.focus({preventScroll:true});
  return ()=>{stop();if(node.open)node.close();document.body.style.overflow=overflow;if(previous?.isConnected&&typeof previous.focus==='function')previous.focus({preventScroll:true});};
 },[open]);
 useLayoutEffect(()=>{if(open)dialog.current?.querySelector('.dc-content')?.scrollTo?.({top:0,behavior:'auto'});},[open,query,category,page,detail]);
 const result=domainCatalogPage({query,category,page});
 const prepare=item=>{if(disabled||!item.canPrepareCheck)return;onSelect?.(item.extension);setOpen(false);};
 const modal=open&&typeof document!=='undefined'&&document.body?createPortal(
  <dialog ref={dialog} className="sv124-domain-catalog" data-domain-catalog-frame="widget26-media" aria-modal="true" aria-labelledby={titleId} onCancel={event=>{event.preventDefault();setOpen(false);}} onClick={event=>{if(event.target===event.currentTarget)setOpen(false);}}>
   <section className="dc-frame">
    <header className="dc-header"><div><p className="dc-eyebrow">PILIH NAMA, BANGUN IDENTITAS</p><h2 id={titleId}>Domain Pilihan</h2></div><button type="button" className="dc-close" aria-label="Tutup katalog domain" title="Tutup katalog domain" onClick={()=>setOpen(false)}><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m6 6 12 12M18 6 6 18"/></svg></button></header>
    <div className="dc-content">
     <p className="dc-editorial">{DOMAIN_CATALOG.length} entri kurasi editorial, bukan peringkat popularitas dunia.</p>
     <label className="dc-label">Cari ekstensi atau kategori<input className="dc-search" type="search" value={query} maxLength={100} placeholder="Misalnya .com, Indonesia, atau bisnis" onChange={event=>{setQuery(event.target.value);setPage(1);setDetail(null);}}/></label>
     <div className="dc-categories" role="group" aria-label="Kategori domain">{DOMAIN_CATALOG_CATEGORIES.map(name=><button type="button" key={name} aria-pressed={category===name} onClick={()=>{setCategory(name);setPage(1);setDetail(null);}}>{name}</button>)}</div>
     <p className="dc-notice">Keberadaan ekstensi di katalog bukan jaminan dapat dibeli. Dukungan registrar, persyaratan, dan harga jual rupiah belum diverifikasi. Pembelian belum aktif.</p>
     {detail?<article className="dc-detail"><button type="button" className="dc-back" onClick={()=>setDetail(null)}>← Kembali ke katalog</button><p className="dc-eyebrow">{detail.category}</p><h3>.{detail.extension}</h3><p>{detail.description}</p><dl><dt>Pendaftaran</dt><dd>Harga IDR belum tersedia</dd><dt>Perpanjangan</dt><dd>Harga IDR belum tersedia</dd><dt>Dukungan registrar</dt><dd>Perlu diverifikasi</dd></dl><p>Harga bukan nol dan belum ada penawaran jual. Pemeriksaan nama domain dilakukan melalui form yang sudah ada, bukan saat membuka katalog.</p>{detail.canPrepareCheck?<button type="button" className="sv124-primary" disabled={disabled} onClick={()=>prepare(detail)}>Siapkan nama dengan .{detail.extension}</button>:<p>Informasi saja: pemeriksaan ekstensi bertingkat ini belum terhubung ke normalizer saat ini.</p>}</article>:<><p className="dc-count" role="status">{result.total} entri · Halaman {result.page} dari {result.pages}</p><div className="dc-grid">{result.items.map(item=><article className="dc-card" key={item.extension} data-featured={item.extension==='com'}><span className="dc-badge">{item.category}</span><h3>.{item.extension}</h3><p>{item.description}</p><p className="dc-price">Harga jual IDR belum tersedia</p><small>Dukungan registrar perlu diverifikasi</small><button type="button" className="sv124-primary" onClick={()=>setDetail(item)}>Lihat detail</button></article>)}</div>{result.total===0?<p>Tidak ada entri katalog yang cocok. Ini bukan pemeriksaan ketersediaan domain.</p>:null}</>}
    </div>
    {!detail?<nav className="dc-pages" aria-label="Halaman katalog"><button type="button" disabled={result.page===1} onClick={()=>setPage(result.page-1)}>← Sebelumnya</button><span>{result.page} / {result.pages}</span><button type="button" disabled={result.page===result.pages} onClick={()=>setPage(result.page+1)}>Berikutnya →</button></nav>:null}
   </section>
  </dialog>,document.body):null;
 return <><button type="button" className="sv124-catalog-launch" disabled={disabled} onClick={()=>setOpen(true)}>Jelajahi Domain Pilihan →</button>{modal}</>;
}
