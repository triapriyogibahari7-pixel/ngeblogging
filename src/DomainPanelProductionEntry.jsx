import React from 'react';
import DomainPanelV124 from './DomainPanelV124.jsx';
import DomainPanelStage5Entry from './DomainPanelStage5Entry.jsx';
import DomainCustomerSearch from './DomainCustomerSearch.jsx';
import DomainPurchasePage from './DomainPurchasePage.jsx';
import {domainPanelSurface} from './lib/domain-panel-surface.mjs';
import './domain-registrar-check-stage6.css';
export default function DomainPanelProductionEntry({user,...props}){
 const surface=domainPanelSurface(typeof window==='undefined'?'':window.location.origin);
 if(surface==='preview')return <DomainPanelStage5Entry {...props} user={user}/>;
 if(surface!=='production')return <DomainPanelV124 {...props}/>;
 const owned=Boolean(user?.id&&props.site?.id&&props.site.owner_id===user.id),scope=JSON.stringify([user?.id,props.site?.id,props.site?.owner_id]);
 return <section className="sv124-page sv124-domain-page" data-domain-stage6-layout="compact" aria-label="Domain dan publikasi">
  <DomainPanelV124 {...props}/>
  {owned&&<>
   <DomainCustomerSearch key={'lookup:'+scope} user={user} siteId={props.site.id} siteName={props.site.name}/>
   <p className="dcs-muted">Pembelian berikut mengikuti akun Anda. Setelah pendaftaran dikonfirmasi pada status pesanan, hubungkan domain ke situs yang Anda kelola melalui panel domain. Harga pencarian harus diperiksa ulang pada formulir pembelian sebelum Anda menyetujui pembayaran.</p>
   <DomainPurchasePage key={'purchase:'+scope} embedded/>
  </>}
 </section>;
}
