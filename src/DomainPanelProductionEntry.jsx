import React from 'react';
import DomainPanelV124 from './DomainPanelV124.jsx';
import DomainPanelStage5Entry from './DomainPanelStage5Entry.jsx';
import DomainPurchasePage from './DomainPurchasePage.jsx';
import DomainRegistrarProductionSearch from './DomainRegistrarProductionSearch.jsx';
import {domainPanelSurface} from './lib/domain-panel-surface.mjs';
import './domain-registrar-check-stage6.css';
export default function DomainPanelProductionEntry({user,...props}){
 const surface=domainPanelSurface(typeof window==='undefined'?'':window.location.origin);
 if(surface==='preview')return <DomainPanelStage5Entry {...props} user={user}/>;
 if(surface!=='production')return <DomainPanelV124 {...props}/>;
 const owned=Boolean(user?.id&&props.site?.id&&props.site.owner_id===user.id),scope=JSON.stringify([user?.id,props.site?.id,props.site?.owner_id]);
 return <section className="sv124-page sv124-domain-page" data-domain-stage6-layout="compact" aria-label="Domain dan publikasi"><DomainPanelV124 {...props}/>{owned&&<><DomainRegistrarProductionSearch key={'lookup:'+scope} user={user} siteId={props.site.id}/><p className="sv124-provider-note">Pembelian domain dicatat pada akun Anda. Hasil pembelian tidak otomatis mengganti domain situs aktif; penghubungan domain dan verifikasi DNS tetap melalui pengelolaan situs di halaman ini.</p><DomainPurchasePage key={scope} embedded/></>}</section>;
}
