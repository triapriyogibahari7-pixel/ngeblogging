import React,{useState} from 'react';
import DomainPanelV124 from './DomainPanelV124.jsx';
import DomainPanelStage5Entry from './DomainPanelStage5Entry.jsx';
import DomainCustomerSearch from './DomainCustomerSearch.jsx';
import DomainPurchasePage from './DomainPurchasePage.jsx';
import {domainPanelSurface} from './lib/domain-panel-surface.mjs';
import './domain-registrar-check-stage6.css';
class PurchaseBoundary extends React.Component{
 constructor(props){super(props);this.state={failed:false};}
 static getDerivedStateFromError(){return {failed:true};}
 render(){return this.state.failed?<p role="alert">Formulir pembelian belum dapat ditampilkan. Tutup formulir lalu buka kembali. Jika sebelumnya sudah memulai pesanan, periksa statusnya dan jangan membayar ulang.</p>:this.props.children;}
}
function OwnedDomainCommerce({user,site}){
 const [purchaseOpen,setPurchaseOpen]=useState(false);
 return <>
  <DomainCustomerSearch user={user} siteId={site.id} siteName={site.name}/>
  <section className="sv124-card" aria-label="Formulir pembelian domain">
   <h2>Pembelian domain</h2>
   <p>Formulir ini terpisah dari peninjauan hasil pencarian. Masukkan kembali nama domain pilihan untuk meminta quote final dari backend. Harga pencarian tidak diteruskan sebagai tagihan atau persetujuan pembayaran.</p>
   <button type="button" className="sv124-secondary" aria-expanded={purchaseOpen} onClick={()=>setPurchaseOpen(value=>!value)}>{purchaseOpen?'Tutup formulir pembelian':'Buka formulir pembelian'}</button>
   {purchaseOpen&&<PurchaseBoundary><DomainPurchasePage embedded/></PurchaseBoundary>}
   <p>Pembelian mengikuti akun yang masuk. Setelah pendaftaran dikonfirmasi pada status pesanan, hubungkan domain ke situs melalui panel pengelolaan. Membuka formulir tidak membuat pesanan atau pembayaran.</p>
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
