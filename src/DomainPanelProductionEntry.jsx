import React,{useRef,useState} from 'react';
import DomainPanelV124 from './DomainPanelV124.jsx';
import DomainPanelStage5Entry from './DomainPanelStage5Entry.jsx';
import DomainCustomerSearch from './DomainCustomerSearch.jsx';
import DomainPurchasePage from './DomainPurchasePage.jsx';
import {domainPanelSurface} from './lib/domain-panel-surface.mjs';
import './domain-registrar-check-stage6.css';
class PurchaseBoundary extends React.Component{
 constructor(props){super(props);this.state={failed:false};}
 static getDerivedStateFromError(){return {failed:true};}
 render(){return this.state.failed?<div role="alert"><p>Formulir pembelian belum dapat ditampilkan. Jika sebelumnya sudah memulai pesanan, periksa statusnya dan jangan membayar ulang.</p><button type="button" className="sv124-secondary" onClick={()=>this.setState({failed:false})}>Coba tampilkan formulir kembali</button></div>:this.props.children;}
}
function OwnedDomainCommerce({user,site}){
 const [purchaseOpen,setPurchaseOpen]=useState(false),[selectedDomain,setSelectedDomain]=useState(''),[copyNotice,setCopyNotice]=useState('');
 const purchaseSection=useRef(null);
 function selectDomain(selection){
  if(selection?.siteId!==site.id||typeof selection.domain!=='string')return;
  setSelectedDomain(selection.domain);setCopyNotice('');
 }
 function openPurchase(){
  setPurchaseOpen(true);
  purchaseSection.current?.scrollIntoView?.({behavior:'smooth',block:'start'});
  purchaseSection.current?.focus({preventScroll:true});
 }
 async function copyDomain(){
  try{if(!navigator.clipboard?.writeText)throw Error();await navigator.clipboard.writeText(selectedDomain);setCopyNotice('Nama domain disalin. Tempelkan pada kolom Nama domain lengkap, lalu periksa harga final.');}
  catch{setCopyNotice('Penyalinan otomatis tidak tersedia. Pilih dan salin nama domain yang ditampilkan, lalu tempelkan pada formulir.');}
 }
 return <>
  <DomainCustomerSearch user={user} siteId={site.id} siteName={site.name} onSelect={selectDomain}/>
  <section ref={purchaseSection} tabIndex={-1} className="sv124-card" aria-label="Formulir pembelian domain">
   <h2>Pembelian domain</h2>
   <p>Formulir pembelian meminta quote final tersendiri dari backend. Harga pencarian dan peninjauan bukan tagihan atau persetujuan pembayaran.</p>
   {selectedDomain&&<div><p>Domain terakhir yang dipilih: <code style={{overflowWrap:'anywhere'}}>{selectedDomain}</code></p><p>Salin nama ini ke formulir pembelian. Ketersediaan dan harga harus diperiksa kembali; pilihan ini tidak membuat reservasi atau pesanan.</p><button type="button" className="sv124-secondary" onClick={copyDomain}>Salin nama domain</button>{!purchaseOpen&&<button type="button" className="sv124-secondary" onClick={openPurchase}>Lanjut ke formulir pembelian</button>}</div>}
   <p role="status" aria-live="polite">{copyNotice}</p>
   <button type="button" className="sv124-secondary" aria-expanded={purchaseOpen} aria-controls="domain-purchase-form-region" onClick={()=>setPurchaseOpen(value=>!value)}>{purchaseOpen?'Tutup formulir pembelian':'Buka formulir pembelian'}</button>
   <div id="domain-purchase-form-region">{purchaseOpen&&<PurchaseBoundary><DomainPurchasePage embedded siteId={site.id} siteName={site.name} expectedOwnerId={user.id}/></PurchaseBoundary>}</div>
   <p>Tujuan pesanan mengikuti situs yang ditampilkan pada formulir. Pengikatan order bukan bukti DNS, HTTPS, atau pemasangan domain sudah aktif. Membuka formulir tidak membuat pesanan atau pembayaran.</p>
  </section>
 </>;
}
export default function DomainPanelProductionEntry({user,...props}){
 const surface=domainPanelSurface(typeof window==='undefined'?'':window.location.origin);
 if(surface==='preview')return <DomainPanelStage5Entry {...props} user={user}/>;
 if(surface!=='production')return <DomainPanelV124 {...props}/>;
 const owned=Boolean(user?.id&&props.site?.id&&props.site.owner_id===user.id),scope=JSON.stringify([user?.id,props.site?.id,props.site?.owner_id]);
 return <section className="sv124-page sv124-domain-page" data-domain-stage6-layout="compact" aria-label="Domain dan publikasi"><DomainPanelV124 {...props}/>{owned&&<OwnedDomainCommerce key={scope} user={user} site={props.site}/>}</section>;
}
